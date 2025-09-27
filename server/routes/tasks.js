import express from 'express';
import { getDb } from '../lib/db.js';


const router = express.Router();


router.get('/', async (req, res) => {
    const db = getDb();
    const tasks = await db.collection('tasks').find({}).sort({ updated_at: -1 }).limit(50).toArray();
    res.json({ tasks });
});


router.post('/', async (req, res) => {
    const db = getDb();
    const { userId, payload } = req.body;
    const task = { user_id: userId, status: 'created', payload, created_at: new Date(), updated_at: new Date() };
    await db.collection('tasks').insertOne(task);
    res.json({ ok: true, task });
});


export default router;