import { getDb, connectDb } from './lib/db.js';
import { ingestEmailsForUser } from './lib/ingest_gmail.js';
import { ingestHubspotForUser } from './lib/ingest_hubspot.js';
import { 
    checkEmailFromUnknownTool, 
    checkCalendarEventCreatedTool, 
    checkHubspotContactCreatedTool,
    proactiveAgentTool 
} from './lib/tools.js';
import { refreshHubSpotIfNeeded, refreshGoogleIfNeeded } from './lib/oauthRefresh.js';

// Check and refresh Google token if needed
async function ensureGoogleConnected(user) {
    if (!user.google_tokens || !user.google_tokens.access_token) {
        console.log(`[worker] Google not connected for user ${user._id}`);
        return false;
    }

    try {
        // This function automatically checks if token is expired and refreshes if needed
        const refreshedTokens = await refreshGoogleIfNeeded(user);
        console.log(`[worker] Google token is valid for user ${user._id}`);
        return true;
    } catch (error) {
        console.log(`[worker] Google token refresh failed for user ${user._id}: ${error.message}`);
        
        // If refresh failed due to missing refresh_token, mark as disconnected
        if (error.message.includes('Missing Google refresh_token')) {
            console.log(`[worker] Google refresh_token missing for user ${user._id} - user needs to reconnect Google`);
            // Clear the invalid tokens
            const db = getDb();
            await db.collection('users').updateOne(
                { _id: user._id },
                { $unset: { google_tokens: 1 } }
            );
        }
        
        return false;
    }
}

// Check and refresh Hubspot token if needed
async function ensureHubspotConnected(user) {
    if (!user.hubspot_tokens || !user.hubspot_tokens.access_token) {
        console.log(`[worker] Hubspot not connected for user ${user._id}`);
        return false;
    }

    try {
        // This function automatically checks if token is expired and refreshes if needed
        const refreshedTokens = await refreshHubSpotIfNeeded(user);
        console.log(`[worker] Hubspot token is valid for user ${user._id}`);
        return true;
    } catch (error) {
        console.log(`[worker] Hubspot token refresh failed for user ${user._id}: ${error.message}`);
        
        // If refresh failed due to missing refresh_token, mark as disconnected
        if (error.message.includes('Missing HubSpot refresh_token')) {
            console.log(`[worker] Hubspot refresh_token missing for user ${user._id} - user needs to reconnect Hubspot`);
            // Clear the invalid tokens
            const db = getDb();
            await db.collection('users').updateOne(
                { _id: user._id },
                { $unset: { hubspot_tokens: 1 } }
            );
        }
        
        return false;
    }
}

async function loop() {
    try {
        const db = getDb();
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`Processing ${users.length} users...`);
        
        for (const u of users) {
            // Check and refresh Google tokens before ingesting emails
            const googleConnected = await ensureGoogleConnected(u);
            if (googleConnected) {
                try { 
                    await ingestEmailsForUser(u); 
                    console.log(`[ingestEmails] Success for user ${u.email}`);
                } catch (e) { 
                    console.error('[ingestEmails]', e.message); 
                }
            } else {
                console.log(`[worker] Skipping email ingestion for user ${u._id} - Google not connected`);
            }
            
            // Check and refresh Hubspot tokens before ingesting contacts
            const hubspotConnected = await ensureHubspotConnected(u);
            if (hubspotConnected) {
                try { 
                    await ingestHubspotForUser(u); 
                    console.log(`[ingestHubspot] Success for user ${u.email}`);
                } catch (e) { 
                    console.error('[ingestHubspot]', e.message); 
                }
            } else {
                console.log(`[worker] Skipping Hubspot ingestion for user ${u._id} - Hubspot not connected`);
            }

            // Proactive agent processing (requires both Google and Hubspot)
            if (googleConnected && hubspotConnected) {
                try {
                    await processProactiveEvents(u);
                    console.log(`[proactiveAgent] Success for user ${u.email}`);
                } catch (e) {
                    console.error('[proactiveAgent]', e.message);
                }
            } else {
                console.log(`[worker] Skipping proactive processing for user ${u._id} - Missing Google or Hubspot connection`);
            }
        }

        // process tasks that are waiting_for_reply (left as an exercise to tailor to your flows)
    } catch (error) {
        console.error('Worker loop error:', error);
    }
}

async function processProactiveEvents(user) {
    const db = getDb();
    
    // Ensure Hubspot is connected and token is fresh
    const hubspotConnected = await ensureHubspotConnected(user);
    if (!hubspotConnected) {
        console.log(`[proactive] Skipping email processing for user ${user._id} - Hubspot not connected or token refresh failed`);
        return;
    }
    
    // Check for new emails from unknown senders
    try {
        console.log(`[proactive] Processing emails for user: ${user._id}`);
        
        const recentEmails = await db.collection('emails')
            .find({ 
                user_id: user._id, 
                processed_for_proactive: { $ne: true },
                created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            })
            .sort({ created_at: -1 })
            .limit(10)
            .toArray();

        console.log(`[proactive] Found ${recentEmails.length} recent emails to process`);

        for (const email of recentEmails) {
            console.log(`[proactive] Processing email from: ${email.from}, subject: ${email.subject}`);
            
            const result = await checkEmailFromUnknownTool(user._id, {
                emailContent: email.content,
                senderEmail: email.from,
                subject: email.subject
            });

            console.log(`[proactive] Result:`, result);

            if (result.ok && result.isUnknownSender) {
                console.log(`[proactive] Unknown sender detected: ${email.from}`);
                // Mark as processed
                await db.collection('emails').updateOne(
                    { _id: email._id },
                    { $set: { processed_for_proactive: true } }
                );
                console.log(`[proactive] Email marked as processed: ${email._id}`);
            } else if (result.ok && !result.isUnknownSender) {
                console.log(`[proactive] Sender is known contact: ${email.from}`);
                // Mark as processed even if known
                await db.collection('emails').updateOne(
                    { _id: email._id },
                    { $set: { processed_for_proactive: true } }
                );
            } else {
                console.log(`[proactive] Error processing email: ${result.error}`);
                // Mark as processed to avoid retrying failed emails
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
            } else {
                console.log(`[proactive] Error processing calendar event: ${result.error}`);
                // Mark as processed to avoid retrying failed events
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
            } else {
                console.log(`[proactive] Error processing HubSpot contact: ${result.error}`);
                // Mark as processed to avoid retrying failed contacts
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