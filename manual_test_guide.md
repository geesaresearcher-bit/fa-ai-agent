# Manual Testing Guide for Requirements Validation

This guide provides step-by-step instructions to manually test each requirement to ensure they are working correctly.

## Prerequisites

1. **Server Running**: Make sure your server is running (`npm start`)
2. **Database Connected**: Ensure MongoDB is connected
3. **Integrations Set Up**: Google and Hubspot integrations should be configured
4. **Test User**: You need a valid user account with proper tokens

## Test Cases

### 1. Test RAG Context Integration
**Requirement**: "Ask the agent a question about clients and it uses information from email and Hubspot to answer the question"

**Steps**:
1. Open the chat interface
2. Ask: "Tell me about my clients"
3. **Expected Result**: The agent should provide information about clients using data from emails and Hubspot
4. **Check**: Look for specific client names, email addresses, or other details that would come from your data sources

### 2. Test Appointment Scheduling with Correct Email
**Requirement**: "Ask the agent to do things for me: 'Schedule an appointment with Sara Smith'"

**Steps**:
1. Ask: "Schedule an appointment with Sara Smith for tomorrow 2:00pm"
2. **Expected Result**: 
   - Agent should create a calendar event
   - Use the correct email address from Hubspot (not a generic one)
   - Send email notification to Sara Smith
3. **Check**: Verify the email address used is the one from your Hubspot contact record

### 3. Test Unknown Emailer Contact Creation
**Requirement**: "When someone emails me that is not in Hubspot, please create a contact in Hubspot with a note about the email"

**Steps**:
1. Ask: "I received an email from newclient@example.com - please handle this"
2. **Expected Result**:
   - Agent should create a new Hubspot contact
   - Add a note about the email content
   - Send a welcome email to the new contact
3. **Check**: Verify in Hubspot that the contact was created with the email note

### 4. Test Welcome Email on Contact Creation
**Requirement**: "When I create a contact in Hubspot, send them an email telling them thank you for being a client"

**Steps**:
1. Ask: "Create a new contact: John Doe <john.doe@example.com>"
2. **Expected Result**:
   - Contact should be created in Hubspot
   - Welcome email should be sent to john.doe@example.com
3. **Check**: Verify the welcome email was sent with appropriate content

### 5. Test Calendar Event Notifications
**Requirement**: "When I add an event in my calendar, send an email to attendees tell them about the meeting"

**Steps**:
1. Ask: "Schedule a meeting with client@example.com for next Tuesday at 3pm"
2. **Expected Result**:
   - Calendar event should be created
   - Email notification should be sent to client@example.com
3. **Check**: Verify the attendee received an email with meeting details

### 6. Test Meeting Lookup
**Requirement**: "This should handle the case where a client emails me asking when our upcoming meeting is and the agent looks it up on the calendar and responds"

**Steps**:
1. First, schedule a meeting: "Schedule a meeting with test@example.com for tomorrow 2pm"
2. Then ask: "When is my upcoming meeting with test@example.com?"
3. **Expected Result**:
   - Agent should look up the meeting in the calendar
   - Provide specific details about the meeting (time, date, etc.)
4. **Check**: Verify the agent provides accurate meeting information

## Automated Test Endpoint

You can also run automated tests using the test endpoint:

```bash
# Test all requirements
curl http://localhost:4000/test/requirements

# Health check
curl http://localhost:4000/test/health
```

## Expected Test Results

When running the automated tests, you should see:

```
📊 Test Results Summary:
Total Tests: 7
Passed: 7
Failed: 0
Pass Rate: 100%

📋 Detailed Results:
✅ RAG Context Integration: RAG successfully retrieved context
✅ Email Validation in Scheduling: Email validation working
✅ Hubspot Contact Creation: Contact creation working
✅ Welcome Email Functionality: Email sending working
✅ Calendar Event Notifications: Event creation and notifications working
✅ Meeting Lookup Functionality: Meeting lookup working
✅ Unknown Emailer Processing: Unknown emailer processing working
```

## Troubleshooting

If tests fail:

1. **Check Server Logs**: Look for error messages in the console
2. **Verify Integrations**: Ensure Google and Hubspot tokens are valid
3. **Database Connection**: Make sure MongoDB is accessible
4. **User Permissions**: Verify the test user has proper permissions

## Manual Verification Steps

After running tests, manually verify:

1. **Hubspot**: Check that contacts were created and have notes
2. **Gmail**: Verify that emails were sent to the correct addresses
3. **Google Calendar**: Confirm events were created with correct attendees
4. **Database**: Check that records were stored properly in MongoDB

## Success Criteria

All requirements are working correctly if:
- ✅ Agent uses email/Hubspot data to answer client questions
- ✅ Appointment scheduling uses correct email addresses
- ✅ Unknown emailers automatically create Hubspot contacts
- ✅ Welcome emails are sent when contacts are created
- ✅ Calendar events send notifications to attendees
- ✅ Agent can look up meetings with specific clients
