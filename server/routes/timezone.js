import express from 'express';
import { getDb } from '../lib/db.js';
import { getUserTimezone, getAvailableTimezones, isValidTimezone, getCurrentTimeInTimezone } from '../lib/timezone.js';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Get user's current timezone
router.get('/', async (req, res) => {
    try {
        const userId = req.userId;
        const user = await getDb().collection('users').findOne({ _id: new ObjectId(String(userId)) });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const timezone = getUserTimezone(user);
        const currentTime = getCurrentTimeInTimezone(timezone);
        
        res.json({
            timezone,
            currentTime,
            availableTimezones: getAvailableTimezones()
        });
    } catch (error) {
        console.error('Error getting timezone:', error);
        res.status(500).json({ error: 'Failed to get timezone' });
    }
});

// Update user's timezone
router.put('/', async (req, res) => {
    try {
        const userId = req.userId;
        const { timezone } = req.body;
        
        if (!timezone) {
            return res.status(400).json({ error: 'Timezone is required' });
        }
        
        if (!isValidTimezone(timezone)) {
            return res.status(400).json({ error: 'Invalid timezone' });
        }
        
        const db = getDb();
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(String(userId)) },
            { $set: { timezone } }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const currentTime = getCurrentTimeInTimezone(timezone);
        
        res.json({
            success: true,
            timezone,
            currentTime,
            message: 'Timezone updated successfully'
        });
    } catch (error) {
        console.error('Error updating timezone:', error);
        res.status(500).json({ error: 'Failed to update timezone' });
    }
});

// Get available timezones
router.get('/available', async (req, res) => {
    try {
        res.json({
            timezones: getAvailableTimezones()
        });
    } catch (error) {
        console.error('Error getting available timezones:', error);
        res.status(500).json({ error: 'Failed to get timezones' });
    }
});

export default router;
