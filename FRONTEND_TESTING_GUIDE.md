# Frontend Testing Guide - Sample Chats

## Overview
This guide provides specific chat examples you can use in the frontend to test each requirement. Each test includes the exact message to send and what to expect in the response.

## Prerequisites
1. **Server Running**: `npm start`
2. **Frontend Running**: Access the chat interface
3. **User Logged In**: Ensure you're authenticated
4. **Integrations**: Google and Hubspot OAuth configured (for full functionality)

---

## 🧪 **Test Cases for Each Requirement**

### **Test 1: RAG Context Integration**
**Requirement**: "Ask the agent a question about clients and it uses information from email and Hubspot to answer the question"

#### Sample Chat:
```
User: "Tell me about my clients"
```

#### Expected Response:
- Agent should provide information about clients
- Should mention specific client names, emails, or details
- Should reference information from emails or Hubspot data
- Should show evidence of using context from your data sources

#### What to Look For:
- ✅ Agent mentions specific client names
- ✅ Agent provides details that would come from emails/Hubspot
- ✅ Agent shows it's using context from your data

---

### **Test 2: Appointment Scheduling with Correct Email**
**Requirement**: "Ask the agent to do things for me: 'Schedule an appointment with Sara Smith'"

#### Sample Chat:
```
User: "Schedule an appointment with Sara Smith for tomorrow 2:00pm"
```

#### Expected Response:
- Agent should create a calendar event
- Should use the correct email address from Hubspot (not a generic one)
- Should send email notification to Sara Smith
- Should provide confirmation of the scheduled meeting

#### What to Look For:
- ✅ Calendar event created successfully
- ✅ Correct email address used (from Hubspot contact)
- ✅ Email notification sent to attendee
- ✅ Meeting details provided (time, date, attendees)

---

### **Test 3: Unknown Emailer Contact Creation**
**Requirement**: "When someone emails me that is not in Hubspot, please create a contact in Hubspot with a note about the email"

#### How to Test:
1. **Send an email to yourself** from an unknown email address (like `test@example.com`)
2. **Wait for the worker to process** (runs every 2 minutes)
3. **Check your Hubspot** for the new contact
4. **Check the unknown sender's inbox** for the welcome email

#### Expected Behavior:
- **Automatic**: System should automatically detect the unknown sender
- **Hubspot**: Contact should be created in Hubspot automatically
- **Note**: Contact should have a note about the email content
- **Welcome Email**: Unknown sender should receive a welcome email automatically

#### What to Look For:
- ✅ Contact automatically created in Hubspot (check Hubspot dashboard)
- ✅ Contact has note with email details
- ✅ Welcome email sent to unknown sender (check their inbox)
- ✅ No manual intervention required

---

### **Test 4: Welcome Email on Contact Creation**
**Requirement**: "When I create a contact in Hubspot, send them an email telling them thank you for being a client"

#### Sample Chat:
```
User: "Create a new contact: John Doe <john.doe@example.com>"
```

#### Expected Response:
- Agent should create the contact in Hubspot
- Should send a welcome email to john.doe@example.com
- Should include a personalized message
- Should confirm both actions were completed

#### What to Look For:
- ✅ Contact created in Hubspot
- ✅ Welcome email sent to the new contact
- ✅ Email contains "Thank you for being a client" message
- ✅ Confirmation of both actions

---

### **Test 5: Calendar Event Notifications**
**Requirement**: "When I add an event in my calendar, send an email to attendees tell them about the meeting"

#### Sample Chat:
```
User: "Schedule a meeting with client@example.com for next Tuesday at 3pm"
```

#### Expected Response:
- Agent should create the calendar event
- Should send email notification to client@example.com
- Should include meeting details in the email
- Should provide confirmation of both actions

#### What to Look For:
- ✅ Calendar event created
- ✅ Email notification sent to attendee
- ✅ Email contains meeting details (time, date, description)
- ✅ Confirmation of event creation and notification

---

### **Test 6: Meeting Lookup**
**Requirement**: "This should handle the case where a client emails me asking when our upcoming meeting is and the agent looks it up on the calendar and responds"

#### Sample Chat:
```
User: "When is my upcoming meeting with Sara Smith?"
```

#### Expected Response:
- Agent should look up the meeting in the calendar
- Should provide specific details about the meeting
- Should include time, date, and other relevant information
- Should show it's using calendar data

#### What to Look For:
- ✅ Agent looks up the meeting
- ✅ Provides specific meeting details
- ✅ Shows accurate time and date information
- ✅ References calendar data

