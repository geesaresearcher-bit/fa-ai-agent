import axios from 'axios';
import OpenAI from 'openai';
import { getDb } from './db.js';


const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function ingestHubspotForUser(user) {
    console.log("Hubspot");
    const access = user?.hubspot_tokens?.access_token;
    if (!access) return;
    const db = getDb();


    // Contacts
    const contacts = await axios.get('https://api.hubapi.com/crm/v3/objects/contacts?limit=50', {
        headers: { Authorization: `Bearer ${access}` }
    });


    for (const c of contacts.data.results || []) {
        const name = `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim();
        const note = `Contact: ${name} <${c.properties.email || ''}>`;
        const emb = await openai.embeddings.create({ model: 'text-embedding-3-small', input: note });


        await db.collection('hubspot_contacts').updateOne(
            { user_id: user._id, hubspot_id: c.id },
            { $set: { properties: c.properties, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );


        await db.collection('documents').updateOne(
            { user_id: user._id, source: 'hubspot_contact', source_id: c.id },
            { $set: { content: note, metadata: c, embedding: emb.data[0].embedding, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );
    }
}