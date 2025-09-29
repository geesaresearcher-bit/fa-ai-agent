import { google } from 'googleapis';
import axios from 'axios';
import OpenAI from 'openai';
import { getDb } from './db.js';
import { queryRAG } from './rag.js';
import { ObjectId } from 'mongodb';

export async function sendEmailTool(userId, { to, subject, body }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = new google.auth.OAuth2();
    auth.setCredentials(user.google_tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    const raw = Buffer
        .from([`To: ${to}`, `Subject: ${subject || 'No subject'}`, '', body || ''].join('\n'))
        .toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const resp = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    return { ok: true, id: resp.data.id };
}

export async function scheduleEventTool(
    userId,
    { start, end, attendees = [], title, description, timeZone = 'Asia/Colombo' }
) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    // Make sure we have the required data
    if (!start || !end) return { ok: false, error: 'Missing start/end ISO datetime' };
    if (!title) title = 'Meeting';
    if (!Array.isArray(attendees)) attendees = [];
    attendees = attendees.filter(Boolean).map(e => ({ email: e }));

    // Set up Google authentication
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_CALLBACK
    );
    auth.setCredentials(user.google_tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
        summary: title,
        description: description || '',
        start: { dateTime: new Date(start).toISOString(), timeZone },
        end: { dateTime: new Date(end).toISOString(), timeZone },
        attendees,
        reminders: { useDefault: true },
        // Add this if you want Google Meet links:
        // conferenceData: { createRequest: { requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` } }
    };

    try {
        const insert = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            sendUpdates: 'all',
            // conferenceDataVersion: 1, // needed if you're using conferenceData
        });

        const created = insert.data;
        // Verify the event was created properly
        const fetched = await calendar.events.get({
            calendarId: 'primary',
            eventId: created.id
        });

        return {
            ok: true,
            eventId: created.id,
            htmlLink: created.htmlLink || fetched.data?.htmlLink,
            hangoutLink: created.hangoutLink || fetched.data?.hangoutLink || null,
            start: fetched.data?.start,
            end: fetched.data?.end
        };
    } catch (err) {
        // Pass along the actual error message
        const gerr = err?.response?.data || err?.message || String(err);
        console.error('[scheduleEventTool] insert failed:', gerr);
        return { ok: false, error: gerr };
    }
}

export async function getUpcomingEventsTool(userId, { timeframe = 'next 7 days' }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = new google.auth.OAuth2();
    auth.setCredentials(user.google_tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const to = new Date(now);
    // Basic time parsing for different periods
    if (/today/i.test(timeframe)) to.setDate(now.getDate() + 1);
    else if (/month/i.test(timeframe)) to.setMonth(now.getMonth() + 1);
    else to.setDate(now.getDate() + 7);

    const resp = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 25
    });

    const events = (resp.data.items || []).map(e => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        attendees: e.attendees?.map(a => a.email) || []
    }));
    return { ok: true, events };
}

export async function createHubspotContactTool(userId, { email, firstname, lastname }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    const resp = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        { properties: { email, firstname, lastname } },
        { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
    );

    await db.collection('hubspot_contacts').updateOne(
        { user_id: new ObjectId(String(userId)), hubspot_id: resp.data.id },
        { $set: { properties: resp.data.properties, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
        { upsert: true }
    );

    return { ok: true, hubspotId: resp.data.id };
}

export async function updateHubspotContactTool(userId, { contactId, note }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    // Add a note to the contact in HubSpot
    const noteCreate = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/notes',
        { properties: { hs_note_body: note } },
        { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
    );

    const noteId = noteCreate.data.id;
    await axios.put(
        `https://api.hubapi.com/crm/v3/objects/notes/${noteId}/associations/contacts/${contactId}/note_to_contact`,
        {},
        { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
    );

    return { ok: true, noteId };
}

export async function findHubspotContactTool(userId, { query }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    // Look up contacts by email or name
    const isEmail = /\S+@\S+\.\S+/.test(query);
    if (isEmail) {
        const res = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts/search',
            { filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: query }] }], properties: ['email', 'firstname', 'lastname'] },
            { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
        );
        return { ok: true, results: res.data.results || [] };
    }

    const res = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
            filterGroups: [{
                filters: [
                    { propertyName: 'firstname', operator: 'CONTAINS_TOKEN', value: query },
                    { propertyName: 'lastname', operator: 'CONTAINS_TOKEN', value: query }
                ]
            }],
            properties: ['email', 'firstname', 'lastname']
        },
        { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
    );
    return { ok: true, results: res.data.results || [] };
}

