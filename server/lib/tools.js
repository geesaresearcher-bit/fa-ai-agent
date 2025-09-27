import { google } from 'googleapis';
import axios from 'axios';
import { getDb } from './db.js';
import { queryRAG } from './rag.js';

/** -----------------------
 * GOOGLE (Gmail / Calendar)
 * ----------------------- */

export async function sendEmailTool(userId, { to, subject, body }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
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
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };
  
    // Validate inputs
    if (!start || !end) return { ok: false, error: 'Missing start/end ISO datetime' };
    if (!title) title = 'Meeting';
    if (!Array.isArray(attendees)) attendees = [];
    attendees = attendees.filter(Boolean).map(e => ({ email: e }));
  
    // OAuth
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
      // uncomment if you want Meet links:
      // conferenceData: { createRequest: { requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` } }
    };
  
    try {
      const insert = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
        // conferenceDataVersion: 1, // only if using conferenceData above
      });
  
      const created = insert.data;
      // double-check we can read it back
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
      // Surface exact Google error back to the caller
      const gerr = err?.response?.data || err?.message || String(err);
      console.error('[scheduleEventTool] insert failed:', gerr);
      return { ok: false, error: gerr };
    }
  }

export async function getUpcomingEventsTool(userId, { timeframe = 'next 7 days' }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user?.google_tokens) return { ok: false, error: 'Google not connected' };

    const auth = new google.auth.OAuth2();
    auth.setCredentials(user.google_tokens);
    const calendar = google.calendar({ version: 'v3', auth });

    const now = new Date();
    const to = new Date(now);
    // crude parser: today / next 7 days / this month
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

/** -------------
 * HUBSPOT (CRM)
 * ------------- */

export async function createHubspotContactTool(userId, { email, firstname, lastname }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    const resp = await axios.post(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        { properties: { email, firstname, lastname } },
        { headers: { Authorization: `Bearer ${user.hubspot_tokens.access_token}` } }
    );

    await db.collection('hubspot_contacts').updateOne(
        { user_id: userId, hubspot_id: resp.data.id },
        { $set: { properties: resp.data.properties, updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
        { upsert: true }
    );

    return { ok: true, hubspotId: resp.data.id };
}

export async function updateHubspotContactTool(userId, { contactId, note }) {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    // Create a Note engagement and associate with contact
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
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user?.hubspot_tokens?.access_token) return { ok: false, error: 'HubSpot not connected' };

    // Simple search: by email or name
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

/** ----------------
 * TASKS (DB backed)
 * ---------------- */

export async function createTaskTool(userId, { description, related_to, due_date }) {
    const db = getDb();
    const task = {
        user_id: userId,
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
    const q = { user_id: userId };
    if (status) q.status = status;
    const tasks = await db.collection('tasks').find(q).sort({ updated_at: -1 }).limit(50).toArray();
    return { ok: true, tasks };
}

export async function completeTaskTool(userId, { taskId, notes }) {
    const db = getDb();
    await db.collection('tasks').updateOne(
        { _id: taskId, user_id: userId },
        {
            $set: { status: 'completed', updated_at: new Date() },
            $push: { history: { at: new Date(), action: 'completed', notes: notes || '' } }
        }
    );
    return { ok: true };
}

/** ---------------------------
 * STANDING INSTRUCTIONS (MEMO)
 * --------------------------- */

export async function addInstructionTool(userId, { trigger, action }) {
    const db = getDb();
    const doc = {
        user_id: userId,
        type: 'rule',
        trigger,  // e.g., "email_from_unknown", "calendar_event_created"
        action,   // e.g., "create_hubspot_contact_and_note", "email_attendees_with_brief"
        enabled: true,
        created_at: new Date(),
        updated_at: new Date()
    };
    const { insertedId } = await db.collection('memories').insertOne(doc);
    return { ok: true, instructionId: insertedId };
}

export async function listInstructionsTool(userId) {
    const db = getDb();
    const rows = await db.collection('memories').find({ user_id: userId, type: 'rule', enabled: true }).toArray();
    return { ok: true, instructions: rows };
}

export async function removeInstructionTool(userId, { instructionId }) {
    const db = getDb();
    await db.collection('memories').updateOne(
        { _id: instructionId, user_id: userId },
        { $set: { enabled: false, updated_at: new Date() } }
    );
    return { ok: true };
}

/** -----------
 * RAG wrapper
 * ----------- */
export async function queryKnowledgeBaseTool(userId, { query, topK = 5 }) {
    const hits = await queryRAG(userId, query, topK);
    return { ok: true, hits };
}
