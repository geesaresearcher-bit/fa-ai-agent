import { ObjectId } from 'mongodb';
import OpenAI from 'openai';
import { getDb } from './db.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Ensure a conversation exists, return its doc */
export async function ensureConversation(userId, threadId) {
  const db = getDb();
  if (threadId) {
    const convo = await db.collection('conversations').findOne({ _id: new ObjectId(threadId), user_id: userId });
    if (convo) return convo;
  }
  const { insertedId } = await db.collection('conversations').insertOne({
    user_id: userId,
    title: 'Untitled chat',
    rolling_summary: '',      // long-term compressed memory
    created_at: new Date(),
    updated_at: new Date()
  });
  return await db.collection('conversations').findOne({ _id: insertedId });
}

/** Store a message */
export async function saveMessage(conversationId, role, content, extras = {}) {
  const db = getDb();
  await db.collection('messages').insertOne({
    conversation_id: new ObjectId(conversationId),
    role,
    content,
    created_at: new Date(),
    ...extras
  });
  await db.collection('conversations').updateOne(
    { _id: new ObjectId(conversationId) },
    { $set: { updated_at: new Date() } }
  );
}

/** Load last N chat turns (excluding tool/tool_results) */
export async function loadRecentMessages(conversationId, limit = 16) {
  const db = getDb();
  const rows = await db.collection('messages')
    .find({ conversation_id: new ObjectId(conversationId), role: { $in: ['user','assistant'] } })
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return rows.reverse(); // oldest -> newest
}

/** Concise title from first user message */
export async function maybeSetTitle(conversation) {
  const db = getDb();
  if (conversation.title && conversation.title !== 'Untitled chat') return;

  const firstUser = await db.collection('messages')
    .find({ conversation_id: conversation._id, role: 'user' })
    .sort({ created_at: 1 }).limit(1).toArray();

  if (!firstUser.length) return;
  const prompt = `Make a 5-8 word title for this chat:\n\n${firstUser[0].content}`;
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });
    const title = (resp.choices?.[0]?.message?.content || '').trim().slice(0, 80);
    if (title) {
      await db.collection('conversations').updateOne(
        { _id: conversation._id },
        { $set: { title } }
      );
    }
  } catch {}
}

/** Update rolling summary when total tokens grow */
export async function updateRollingSummaryIfNeeded(conversationId, model = 'gpt-4o-mini') {
  const db = getDb();
  const convo = await db.collection('conversations').findOne({ _id: new ObjectId(conversationId) });
  const msgs = await db.collection('messages')
    .find({ conversation_id: new ObjectId(conversationId), role: { $in: ['user','assistant'] } })
    .sort({ created_at: 1 }).toArray();

  // Simple size heuristic: if > 40 turns, summarize older half.
  if (msgs.length < 40) return;

  const keep = msgs.slice(-20); // keep most recent 20 turns verbatim
  const toSummarize = msgs.slice(0, -20);

  const text = toSummarize.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const prompt = `Summarize the following chat turns into a concise, factual memory that preserves
key decisions, preferences, entities (people, companies, symbols), and open tasks. 
Keep under 250 words.\n\n${text}`;

  try {
    const resp = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2
    });
    const summary = resp.choices?.[0]?.message?.content || '';

    await db.collection('conversations').updateOne(
      { _id: convo._id },
      { $set: { rolling_summary: mergeSummaries(convo.rolling_summary || '', summary) } }
    );

    // Optionally delete very old turns (we keep storage; you can prune if needed)
    // await db.collection('messages').deleteMany({ _id: { $in: toSummarize.map(m => m._id) } });
  } catch (e) {
    console.error('[rolling_summary] failed', e?.message || e);
  }
}

function mergeSummaries(oldSum, newSum) {
  if (!oldSum) return newSum;
  // naive concat with separator; you can re-summarize both if you prefer
  return `${oldSum}\n---\n${newSum}`.slice(0, 6000);
}
