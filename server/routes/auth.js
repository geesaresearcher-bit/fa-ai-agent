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
    console.log('Google OAuth configuration:', {
        clientId: process.env.GOOGLE_CLIENT_ID,
        callback: process.env.GOOGLE_OAUTH_CALLBACK,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
    
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
    
    console.log('Generated OAuth URL:', url);
    res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
    try {
        console.log('Google OAuth callback received:', {
            code: req.query.code ? 'present' : 'missing',
            error: req.query.error,
            state: req.query.state,
            query: req.query
        });
        
        const { code } = req.query;
        if (!code) {
            console.error('No authorization code received');
            return res.status(400).send('No authorization code received');
        }
        
        console.log('Exchanging code for tokens...');
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
        
        // Set cookie manually to ensure proper configuration
        res.cookie('sid', req.sessionID, {
            httpOnly: true,
            sameSite: 'none',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
        });
        
        // Ensure session is saved
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
            } else {
                console.log('Session saved successfully');
            }
        });

        // If HubSpot not connected, go connect it next
        if (!user.hubspot_tokens?.access_token) {
            console.log('HubSpot not connected, redirecting to connect it', `${process.env.BACKEND_URL}/auth/hubspot`);
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
        `&scope=${encodeURIComponent(scope)}` +
        `&response_type=code`;
    
    console.log('HubSpot OAuth URL:', url);
    res.redirect(url);
});

router.get('/hubspot/callback', async (req, res) => {
    try {
        console.log('HubSpot OAuth callback received:', {
            sessionId: req.sessionID,
            userId: req.session?.userId,
            code: req.query.code ? 'present' : 'missing',
            error: req.query.error,
            query: req.query
        });
        
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
        session: req.session,
        cookies: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer
    });
    
    // Check if session exists in store
    if (req.session) {
        console.log('[/me] Session exists, checking store...');
        // Try to reload session from store
        req.session.reload((err) => {
            if (err) {
                console.log('[/me] Session reload error:', err);
                // If session reload fails, try to find user by session ID in database
                console.log('[/me] Attempting to find session in database...');
                const db = getDb();
                if (db) {
                    db.collection('sessions').findOne({ _id: req.sessionID })
                        .then(sessionDoc => {
                            if (sessionDoc && sessionDoc.session && sessionDoc.session.userId) {
                                console.log('[/me] Found session in database:', sessionDoc.session.userId);
                                req.session.userId = sessionDoc.session.userId;
                            } else {
                                console.log('[/me] No session found in database');
                            }
                        })
                        .catch(dbErr => {
                            console.error('[/me] Database lookup error:', dbErr);
                        });
                }
            } else {
                console.log('[/me] Session reloaded:', {
                    sessionId: req.sessionID,
                    userId: req.session?.userId
                });
            }
        });
    }
    
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
