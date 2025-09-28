import { getDb, connectDb } from './lib/db.js';
import { ingestEmailsForUser } from './lib/ingest_gmail.js';
import { ingestHubspotForUser } from './lib/ingest_hubspot.js';
import { 
    checkEmailFromUnknownTool, 
    checkCalendarEventCreatedTool, 
    checkHubspotContactCreatedTool,
    proactiveAgentTool 
} from './lib/tools.js';

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

            // Proactive agent processing
            try {
                await processProactiveEvents(u);
                console.log(`[proactiveAgent] Success for user ${u.email}`);
            } catch (e) {
                console.error('[proactiveAgent]', e.message);
            }
        }

        // process tasks that are waiting_for_reply (left as an exercise to tailor to your flows)
    } catch (error) {
        console.error('Worker loop error:', error);
    }
}

async function processProactiveEvents(user) {
    const db = getDb();
    
    // Check for new emails from unknown senders
    try {
        const recentEmails = await db.collection('emails')
            .find({ 
                user_id: user._id, 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
            .sort({ created_at: -1 })
            .limit(10)
            .toArray();

        for (const email of recentEmails) {
            const result = await checkEmailFromUnknownTool(user._id, {
                emailContent: email.content,
                senderEmail: email.from,
                subject: email.subject
            });

            if (result.ok && result.isUnknownSender) {
                console.log(`[proactive] Unknown sender detected: ${email.from}`);
                // Mark as processed
                await db.collection('emails').updateOne(
                    { _id: email._id },
                    { $set: { processed_for_proactive: true } }
                );
            }
        }
    } catch (e) {
        console.error('[proactive] Email processing error:', e.message);
    }

    // Check for new calendar events
    try {
        const recentEvents = await db.collection('calendar_events')
            .find({ 
                user_id: user._id, 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
            .sort({ created_at: -1 })
            .limit(5)
            .toArray();

        for (const event of recentEvents) {
            const result = await checkCalendarEventCreatedTool(user._id, {
                eventId: event.event_id,
                title: event.title,
                attendees: event.attendees || [],
                startTime: event.start_time,
                endTime: event.end_time
            });

            if (result.ok) {
                console.log(`[proactive] Calendar event created: ${event.title}`);
                // Mark as processed
                await db.collection('calendar_events').updateOne(
                    { _id: event._id },
                    { $set: { processed_for_proactive: true } }
                );
            }
        }
    } catch (e) {
        console.error('[proactive] Calendar processing error:', e.message);
    }

    // Check for new HubSpot contacts
    try {
        const recentContacts = await db.collection('hubspot_contacts')
            .find({ 
                user_id: user._id, 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
            .sort({ created_at: -1 })
            .limit(5)
            .toArray();

        for (const contact of recentContacts) {
            const result = await checkHubspotContactCreatedTool(user._id, {
                contactId: contact.hubspot_id,
                email: contact.email,
                firstName: contact.firstname,
                lastName: contact.lastname
            });

            if (result.ok) {
                console.log(`[proactive] HubSpot contact created: ${contact.email}`);
                // Mark as processed
                await db.collection('hubspot_contacts').updateOne(
                    { _id: contact._id },
                    { $set: { processed_for_proactive: true } }
                );
            }
        }
    } catch (e) {
        console.error('[proactive] HubSpot processing error:', e.message);
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