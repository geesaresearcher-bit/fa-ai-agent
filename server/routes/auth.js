// server/routes/auth.js
import express from 'express';
import { google } from 'googleapis';
import axios from 'axios';
import { getDb } from '../lib/db.js';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const router = express.Router();

/* ===== Google OAuth ===== */
const googleClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_CALLBACK
);

router.get('/google', (req, res) => {
    // Clear any existing authentication when starting new Google OAuth
    res.clearCookie('sid', {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
    res.clearCookie('auth_token', {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
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
    
    res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).send('No authorization code received');
        }
        
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

        // Create JWT token with userId
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );
        
        // Set JWT token in httpOnly cookie
        res.cookie('auth_token', token, {
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
            }
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
router.get('/hubspot', async (req, res) => {
    let userId = null;
    
    // Method 1: Check for user ID in URL parameter first (most reliable)
    if (req.query.userId) {
        userId = req.query.userId;
    }
    // Method 2: Try to get userId from JWT token
    else {
        try {
            const token = req.cookies.auth_token;
            if (token) {
                const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
                const decoded = jwt.verify(token, jwtSecret);
                userId = decoded.userId;
            }
        } catch (err) {
            // JWT token verification failed
        }
    }
    
    if (!userId) {
        return res.redirect(`${process.env.BACKEND_URL}/auth/google`);
    }
    
    proceedWithHubSpotOAuth(req, res, userId);
});

function proceedWithHubSpotOAuth(req, res, userId) {
    // Ensure session cookie is set for this request
    res.cookie('sid', req.sessionID, {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/'
    });
    
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

    // Include user ID in state parameter for callback
    const state = userId;

    const url = `https://app.hubspot.com/oauth/authorize?client_id=${process.env.HUBSPOT_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(process.env.HUBSPOT_OAUTH_CALLBACK)}` +
        `&scope=${encodeURIComponent(scope)}` +
        `&response_type=code` +
        `&state=${state}`;
    
    res.redirect(url);
}

router.get('/hubspot/callback', async (req, res) => {
    try {
        // Get user ID from state parameter or session
        let userId = req.session?.userId;
        if (!userId && req.query.state) {
            userId = req.query.state;
            req.session.userId = userId;
        }
        
        if (!userId) return res.status(401).send('Session missing. Login with Google first.');
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
            { _id: new ObjectId(String(userId)) },
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
    if (req.session) {
        req.session.destroy(() => { });
    }
    
    res.clearCookie('sid', {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
    res.clearCookie('auth_token', {
        httpOnly: true,
        sameSite: 'none',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    });
    
    res.json({ ok: true });
});

router.get('/me', async (req, res) => {
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        // Find user in database
        const db = getDb();
        if (!db) {
            return res.status(500).json({ error: 'Database not available' });
        }
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            email: user.email,
            hasGoogle: !!user.google_tokens,
            hasHubSpot: !!user.hubspot_tokens?.access_token
        });
    } catch (err) {
        console.error('[/me] JWT verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
});

/* ===== Disconnect endpoints ===== */
router.post('/disconnect/google', async (req, res) => {
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        // Remove Google tokens from database
        const db = getDb();
        await db.collection('users').updateOne(
            { _id: new ObjectId(String(userId)) },
            { 
                $unset: { google_tokens: 1 },
                $set: { updated_at: new Date() }
            }
        );
        
        res.json({ success: true, message: 'Google disconnected successfully' });
    } catch (err) {
        console.error('[/disconnect/google] error:', err);
        return res.status(500).json({ error: 'Failed to disconnect Google' });
    }
});

router.post('/disconnect/hubspot', async (req, res) => {
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        // Remove Hubspot tokens from database
        const db = getDb();
        await db.collection('users').updateOne(
            { _id: new ObjectId(String(userId)) },
            { 
                $unset: { hubspot_tokens: 1 },
                $set: { updated_at: new Date() }
            }
        );
        
        res.json({ success: true, message: 'Hubspot disconnected successfully' });
    } catch (err) {
        console.error('[/disconnect/hubspot] error:', err);
        return res.status(500).json({ error: 'Failed to disconnect Hubspot' });
    }
});

/* ===== Integrations status endpoint ===== */
router.get('/integrations', async (req, res) => {
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        // Find user in database
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({
            google: {
                connected: !!user.google_tokens?.access_token,
                email: user.email
            },
            hubspot: {
                connected: !!user.hubspot_tokens?.access_token,
                email: user.email
            }
        });
    } catch (err) {
        console.error('[/integrations] error:', err);
        return res.status(500).json({ error: 'Failed to get integrations status' });
    }
});

export default router;