---

### **Test 7: Proactive Agent Processing**
**Requirement**: "Proactive agent processes events automatically"

#### How to Test:
1. **Send an email to yourself** from an unknown email address
2. **Wait for the worker to process** (runs every 2 minutes)
3. **Check the system logs** for proactive processing
4. **Verify automatic actions** were taken

#### Expected Behavior:
- **Automatic Detection**: System should automatically detect unknown senders
- **Proactive Processing**: Should process emails without manual intervention
- **Contact Creation**: Should create Hubspot contacts automatically
- **Welcome Emails**: Should send welcome emails automatically
- **Background Processing**: Should work without chat interaction

#### What to Look For:
- ✅ System automatically detects unknown senders
- ✅ Processes emails in background
- ✅ Creates contacts without manual intervention
- ✅ Sends welcome emails automatically
- ✅ Works without chat interaction

---

## 🔍 **Advanced Test Scenarios**

### **Test 8: Complex Client Question**
```
User: "What do I know about Sara Smith? When did we last communicate?"
```

**Expected**: Agent should provide comprehensive information about Sara Smith from emails and Hubspot data, including last communication date.

### **Test 9: Multiple Attendees Meeting**
```
User: "Schedule a meeting with Sara Smith and John Doe for tomorrow 10am"
```

**Expected**: Agent should create meeting with both attendees and send notifications to both.

### **Test 10: Meeting Conflict Resolution**
```
User: "Schedule a meeting with Sara Smith for tomorrow 2pm"
```

**Expected**: If there's a conflict, agent should suggest alternative times and handle the scheduling intelligently.

---

## 📊 **Testing Checklist**

### **Before Testing:**
- [ ] Server is running (`npm start`)
- [ ] Frontend is accessible
- [ ] User is logged in
- [ ] Google OAuth is configured
- [ ] Hubspot OAuth is configured
- [ ] User has valid tokens

### **During Testing:**
- [ ] Send each test message exactly as provided
- [ ] Wait for complete response before sending next message
- [ ] Check for expected behaviors listed for each test
- [ ] Note any errors or unexpected responses

### **After Testing:**
- [ ] Verify all expected behaviors occurred
- [ ] Check external systems (Gmail, Hubspot, Google Calendar)
- [ ] Note any failures or issues
- [ ] Document results for each test

---

## 🎯 **Success Criteria**

### **All Tests Pass When:**
- ✅ Agent uses email/Hubspot data to answer client questions
- ✅ Appointment scheduling uses correct email addresses
- ✅ Unknown emailers automatically create Hubspot contacts
- ✅ Welcome emails sent when contacts are created
- ✅ Calendar events send notifications to attendees
- ✅ Agent can look up meetings with specific clients
- ✅ Proactive agent processes events automatically

### **Expected Response Patterns:**
- **Successful Operations**: "I've [action] successfully. [Details]"
- **Tool Usage**: Agent should show it's using tools (scheduling, emailing, etc.)
- **Context Usage**: Agent should reference specific data from your systems
- **Confirmation**: Agent should confirm what actions were taken

---

## 🚨 **Troubleshooting**

### **If Tests Fail:**

1. **Check Server Logs**: Look for error messages in the console
2. **Verify Integrations**: Ensure Google and Hubspot OAuth are working
3. **Check User Tokens**: Verify user has valid access tokens
4. **Test Database**: Ensure MongoDB is connected
5. **Check External APIs**: Verify Google and Hubspot APIs are accessible

### **Common Issues:**
- **"Google not connected"**: Set up Google OAuth
- **"Hubspot not connected"**: Set up Hubspot OAuth
- **"User not found"**: Check user authentication
- **"Database error"**: Check MongoDB connection

---

## 📝 **Test Results Template**

```
Test 1 - RAG Context: [PASS/FAIL] - [Notes]
Test 2 - Appointment Scheduling: [PASS/FAIL] - [Notes]
Test 3 - Unknown Emailer: [PASS/FAIL] - [Notes]
Test 4 - Welcome Email: [PASS/FAIL] - [Notes]
Test 5 - Calendar Notifications: [PASS/FAIL] - [Notes]
Test 6 - Meeting Lookup: [PASS/FAIL] - [Notes]
Test 7 - Proactive Agent: [PASS/FAIL] - [Notes]

Overall Result: [PASS/FAIL]
Issues Found: [List any issues]
```

This frontend testing approach gives you the most realistic validation of your requirements since it tests the actual user experience!
