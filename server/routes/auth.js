// server/routes/auth.js
import express from 'express';
import { google } from 'googleapis';
import axios from 'axios';
import { getDb } from '../lib/db.js';
import { ObjectId } from 'mongodb';

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
        req.session.userId = user._id.toString();
        console.log('Session set:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            user_id_type: typeof user._id,
            session_userId_type: typeof req.session.userId
        });
        console.log('[/google/callback] Session set:', {
            sessionId: req.sessionID,
            userId: user._id,
            email: user.email
        });
        console.log(process.env.NODE_ENV);
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
            
            // Pass user ID directly in URL to avoid session issues
            return res.redirect(`${process.env.BACKEND_URL}/auth/hubspot?userId=${user._id.toString()}`);
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
    console.log('HubSpot OAuth check:', {
        sessionId: req.sessionID,
        userId: req.session?.userId,
        urlUserId: req.query.userId,
        cookies: req.headers.cookie
    });
    
    let userId = null;
    
    // Check for user ID in URL parameter first (most reliable)
    if (req.query.userId) {
        userId = req.query.userId;
        console.log('Using userId from URL parameter:', userId);
        // Set in session for consistency
        req.session.userId = userId;
    }
    // Fallback to session if no URL parameter
    else if (req.session?.userId) {
        userId = req.session.userId;
        console.log('Using userId from session:', userId);
    }
    
    if (!userId) {
        console.log('No userId found, redirecting to Google OAuth');
        return res.redirect(`${process.env.BACKEND_URL}/auth/google`);
    }
    
    proceedWithHubSpotOAuth(req, res);
});

function proceedWithHubSpotOAuth(req, res) {
    console.log('Proceeding with HubSpot OAuth for user:', req.session?.userId);
    
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
    const state = req.session.userId;
    
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
    
    let userId = null;
    
    // Method 1: Try to get userId from session document in database
    try {
        const db = getDb();
        if (db) {
            const sessionDoc = await db.collection('sessions').findOne({ _id: req.sessionID });
            if (sessionDoc && sessionDoc.session && sessionDoc.session.userId) {
                userId = sessionDoc.session.userId;
                console.log('[/me] Found userId in session document:', userId);
            } else {
                console.log('[/me] No session document found in database');
            }
        }
    } catch (dbErr) {
        console.error('[/me] Database lookup error:', dbErr);
    }
    
    // Method 2: If no userId found, try to get from URL parameters (if passed)
    if (!userId && req.query.userId) {
        userId = req.query.userId;
        console.log('[/me] Using userId from URL parameter:', userId);
    }
    
    // Method 3: If still no userId, try to get from headers (if passed)
    if (!userId && req.headers['x-user-id']) {
        userId = req.headers['x-user-id'];
        console.log('[/me] Using userId from header:', userId);
    }
    
    // Method 4: If still no userId, try to get from cookie (if stored)
    if (!userId && req.cookies.userId) {
        userId = req.cookies.userId;
        console.log('[/me] Using userId from cookie:', userId);
    }
    
    // If still no userId, return unauthorized
    if (!userId) {
        console.log('[/me] No userId found from any source');
        return res.status(401).json({ error: 'Not logged in' });
    }
    
    // Find user in database
    try {
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
        console.error('[/me] Error finding user:', err);
        return res.status(500).json({ error: 'Database error' });
    }
});

export default router;