export async function createTaskTool(userId, { description, related_to, due_date }) {
    const db = getDb();
    const task = {
        user_id: new ObjectId(String(userId)),
        status: 'pending',
        description,
        related_to: related_to || null,
        due_date: due_date ? new Date(due_date) : null,
        created_at: new Date(),
        updated_at: new Date(),
        history: []
    };
    const { insertedId } = await db.collection('tasks').insertOne(task);
    return { ok: true, taskId: insertedId };
}

export async function checkTasksTool(userId, { status }) {
    const db = getDb();
    const q = { user_id: new ObjectId(String(userId)) };
    if (status) q.status = status;
    const tasks = await db.collection('tasks').find(q).sort({ updated_at: -1 }).limit(50).toArray();
    return { ok: true, tasks };
}

export async function completeTaskTool(userId, { taskId, notes }) {
    const db = getDb();
    await db.collection('tasks').updateOne(
        { _id: taskId, user_id: new ObjectId(String(userId)) },
        {
            $set: { status: 'completed', updated_at: new Date() },
            $push: { history: { at: new Date(), action: 'completed', notes: notes || '' } }
        }
    );
    return { ok: true };
}

export async function addInstructionTool(userId, { trigger, action, description }) {
    const db = getDb();
    const doc = {
        user_id: new ObjectId(String(userId)),
        type: 'rule',
        trigger,  // e.g., "email_from_unknown", "calendar_event_created"
        action,   // e.g., "create_hubspot_contact_and_note", "email_attendees_with_brief"
        description: description || `${trigger} -> ${action}`,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
    };
    const { insertedId } = await db.collection('memories').insertOne(doc);
    return { ok: true, instructionId: insertedId };
}

export async function listInstructionsTool(userId) {
    const db = getDb();
    const rows = await db.collection('memories').find({ user_id: new ObjectId(String(userId)), type: 'rule', enabled: true }).toArray();
    return { ok: true, instructions: rows };
}

export async function removeInstructionTool(userId, { instructionId }) {
    const db = getDb();
    await db.collection('memories').updateOne(
        { _id: instructionId, user_id: new ObjectId(String(userId)) },
        { $set: { enabled: false, updated_at: new Date() } }
    );
    return { ok: true };
}

export async function queryKnowledgeBaseTool(userId, { query, topK = 5 }) {
    const hits = await queryRAG(userId, query, topK);
    return { ok: true, hits };
}

function buildOAuth2(user) {
    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_OAUTH_CALLBACK
    );
    auth.setCredentials(user.google_tokens);
    return auth;
}

// Check if a time slot is available
export async function getFreeBusyTool(userId, { startISO, endISO, timeZone = 'Asia/Colombo' }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = buildOAuth2(user);
    const calendar = google.calendar({ version: 'v3', auth });

    try {
        const resp = await calendar.freebusy.query({
            requestBody: {
                timeMin: new Date(startISO).toISOString(),
                timeMax: new Date(endISO).toISOString(),
                timeZone,
                items: [{ id: 'primary' }]
            }
        });
        const busy = resp.data?.calendars?.primary?.busy || [];
        return { ok: true, busy }; // array of { start, end }
    } catch (err) {
        const gerr = err?.response?.data || err?.message || String(err);
        return { ok: false, error: gerr };
    }
}

// Find available meeting slots in the next few days
export async function suggestSlotsTool(
    userId,
    {
        desiredStartISO,
        durationMins = 45,
        timeZone = 'Asia/Colombo',
        daysToScan = 3,
        workHours = { startHour: 9, endHour: 17 } // 9–17 local time
    }
) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = buildOAuth2(user);
    const calendar = google.calendar({ version: 'v3', auth });

    const desired = new Date(desiredStartISO);
    const suggestions = [];

    // Check each day starting from the desired time
    for (let d = 0; d < daysToScan && suggestions.length < 3; d++) {
        const dayStart = new Date(desired);
        dayStart.setDate(dayStart.getDate() + d);
        dayStart.setHours(workHours.startHour, 0, 0, 0);

        const dayEnd = new Date(desired);
        dayEnd.setDate(dayEnd.getDate() + d);
        dayEnd.setHours(workHours.endHour, 0, 0, 0);

        // Get all events for this day
        const events = await calendar.events.list({
            calendarId: 'primary',
            timeMin: dayStart.toISOString(),
            timeMax: dayEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime'
        });

        // Figure out when we're busy
        const busy = (events.data.items || []).map(e => ({
            start: new Date(e.start.dateTime || e.start.date),
            end: new Date(e.end.dateTime || e.end.date)
        }));

        // Start looking for free time slots
        let cursor = new Date(Math.max(dayStart.getTime(), d === 0 ? desired.getTime() : dayStart.getTime()));

        while (cursor.getTime() + durationMins * 60000 <= dayEnd.getTime() && suggestions.length < 3) {
            const slotEnd = new Date(cursor.getTime() + durationMins * 60000);
            const overlaps = busy.some(b => !(slotEnd <= b.start || cursor >= b.end));
            if (!overlaps) {
                suggestions.push({
                    startISO: cursor.toISOString(),
                    endISO: slotEnd.toISOString()
                });
            }
            // Try the next 15-minute slot
            cursor = new Date(cursor.getTime() + 15 * 60000);
        }
    }

    return { ok: true, suggestions };
}

