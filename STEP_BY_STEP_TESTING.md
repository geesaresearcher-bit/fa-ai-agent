# Step-by-Step Frontend Testing

## 🎯 **Testing Process**

### **Step 1: Prepare Your Environment**
1. **Start the server**: `npm start`
2. **Open the frontend**: Access your chat interface
3. **Log in**: Ensure you're authenticated
4. **Check integrations**: Verify Google and Hubspot OAuth are configured

### **Step 2: Test Each Requirement**

#### **Test 1: RAG Context Integration**
1. **Send this message**: `"Tell me about my clients"`
2. **Look for**: Agent mentions specific client names, emails, or details from your data
3. **Success if**: Agent provides information that could only come from your emails/Hubspot data
4. **Note**: If agent says "I don't have information about your clients", the RAG system isn't working

#### **Test 2: Appointment Scheduling**
1. **Send this message**: `"Schedule an appointment with Sara Smith for tomorrow 2:00pm"`
2. **Look for**: 
   - Calendar event creation confirmation
   - Email sent to correct address (not generic)
   - Meeting details provided
3. **Success if**: Agent creates event and sends email to the correct email address from Hubspot
4. **Note**: If agent says "Google not connected", you need to set up Google OAuth

#### **Test 3: Unknown Emailer Processing**
1. **Send an email to yourself** from an unknown email address (like `test@example.com`)
2. **Wait for the worker to process** (runs every 2 minutes)
3. **Check your Hubspot dashboard** for the new contact
4. **Check the unknown sender's inbox** for the welcome email
5. **Look for**:
   - Automatic contact creation in Hubspot
   - Contact note with email details
   - Welcome email sent to unknown sender
   - No manual intervention required
6. **Success if**: System automatically creates contact and sends welcome email
7. **Note**: This is a proactive process, not a chat command

#### **Test 4: Welcome Email on Contact Creation**
1. **Send this message**: `"Create a new contact: John Doe <john.doe@example.com>"`
2. **Look for**:
   - Contact creation confirmation
   - Welcome email sent
   - "Thank you for being a client" message
3. **Success if**: Agent creates contact and sends personalized welcome email
4. **Note**: Check that the email contains the welcome message

#### **Test 5: Calendar Event Notifications**
1. **Send this message**: `"Schedule a meeting with client@example.com for next Tuesday at 3pm"`
2. **Look for**:
   - Calendar event creation
   - Email notification to attendee
   - Meeting details in email
3. **Success if**: Agent creates event and sends notification email to the attendee
4. **Note**: The email should contain meeting details

#### **Test 6: Meeting Lookup**
1. **Send this message**: `"When is my upcoming meeting with Sara Smith?"`
2. **Look for**:
   - Agent looks up meeting in calendar
   - Provides specific meeting details
   - Shows accurate time and date
3. **Success if**: Agent provides specific meeting information from calendar
4. **Note**: If agent says "No meetings found", check if you have meetings scheduled

#### **Test 7: Proactive Agent Processing**
1. **Send an email to yourself** from an unknown email address
2. **Wait for the worker to process** (runs every 2 minutes)
3. **Check the system logs** for proactive processing
4. **Verify automatic actions** were taken
5. **Look for**:
   - Automatic detection of unknown senders
   - Background processing of emails
   - Automatic contact creation
   - Automatic welcome email sending
6. **Success if**: System automatically processes unknown emails and creates contacts
7. **Note**: This is a background process, not a chat command

---

## 📊 **Recording Results**

### **Test Results Template**
```
Test 1 - RAG Context: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 2 - Appointment Scheduling: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 3 - Unknown Emailer: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 4 - Welcome Email: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 5 - Calendar Notifications: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 6 - Meeting Lookup: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Test 7 - Proactive Agent: [✅ PASS / ❌ FAIL]
Notes: [What happened]

Overall Result: [✅ ALL PASS / ❌ SOME FAIL]
Issues Found: [List any issues]
```

---

## 🔍 **What to Look For**

### **Successful Responses Should Include:**
- **Specific actions taken**: "I've scheduled...", "I've sent...", "I've created..."
- **Tool usage**: Agent should show it's using tools (scheduling, emailing, etc.)
- **Context usage**: Agent should reference specific data from your systems
- **Confirmations**: Agent should confirm what actions were taken

### **Failed Responses Might Show:**
- **"Google not connected"**: Need to set up Google OAuth
- **"Hubspot not connected"**: Need to set up Hubspot OAuth
- **"User not found"**: Check authentication
- **Generic responses**: RAG system not working
- **"No information available"**: Data not properly ingested

---

## 🚨 **Troubleshooting**

### **If Tests Fail:**

1. **Check Server Logs**: Look for error messages in the console
2. **Verify Integrations**: Ensure Google and Hubspot OAuth are working
3. **Check User Tokens**: Verify user has valid access tokens
4. **Test Database**: Ensure MongoDB is connected
5. **Check External APIs**: Verify Google and Hubspot APIs are accessible

### **Common Error Messages:**
- **"Google not connected"**: Set up Google OAuth
- **"Hubspot not connected"**: Set up Hubspot OAuth
- **"User not found"**: Check user authentication
- **"Database error"**: Check MongoDB connection
- **"No context available"**: Check RAG system and data ingestion

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

### **Expected Behavior:**
- Agent should be proactive and helpful
- Agent should use your data to provide relevant information
- Agent should take actions (schedule, email, create contacts)
- Agent should confirm what it has done
- Agent should show it's using your integrated systems

This step-by-step approach ensures you test each requirement thoroughly through the frontend interface!
