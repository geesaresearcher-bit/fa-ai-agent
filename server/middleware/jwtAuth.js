// server/middleware/jwtAuth.js
import jwt from 'jsonwebtoken';
import { getDb } from '../lib/db.js';
import { ObjectId } from 'mongodb';

export function jwtAuth(req, res, next) {
    try {
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            console.log('[jwtAuth] No auth token found');
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        console.log('[jwtAuth] JWT token verified, userId:', userId);
        
        // Add userId to request object for use in route handlers
        req.userId = userId;
        req.userEmail = decoded.email;
        
        next();
    } catch (err) {
        console.error('[jwtAuth] JWT verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export async function jwtAuthWithUser(req, res, next) {
    try {
        console.log('[jwtAuthWithUser] Request received:', {
            path: req.path,
            cookies: req.cookies,
            authToken: req.cookies.auth_token,
            cookieHeader: req.headers.cookie
        });
        
        // Get JWT token from cookie
        const token = req.cookies.auth_token;
        if (!token) {
            console.log('[jwtAuthWithUser] No auth token found');
            return res.status(401).json({ error: 'Not logged in' });
        }
        
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
        console.log('[jwtAuthWithUser] JWT secret:', jwtSecret ? 'present' : 'missing');
        const decoded = jwt.verify(token, jwtSecret);
        const userId = decoded.userId;
        
        console.log('[jwtAuthWithUser] JWT token verified, userId:', userId, 'type:', typeof userId);
        
        // Find user in database
        const db = getDb();
        if (!db) {
            console.log('[jwtAuthWithUser] Database not available');
            return res.status(500).json({ error: 'Database not available' });
        }
        
        console.log('[jwtAuthWithUser] Looking for user with ObjectId:', new ObjectId(String(userId)));
        const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
        console.log('[jwtAuthWithUser] User found:', user ? 'yes' : 'no');
        
        if (!user) {
            console.log('[jwtAuthWithUser] User not found in database for userId:', userId);
            // Let's check what users exist
            const allUsers = await db.collection('users').find({}).limit(3).toArray();
            console.log('[jwtAuthWithUser] All users in database:', allUsers.map(u => ({
                _id: u._id.toString(),
                email: u.email
            })));
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Add user info to request object
        req.userId = userId;
        req.userEmail = decoded.email;
        req.user = user;
        
        next();
    } catch (err) {
        console.error('[jwtAuthWithUser] JWT verification error:', err);
        return res.status(401).json({ error: 'Invalid token' });
    }
}
