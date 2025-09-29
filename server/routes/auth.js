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
    console.log('Google OAuth configuration:', {
        clientId: process.env.GOOGLE_CLIENT_ID,
        callback: process.env.GOOGLE_OAUTH_CALLBACK,
        hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });
    
    // Clear any existing authentication when starting new Google OAuth
    console.log('Clearing existing authentication for new Google OAuth');
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

        // Create JWT token with userId
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const token = jwt.sign(
            { userId: user._id.toString(), email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );
        
        console.log('JWT token created for user:', user._id.toString());
        
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
            } else {
                console.log('Session saved successfully');
            }
        });

        // Manually create session document in database
        try {
            const db = getDb();
            const sessionDoc = {
                _id: req.sessionID,
                expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                lastModified: new Date(),
                session: {
                    cookie: {
                        path: '/',
                        _expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                        originalMaxAge: 604800000,
                        httpOnly: true,
                        sameSite: 'none',
                        secure: process.env.NODE_ENV === 'production',
                        domain: undefined
                    },
                    userId: user._id.toString()
                }
            };
            
            await db.collection('sessions').replaceOne(
                { _id: req.sessionID },
                sessionDoc,
                { upsert: true }
            );
            console.log('Session document created in database');
        } catch (dbErr) {
            console.error('Failed to create session document:', dbErr);
        }

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
router.get('/hubspot', async (req, res) => {
    console.log('HubSpot OAuth check:', {
        sessionId: req.sessionID,
        userId: req.session?.userId,
        urlUserId: req.query.userId,
        cookies: req.headers.cookie
    });
    
    let userId = null;
    
    // Method 1: Check for user ID in URL parameter first (most reliable)
    if (req.query.userId) {
        userId = req.query.userId;
        console.log('Using userId from URL parameter:', userId);
    }
    // Method 2: Try to get userId from JWT token
    else {
        try {
            const token = req.cookies.auth_token;
            if (token) {
                const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
                const decoded = jwt.verify(token, jwtSecret);
                userId = decoded.userId;
                console.log('Using userId from JWT token:', userId);
            }
        } catch (err) {
            console.log('JWT token verification failed:', err.message);
        }
    }
    
    if (!userId) {
        console.log('No userId found, redirecting to Google OAuth');
        return res.redirect(`${process.env.BACKEND_URL}/auth/google`);
    }
    
    proceedWithHubSpotOAuth(req, res, userId);
});

function proceedWithHubSpotOAuth(req, res, userId) {
    console.log('Proceeding with HubSpot OAuth for user:', userId);
    
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
    
    console.log('HubSpot OAuth URL:', url);
    res.redirect(url);
}

router.get('/hubspot/callback', async (req, res) => {
    try {
        console.log('HubSpot OAuth callback received:', {
            sessionId: req.sessionID,
            userId: req.session?.userId,
            state: req.query.state,
            code: req.query.code ? 'present' : 'missing',
            error: req.query.error,
            query: req.query
        });
        
        // Get user ID from state parameter or session
        let userId = req.session?.userId;
        if (!userId && req.query.state) {
            userId = req.query.state;
            req.session.userId = userId;
            console.log('Using userId from state parameter:', userId);
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
    console.log('[/logout] Logout request received');
    
    if (req.session) {
        console.log('[/logout] Destroying session');
        req.session.destroy(() => { });
    }
    
    console.log('[/logout] Clearing cookies');
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
    
    console.log('[/logout] Logout successful');
    res.json({ ok: true });
});

router.get('/me', async (req, res) => {
    console.log('[/me] Request received:', {
        cookies: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer
    });
    
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            console.log('[/me] No auth token found');
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        console.log('[/me] JWT token verified, userId:', userId);
        
        // Find user in database
        const db = getDb();
        if (!db) {
            console.log('[/me] Database not available');
            return res.status(500).json({ error: 'Database not available' });
        }
        
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
        if (!user) {
            console.log('[/me] User not found in database for userId:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('[/me] User found:', { 
            email: user.email, 
            hasGoogle: !!user.google_tokens, 
            hasHubSpot: !!user.hubspot_tokens?.access_token 
        });
        
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

export default router;
