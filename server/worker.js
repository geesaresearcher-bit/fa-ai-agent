import { getDb, connectDb } from './lib/db.js';
import { ingestEmailsForUser } from './lib/ingest_gmail.js';
import { ingestHubspotForUser } from './lib/ingest_hubspot.js';


async function loop() {
    try {
        const db = getDb();
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`Processing ${users.length} users...`);
        
        for (const u of users) {
            try { 
                await ingestEmailsForUser(u); 
                console.log(`[ingestEmails] Success for user ${u.email}`);
            } catch (e) { 
                console.error('[ingestEmails]', e.message); 
            }
            
            try { 
                await ingestHubspotForUser(u); 
                console.log(`[ingestHubspot] Success for user ${u.email}`);
            } catch (e) { 
                console.error('[ingestHubspot]', e.message); 
            }
        }

        // process tasks that are waiting_for_reply (left as an exercise to tailor to your flows)
    } catch (error) {
        console.error('Worker loop error:', error);
    }
}

// Start the worker
async function startWorker() {
    console.log('Starting worker...');
    await connectDb(); // Connect to database first
    console.log('Database connected, starting worker loop...');
    loop(); // Run immediately
    setInterval(loop, 1000 * 60 * 2); // every 2 minutes
}

startWorker().catch(console.error);