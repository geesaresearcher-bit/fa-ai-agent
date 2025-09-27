import OpenAI from 'openai';
import { getDb } from './db.js';
import { ObjectId } from 'mongodb';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function embedText(text) {
    try {
        const resp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text || ''
        });
        return resp.data[0].embedding;
    } catch (error) {
        if (error.status === 429) {
            console.error('OpenAI API quota exceeded. Please check your billing details.');
            // Return a zero vector as fallback
            return new Array(1536).fill(0);
        }
        throw error;
    }
}


export async function queryRAG(userId, query, k = 5) {
    const db = getDb();
    const qvec = await embedText(query);


    // Try Atlas Vector Search
    try {
        const results = await db.collection('documents').aggregate([
            {
              $vectorSearch: {
                index: 'default',
                path: 'embedding',
                queryVector: qvec,       // your 1536-float array
                numCandidates: 100,      // ANN candidate pool
                limit: 5
              }
            },
            { $match: { user_id: new ObjectId(String(userId)) } },
            { $project: { content: 1, metadata: 1, score: { $meta: 'vectorSearchScore' } } }
          ]).toArray();

          return results;
    } catch (e) {
        // Fallback naive cosine (dev only)
        const docs = await db.collection('documents').find({ user_id: new ObjectId(String(userId)) }).limit(1000).toArray();
        const scored = docs.map(d => ({ d, s: cosine(qvec, d.embedding || []) }));
        scored.sort((a, b) => b.s - a.s);
        return scored.slice(0, k).map(x => x.d);
    }
}


function cosine(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}