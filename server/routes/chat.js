import express from 'express';
import OpenAI from 'openai';
import { DateTime } from 'luxon';
import * as chrono from 'chrono-node';
import { getDb } from '../lib/db.js';
import { queryRAG } from '../lib/rag.js';
import {
    sendEmailTool,
    scheduleEventTool,
    getUpcomingEventsTool,
    createHubspotContactTool,
    updateHubspotContactTool,
    findHubspotContactTool,
    createTaskTool,
    checkTasksTool,
    completeTaskTool,
    addInstructionTool,
    listInstructionsTool,
    removeInstructionTool,
    queryKnowledgeBaseTool
} from '../lib/tools.js';
import { ensureConversation, saveMessage, loadRecentMessages, maybeSetTitle, updateRollingSummaryIfNeeded } from '../lib/memory.js';
import { sessionAuth } from '../middleware/sessionAuth.js';
const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Parse “today 2.30pm”, “tomorrow at 10”, etc. -> ISO start/end
function parseWhenToRange(text, tz = 'Asia/Colombo', defaultDurMins = 45) {
    const parsed = chrono.parse(text, new Date(), { forwardDate: true })[0];
    if (!parsed) return null;
    const startJS = parsed.date();
    const start = DateTime.fromJSDate(startJS).setZone(tz);
    const end = start.plus({ minutes: defaultDurMins });
    return { startISO: start.toISO(), endISO: end.toISO() };
}

