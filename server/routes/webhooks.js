import express from 'express';
import { getDb } from '../lib/db.js';
import { 
    checkEmailFromUnknownTool, 
    checkCalendarEventCreatedTool, 
    checkHubspotContactCreatedTool 
} from '../lib/tools.js';

const router = express.Router();

// HubSpot webhook handler
router.post('/hubspot', async (req, res) => {
    try {
        const { eventType, objectId, properties } = req.body;
        console.log(`[webhook] HubSpot event: ${eventType} for object ${objectId}`);
        
        // Find user by HubSpot integration
        const db = getDb();
        const user = await db.collection('users').findOne({ 
            'hubspot_tokens.access_token': { $exists: true } 
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Handle different HubSpot events
        if (eventType === 'contact.creation') {
            const result = await checkHubspotContactCreatedTool(user._id, {
                contactId: objectId,
                email: properties?.email,
                firstName: properties?.firstname,
                lastName: properties?.lastname
            });
            
            console.log(`[webhook] HubSpot contact created: ${result.ok ? 'processed' : 'failed'}`);
        }
        
        res.json({ ok: true, processed: true });
    } catch (error) {
        console.error('[webhook] HubSpot error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Gmail webhook handler
router.post('/gmail', async (req, res) => {
    try {
        const { messageId, from, subject, content } = req.body;
        console.log(`[webhook] Gmail event: new message from ${from}`);
        
        // Find user by Gmail integration
        const db = getDb();
        const user = await db.collection('users').findOne({ 
            'google_tokens.access_token': { $exists: true } 
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is from unknown sender
        const result = await checkEmailFromUnknownTool(user._id, {
            emailContent: content,
            senderEmail: from,
            subject: subject
        });
        
        console.log(`[webhook] Gmail processed: ${result.ok ? 'unknown sender detected' : 'known sender'}`);
        
        res.json({ ok: true, processed: true });
    } catch (error) {
        console.error('[webhook] Gmail error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Google Calendar webhook handler
router.post('/calendar', async (req, res) => {
    try {
        const { eventId, title, attendees, startTime, endTime } = req.body;
        console.log(`[webhook] Calendar event: ${title}`);
        
        // Find user by Google integration
        const db = getDb();
        const user = await db.collection('users').findOne({ 
            'google_tokens.access_token': { $exists: true } 
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check calendar event creation
        const result = await checkCalendarEventCreatedTool(user._id, {
            eventId: eventId,
            title: title,
            attendees: attendees || [],
            startTime: startTime,
            endTime: endTime
        });
        
        console.log(`[webhook] Calendar processed: ${result.ok ? 'event processed' : 'failed'}`);
        
        res.json({ ok: true, processed: true });
    } catch (error) {
        console.error('[webhook] Calendar error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;