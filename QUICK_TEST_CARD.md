# Quick Test Card - Frontend Chat Testing

## 🚀 **Quick Start Testing**

### **1. RAG Context Test**
```
Message: "Tell me about my clients"
Expected: Agent provides specific client information from your data
```

### **2. Appointment Scheduling Test**
```
Message: "Schedule an appointment with Sara Smith for tomorrow 2:00pm"
Expected: Creates calendar event + sends email to correct address
```

### **3. Unknown Emailer Test**
```
Step 1: Send email to yourself from unknown address (test@example.com)
Step 2: Wait 2 minutes for worker to process
Step 3: Check Hubspot for new contact
Step 4: Check unknown sender's inbox for welcome email
Expected: Automatic contact creation + welcome email
```

### **4. Welcome Email Test**
```
Message: "Create a new contact: John Doe <john.doe@example.com>"
Expected: Creates contact + sends welcome email
```

### **5. Calendar Notifications Test**
```
Message: "Schedule a meeting with client@example.com for next Tuesday at 3pm"
Expected: Creates event + sends notification email to attendee
```

### **6. Meeting Lookup Test**
```
Message: "When is my upcoming meeting with Sara Smith?"
Expected: Looks up meeting in calendar + provides details
```

### **7. Proactive Agent Test**
```
Message: "Check for emails from unknown senders and process them"
Expected: Processes unknown emails + creates contacts + sends welcome emails
```

---

## ✅ **Success Indicators**

- **Agent uses specific data** (mentions client names, emails, dates)
- **Tools are called** (scheduling, emailing, contact creation)
- **Confirmations provided** ("I've scheduled...", "I've sent...", "I've created...")
- **Context is used** (references your emails, Hubspot data, calendar)

---

## 🚨 **Common Issues**

- **"Google not connected"** → Set up Google OAuth
- **"Hubspot not connected"** → Set up Hubspot OAuth  
- **"User not found"** → Check authentication
- **Generic responses** → Check RAG system

---

## 📊 **Test Results**

```
Test 1: RAG Context - [✅/❌]
Test 2: Appointment Scheduling - [✅/❌]
Test 3: Unknown Emailer - [✅/❌]
Test 4: Welcome Email - [✅/❌]
Test 5: Calendar Notifications - [✅/❌]
Test 6: Meeting Lookup - [✅/❌]
Test 7: Proactive Agent - [✅/❌]

Overall: [✅/❌] - [Notes]
```

Copy and paste these messages into your chat interface to test each requirement!