// Tool schemas for function calling
const tools = [
    // Google
    {
        type: 'function',
        function: {
            name: 'send_email',
            description: "Send an email via the user's Gmail",
            parameters: {
                type: 'object',
                properties: {
                    to: { type: 'string' },
                    subject: { type: 'string' },
                    body: { type: 'string' }
                },
                required: ['to', 'body']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'schedule_event',
            description: 'Create a Google Calendar event for the user',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string', description: 'Event title/summary' },
                    attendees: { type: 'array', items: { type: 'string' }, description: 'Attendee emails' },
                    start: { type: 'string', description: 'Start ISO datetime' },
                    end: { type: 'string', description: 'End ISO datetime' }
                },
                required: ['title', 'attendees', 'start', 'end']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_upcoming_events',
            description: 'Fetch upcoming Google Calendar events for the user',
            parameters: {
                type: 'object',
                properties: {
                    timeframe: { type: 'string', description: 'Range like "today", "next 7 days", "this month"' }
                },
                required: ['timeframe']
            }
        }
    },

    // HubSpot
    {
        type: 'function',
        function: {
            name: 'create_hubspot_contact',
            description: 'Create a HubSpot contact for this user',
            parameters: {
                type: 'object',
                properties: { email: { type: 'string' }, firstname: { type: 'string' }, lastname: { type: 'string' } },
                required: ['email']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'update_hubspot_contact',
            description: 'Update a HubSpot contact by adding a note',
            parameters: {
                type: 'object',
                properties: {
                    contactId: { type: 'string' },
                    note: { type: 'string' }
                },
                required: ['contactId', 'note']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'find_hubspot_contact',
            description: 'Find a HubSpot contact by name or email',
            parameters: {
                type: 'object',
                properties: { query: { type: 'string' } },
                required: ['query']
            }
        }
    },

    // Tasks (DB backed)
    {
        type: 'function',
        function: {
            name: 'create_task',
            description: 'Create and store a task in the DB',
            parameters: {
                type: 'object',
                properties: {
                    description: { type: 'string' },
                    related_to: { type: 'string' },
                    due_date: { type: 'string' }
                },
                required: ['description']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_tasks',
            description: 'List tasks from the DB',
            parameters: {
                type: 'object',
                properties: { status: { type: 'string' } }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'complete_task',
            description: 'Mark a task as completed',
            parameters: {
                type: 'object',
                properties: { taskId: { type: 'string' }, notes: { type: 'string' } },
                required: ['taskId']
            }
        }
    },

    // RAG
    {
        type: 'function',
        function: {
            name: 'query_knowledge_base',
            description: 'Search embeddings (emails + HubSpot) to answer questions',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string' },
                    topK: { type: 'integer' }
                },
                required: ['query']
            }
        }
    },

    // Standing instructions (Memory)
    {
        type: 'function',
        function: {
            name: 'add_instruction',
            description: 'Save a standing instruction (trigger -> action)',
            parameters: {
                type: 'object',
                properties: {
                    trigger: { type: 'string' },
                    action: { type: 'string' }
                },
                required: ['trigger', 'action']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_instructions',
            description: 'List standing instructions',
            parameters: { type: 'object', properties: {} }
        }
    },
    {
        type: 'function',
        function: {
            name: 'remove_instruction',
            description: 'Disable a standing instruction',
            parameters: {
                type: 'object',
                properties: { instructionId: { type: 'string' } },
                required: ['instructionId']
            }
        }
    }
];

router.post('/message', sessionAuth, async (req, res) => {
    try {
        const userId = req.userId; // set by middleware
        const { message, threadId } = req.body;
        const db = getDb();
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) return res.status(401).json({ error: 'Invalid user' });

        // 0) Ensure conversation
        const conversation = await ensureConversation(userId, threadId);

        // Save the user message immediately
        await saveMessage(conversation._id, 'user', message);

        // 1) RAG context
        const docs = await queryRAG(userId, message, 5);
        const context = docs.map(d => d.content).join('\n---\n');

        // 2) Memory: rolling summary + last turns
        const recent = await loadRecentMessages(conversation._id, 16);
        const rolled = (conversation.rolling_summary || '').trim();

        const system = `You are an AI assistant for a financial advisor.
Use context snippets to answer questions about clients.
When asked to do something (email, schedule, HubSpot, tasks, rules), call the appropriate tool.
If the user mentions a time like "today 2.30pm", assume timezone Asia/Colombo.`;

        // Build the chat messages: system + memory + recent + new user + context block
        const messages = [
            { role: 'system', content: system },
            rolled ? { role: 'system', content: `MEMORY:\n${rolled}` } : null,
            ...recent.map(m => ({ role: m.role, content: m.content })),
            { role: 'assistant', content: `CONTEXT:\n${context}` },
            { role: 'user', content: message }
        ].filter(Boolean);

        // 2) Let the LLM decide which tool(s) to call
        const first = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools,
            tool_choice: 'auto'
        });

        let assistantText = first.choices?.[0]?.message?.content || '';
        let toolCalls = first.choices?.[0]?.message?.tool_calls || [];
        let toolResults = [];

        // 4) Dispatch tool calls (chain)
        for (const call of toolCalls) {
            const name = call.function?.name || call.name;
            const args = JSON.parse(call.function?.arguments || call.arguments || '{}');

            if (name === 'schedule_event') {
                let { start, end, title, attendees, description, timeZone } = args;

                // Parse times if missing
                if (!start || !end) {
                    const when = parseWhenToRange(message);
                    if (!when) return res.json({ reply: 'Please provide a clear time (e.g., tomorrow 2:00pm).' });
                    start = when.startISO;
                    end = when.endISO;
                }

                // Extract attendee if not given
                if (!attendees || attendees.length === 0) {
                    const emailMatch = message.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
                    if (emailMatch) attendees = [emailMatch[0]];
                }
                title = title || 'Meeting';
                description = description || message; // include original user text for context

                const result = await scheduleEventTool(req.userId, {
                    start, end, attendees, title, description, timeZone
                });

                if (!result.ok) {
                    return res.json({
                        reply: `❌ I couldn't create the event. Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`,
                        toolResult: result
                    });
                }

                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'send_email') {
                const result = await sendEmailTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'get_upcoming_events') {
                const result = await getUpcomingEventsTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'create_hubspot_contact') {
                const result = await createHubspotContactTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'update_hubspot_contact') {
                const result = await updateHubspotContactTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'find_hubspot_contact') {
                const result = await findHubspotContactTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'create_task') {
                const result = await createTaskTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'check_tasks') {
                const result = await checkTasksTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'complete_task') {
                const result = await completeTaskTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'query_knowledge_base') {
                const result = await queryKnowledgeBaseTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'add_instruction') {
                const result = await addInstructionTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'list_instructions') {
                const result = await listInstructionsTool(userId);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
            else if (name === 'remove_instruction') {
                const result = await removeInstructionTool(userId, args);
                toolResults.push({
                    tool_call_id: call.id,
                    name: name,
                    content: JSON.stringify(result)
                });
            }
        }

        // 5) Second pass to craft a nice confirmation if tools ran
        if (toolResults.length > 0) {
            const secondMessages = [
                { role: 'system', content: system },
                rolled ? { role: 'system', content: `MEMORY:\n${rolled}` } : null,
                ...recent.map(m => ({ role: m.role, content: m.content })),
                { role: 'assistant', content: `CONTEXT:\n${context}` },
                { role: 'user', content: message }
            ].filter(Boolean);

            // Add the tool calls and all responses
            secondMessages.push({
                role: 'assistant',
                content: null,
                tool_calls: toolCalls
            });
            
            // Add all tool responses
            for (const toolResult of toolResults) {
                secondMessages.push({
                    role: 'tool',
                    name: toolResult.name,
                    content: toolResult.content,
                    tool_call_id: toolResult.tool_call_id
                });
            }

            const second = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: secondMessages
            });
            assistantText = second.choices?.[0]?.message?.content || assistantText || 'Done.';
        }

        // Save assistant reply
        await saveMessage(conversation._id, 'assistant', assistantText, toolResults.length > 0 ? { tool_results: toolResults } : {});

        // Maybe set a nice title & roll the summary if long
        await maybeSetTitle(conversation);
        await updateRollingSummaryIfNeeded(conversation._id);

        res.json({
            reply: assistantText,
            threadId: String(conversation._id),
            toolResult: toolResults.length > 0 ? toolResults : null
        });
    } catch (e) {
        console.error('/chat/message error', e?.message || e);
        res.status(500).json({ error: 'chat_failed' });
    }
});

export default router;