// Look up HubSpot contacts
export async function findHubspotContactByEmail(userId, email) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    const access = user?.hubspot_tokens?.access_token;
    if (!access) return { ok: false, error: 'HubSpot not connected' };
    try {
        const body = {
            filterGroups: [
                { filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }
            ],
            properties: ['email', 'firstname', 'lastname'],
            limit: 1
        };
        const resp = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts/search',
            body,
            { headers: { Authorization: `Bearer ${access}` } }
        );
        const hit = resp.data?.results?.[0];
        if (!hit) return { ok: true, found: false };
        return { ok: true, found: true, contact: hit };
    } catch (err) {
        const herr = err?.response?.data || err?.message || String(err);
        return { ok: false, error: herr };
    }
}

// Make sure a contact exists in HubSpot, create if needed
export async function ensureHubspotContactTool(userId, { email, firstname = '', lastname = '' }) {
    if (!email) return { ok: false, error: 'email required' };
    const found = await findHubspotContactByEmail(userId, email);
    if (!found.ok) return found;
    if (found.found) return { ok: true, created: false, contactId: found.contact.id };

    // Create new contact
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    const access = user?.hubspot_tokens?.access_token;
    if (!access) return { ok: false, error: 'HubSpot not connected' };

    try {
        const resp = await axios.post(
            'https://api.hubapi.com/crm/v3/objects/contacts',
            { properties: { email, firstname, lastname } },
            { headers: { Authorization: `Bearer ${access}` } }
        );

        // cache minimal record
        await db.collection('hubspot_contacts').updateOne(
            { user_id: new ObjectId(String(userId)), hubspot_id: resp.data.id },
            { $set: { properties: resp.data.properties, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
            { upsert: true }
        );

        return { ok: true, created: true, contactId: resp.data.id };
    } catch (err) {
        const herr = err?.response?.data || err?.message || String(err);
        return { ok: false, error: herr };
    }
}

export async function parseEmailResponseTool(userId, { emailContent, originalTimes = [] }) {
    try {
        // Use OpenAI to parse the email content for scheduling information
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `Parse this email response for scheduling information. Extract:
1. Preferred times mentioned
2. Availability windows
3. Any rejections of offered times
4. Alternative time suggestions
5. Confirmation of acceptance

Email content: ${emailContent}

Original times offered: ${originalTimes.join(', ')}

Respond with JSON format:
{
  "preferredTimes": ["time1", "time2"],
  "rejectedTimes": ["time1", "time2"],
  "alternativeSuggestions": ["time1", "time2"],
  "confirmsMeeting": true/false,
  "needsMoreOptions": true/false,
  "notes": "any additional context"
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        const parsed = JSON.parse(response.choices[0].message.content);
        return { ok: true, ...parsed };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function manageEmailThreadTool(userId, { to, subject, body, threadId }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(String(userId)) });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = new google.auth.OAuth2();
    auth.setCredentials(user.google_tokens);
    const gmail = google.gmail({ version: 'v1', auth });

    try {
        // If threadId is provided, add it to the subject for threading
        const threadedSubject = threadId ? subject : subject;

        const raw = Buffer
            .from([`To: ${to}`, `Subject: ${threadedSubject}`, '', body || ''].join('\n'))
            .toString('base64')
            .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        const resp = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw,
                threadId: threadId || undefined
            }
        });

        return { ok: true, id: resp.data.id, threadId: resp.data.threadId };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function smartScheduleWorkflowTool(userId, { contactName, contactEmail, meetingDuration = 60, preferredTimes = [] }) {
    try {
        // Step 1: Ensure contact exists in HubSpot
        const ensureContact = await ensureHubspotContactTool(userId, { email: contactEmail });

        // Step 2: Get available time slots
        const timeSlots = await suggestSlotsTool(userId, {
            desiredStartISO: new Date().toISOString(),
            durationMins: meetingDuration,
            daysToScan: 7
        });

        // Step 3: Generate initial email with available times
        const availableTimes = timeSlots.ok ? timeSlots.suggestions.slice(0, 5) : [];
        const timeOptions = availableTimes.map(slot =>
            `${new Date(slot.startISO).toLocaleString()} - ${new Date(slot.endISO).toLocaleString()}`
        ).join('\n');

        const initialEmail = {
            to: contactEmail,
            subject: `Meeting Request - ${contactName}`,
            body: `Hi ${contactName},

I'd like to schedule a meeting with you. Here are some available times:

${timeOptions}

Please let me know which time works best for you, or if you have other preferences.

Best regards`
        };

        return {
            ok: true,
            contactEnsured: ensureContact.ok,
            availableSlots: availableTimes,
            suggestedEmail: initialEmail,
            workflow: 'initial_contact_sent'
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function proactiveAgentTool(userId, { eventType, eventData, context }) {
    try {
        const db = getDb();

        // Get all active instructions for this user
        const instructions = await db.collection('memories')
            .find({ user_id: new ObjectId(String(userId)), type: 'rule', enabled: true })
            .toArray();

        // Get RAG context for the event
        const ragContext = await queryRAG(userId, `${eventType}: ${JSON.stringify(eventData)}`, 3);
        const contextText = ragContext.map(d => d.content).join('\n---\n');

        // Use OpenAI to determine if any instructions should be triggered
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = `You are a proactive AI agent. Analyze this event and determine what actions to take based on the user's ongoing instructions.

EVENT TYPE: ${eventType}
EVENT DATA: ${JSON.stringify(eventData, null, 2)}
CONTEXT: ${contextText}

USER'S ONGOING INSTRUCTIONS:
${instructions.map(i => `- ${i.description} (trigger: ${i.trigger}, action: ${i.action})`).join('\n')}

Determine which instructions should be triggered and what actions to take. Respond with JSON:
{
  "shouldAct": true/false,
  "triggeredInstructions": ["instruction_id_1", "instruction_id_2"],
  "recommendedActions": [
    {
      "tool": "tool_name",
      "parameters": {...},
      "reason": "why this action is needed"
    }
  ],
  "reasoning": "explanation of decisions"
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1
        });

        const analysis = JSON.parse(response.choices[0].message.content);

        return {
            ok: true,
            analysis,
            instructions: instructions,
            eventType,
            eventData
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function checkEmailFromUnknownTool(userId, { emailContent, senderEmail, subject }) {
    try {
        const db = getDb();

        // Check if sender exists in HubSpot
        const hubspotCheck = await findHubspotContactTool(userId, { query: senderEmail });
        const isKnownContact = hubspotCheck.ok && hubspotCheck.results?.length > 0;

        if (!isKnownContact) {
            // This is an unknown sender - trigger proactive actions
            const proactiveResult = await proactiveAgentTool(userId, {
                eventType: 'email_from_unknown',
                eventData: { senderEmail, subject, emailContent },
                context: 'New email from unknown sender'
            });

            return {
                ok: true,
                isUnknownSender: true,
                proactiveResult,
                recommendedActions: [
                    'create_hubspot_contact',
                    'send_welcome_email',
                    'add_contact_note'
                ]
            };
        }

        return {
            ok: true,
            isUnknownSender: false,
            existingContact: hubspotCheck.results[0]
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function checkCalendarEventCreatedTool(userId, { eventId, title, attendees, startTime, endTime }) {
    try {
        const proactiveResult = await proactiveAgentTool(userId, {
            eventType: 'calendar_event_created',
            eventData: { eventId, title, attendees, startTime, endTime },
            context: 'New calendar event created'
        });

        return {
            ok: true,
            eventCreated: true,
            proactiveResult,
            recommendedActions: [
                'email_attendees',
                'update_hubspot_contacts',
                'create_follow_up_task'
            ]
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

export async function checkHubspotContactCreatedTool(userId, { contactId, email, firstName, lastName }) {
    try {
        const proactiveResult = await proactiveAgentTool(userId, {
            eventType: 'hubspot_contact_created',
            eventData: { contactId, email, firstName, lastName },
            context: 'New HubSpot contact created'
        });

        return {
            ok: true,
            contactCreated: true,
            proactiveResult,
            recommendedActions: [
                'send_welcome_email',
                'create_follow_up_task',
                'add_contact_notes'
            ]
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}