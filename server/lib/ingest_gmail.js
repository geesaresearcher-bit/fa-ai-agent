import { google } from 'googleapis';
import OpenAI from 'openai';
import { getDb } from './db.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function ingestEmailsForUser(user) {
    console.log("Google");
    if (!user?.google_tokens) return;
    const auth = new google.auth.OAuth2();
    auth.setCredentials(user.google_tokens);
    const gmail = google.gmail({ version: 'v1', auth });


    const list = await gmail.users.messages.list({ userId: 'me', q: '', maxResults: 50 });
    if (!list.data.messages) return;


    const db = getDb();
    for (const m of list.data.messages) {
        const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'full' });
        const snippet = full.data.snippet || '';


        // Embed (use more robust MIME parsing in prod)
        const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: snippet });
        const vector = emb.data[0].embedding;


        await db.collection('documents').updateOne(
            { user_id: user._id, source: 'gmail', source_id: m.id },
            { $set: { content: snippet, metadata: full.data, embedding: vector, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );

        // Also store in emails collection for proactive processing
        const headers = full.data.payload?.headers || [];
        const fromHeader = headers.find(h => h.name === 'From');
        const subjectHeader = headers.find(h => h.name === 'Subject');
        const toHeader = headers.find(h => h.name === 'To');
        
        if (fromHeader && subjectHeader) {
            await db.collection('emails').updateOne(
                { user_id: user._id, message_id: m.id },
                { 
                    $set: { 
                        from: fromHeader.value,
                        subject: subjectHeader.value,
                        to: toHeader?.value || '',
                        content: snippet,
                        full_data: full.data,
                        processed_for_proactive: false,
                        updated_at: new Date() 
                    }, 
                    $setOnInsert: { created_at: new Date() } 
                },
                { upsert: true }
            );
        }
    }
}