import express from 'express';
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/db.js';
import { sessionAuth } from '../middleware/sessionAuth.js';

const router = express.Router();

// List conversations (most recent first)
router.get('/', sessionAuth, async (req, res) => {
  const db = getDb();
  const rows = await db.collection('conversations')
    .find({ user_id: req.userId })
    .project({ title: 1, updated_at: 1 })
    .sort({ updated_at: -1 })
    .limit(100)
    .toArray();
  res.json({ conversations: rows.map(r => ({ _id: String(r._id), title: r.title, updated_at: r.updated_at })) });
});

// Create conversation (optional title)
router.post('/', sessionAuth, async (req, res) => {
  const { title } = req.body || {};
  const db = getDb();
  const now = new Date();
  const doc = {
    user_id: req.userId,
    title: title || 'Untitled chat',
    rolling_summary: '',
    created_at: now,
    updated_at: now
  };
  const { insertedId } = await db.collection('conversations').insertOne(doc);
  res.json({ _id: String(insertedId), title: doc.title, updated_at: doc.updated_at });
});

// Get messages for a conversation
router.get('/:id/messages', sessionAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const convo = await db.collection('conversations').findOne({ _id: new ObjectId(id), user_id: req.userId });
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  const msgs = await db.collection('messages')
    .find({ conversation_id: new ObjectId(id), role: { $in: ['user','assistant'] } })
    .sort({ created_at: 1 })
    .toArray();

  res.json({
    conversation: { _id: String(convo._id), title: convo.title, updated_at: convo.updated_at },
    messages: msgs.map(m => ({ _id: String(m._id), role: m.role, content: m.content, created_at: m.created_at }))
  });
});

// Rename conversation
router.patch('/:id', sessionAuth, async (req, res) => {
  const { id } = req.params;
  const { title } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title required' });

  const db = getDb();
  const result = await db.collection('conversations').findOneAndUpdate(
    { _id: new ObjectId(id), user_id: req.userId },
    { $set: { title: title.trim(), updated_at: new Date() } },
    { returnDocument: 'after' }
  );
  if (!result.value) return res.status(404).json({ error: 'Conversation not found' });
  res.json({ _id: String(result.value._id), title: result.value.title, updated_at: result.value.updated_at });
});

// Delete conversation (and its messages)
router.delete('/:id', sessionAuth, async (req, res) => {
  const { id } = req.params;
  const db = getDb();
  const convo = await db.collection('conversations').findOne({ _id: new ObjectId(id), user_id: req.userId });
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });

  await db.collection('messages').deleteMany({ conversation_id: new ObjectId(id) });
  await db.collection('conversations').deleteOne({ _id: new ObjectId(id) });
  res.json({ ok: true });
});

export default router;
