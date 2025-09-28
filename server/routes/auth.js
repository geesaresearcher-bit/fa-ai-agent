// server/routes/auth.js
import express from 'express';
import { google } from 'googleapis';
import axios from 'axios';
import { getDb } from '../lib/db.js';

const router = express.Router();

/* ===== Google OAuth ===== */
const googleClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_CALLBACK
);

router.get('/google', (req, res) => {
    const url = googleClient.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/calendar'
        ],
        prompt: 'consent'
    });
    res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        const oauth2 = google.oauth2({ auth: googleClient, version: 'v2' });
        const info = await oauth2.userinfo.get();
        const email = info.data.email;

        const db = getDb();
        const user = await db.collection('users').findOneAndUpdate(
            { email },
            {
                $set: {
                    email,
                    google_tokens: { ...tokens }, // keep expiry_date if present
                    updated_at: new Date()
                },
                $setOnInsert: { created_at: new Date() }
            },
            { upsert: true, returnDocument: 'after' }
        );

        // start session
        req.session.userId = user._id;
        console.log('[/google/callback] Session set:', {
            sessionId: req.sessionID,
            userId: user._id,
            email: user.email
        });

        // If HubSpot not connected, go connect it next
        if (!user.hubspot_tokens?.access_token) {
            return res.redirect(`${process.env.BACKEND_URL}/auth/hubspot`);
        }

        // Both connected: go to chat
        return res.redirect(`${process.env.FRONTEND_URL}/chat`);
    } catch (err) {
        console.error('[google/callback] error', err?.response?.data || err);
        return res.status(500).send('Google auth failed');
    }
});

/* ===== HubSpot OAuth ===== */
router.get('/hubspot', (req, res) => {
    if (!req.session?.userId) {
        // must be logged in via Google first to have a session
        return res.redirect(`${process.env.BACKEND_URL}/auth/google`);
    }
    const scope = [
        'crm.objects.contacts.read',
        'crm.objects.contacts.write',
        'crm.schemas.contacts.read',
        'crm.objects.users.read',
        'crm.objects.companies.read',
        'crm.objects.deals.read',
        'crm.objects.owners.read',
        'sales-email-read'
    ].join(' ');

    const url = `https://app.hubspot.com/oauth/authorize?client_id=${process.env.HUBSPOT_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.HUBSPOT_OAUTH_CALLBACK)}` +
        `&scope=${encodeURIComponent(scope)}`;
    res.redirect(url);
});

router.get('/hubspot/callback', async (req, res) => {
    try {
        if (!req.session?.userId) return res.status(401).send('Session missing. Login with Google first.');
        const code = req.query.code;
        if (!code) return res.status(400).send('Missing code');

        const tokenRes = await axios.post(
            'https://api.hubapi.com/oauth/v1/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: process.env.HUBSPOT_CLIENT_ID,
                client_secret: process.env.HUBSPOT_CLIENT_SECRET,
                redirect_uri: process.env.HUBSPOT_OAUTH_CALLBACK,
                code
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const payload = tokenRes?.data;
        if (!payload?.access_token) {
            console.error('[hubspot/callback] bad token response', tokenRes?.data);
            return res.status(500).send('HubSpot auth failed');
        }

        const db = getDb();
        await db.collection('users').updateOne(
            { _id: req.session.userId },
            {
                $set: {
                    hubspot_tokens: {
                        access_token: payload.access_token,
                        token_type: payload.token_type,
                        expires_in: payload.expires_in,
                        updated_at: new Date()
                    },
                    updated_at: new Date()
                }
            }
        );

        return res.redirect(`${process.env.FRONTEND_URL}/chat`);
    } catch (err) {
        console.error('[hubspot/callback] error', err?.response?.data || err);
        return res.status(500).send('HubSpot auth failed');
    }
});

/* ===== session helpers ===== */
router.post('/logout', (req, res) => {
    if (req.session) req.session.destroy(() => { });
    res.clearCookie('sid');
    res.json({ ok: true });
});

router.get('/me', async (req, res) => {
    console.log('[/me] Session check:', {
        sessionId: req.sessionID,
        userId: req.session?.userId,
        session: req.session
    });
    
    // "soft" me endpoint (doesn't force both tokens, just reports)
    if (!req.session?.userId) {
        console.log('[/me] No session userId found');
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: req.session.userId });
    if (!user) {
        console.log('[/me] User not found in database');
        return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('[/me] User found:', { email: user.email, hasGoogle: !!user.google_tokens, hasHubSpot: !!user.hubspot_tokens?.access_token });
    res.json({
        email: user.email,
        hasGoogle: !!user.google_tokens,
        hasHubSpot: !!user.hubspot_tokens?.access_token
    });
});

export default router;
