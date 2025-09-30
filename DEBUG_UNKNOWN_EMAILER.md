# 🔍 Debug Unknown Emailer Contact Creation

## 🚨 **Issue**: Unknown Emailer Test Not Working

The test should automatically create Hubspot contacts and send welcome emails when someone emails you from an unknown address.

## 🔧 **Debugging Steps**

### **Step 1: Check if Worker is Running**
```bash
# Check server logs for worker activity
# Look for messages like:
# [worker] Processing user: [user_id]
# [proactive] Unknown sender detected: [email]
```

### **Step 2: Manual Trigger Test**
```bash
# Manually trigger unknown emailer processing
curl -X POST http://localhost:4000/test/trigger-unknown-emailer \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "processed": 2,
  "results": [
    {
      "email": "unknown@example.com",
      "subject": "Test Email",
      "result": {
        "ok": true,
        "isUnknownSender": true,
        "contactCreated": true,
        "welcomeEmailSent": true
      }
    }
  ]
}
```

### **Step 3: Check Database Collections**

#### **Check Emails Collection:**
```bash
# Connect to MongoDB and run:
db.emails.find({user_id: ObjectId("YOUR_USER_ID")}).sort({created_at: -1}).limit(5)
```

**Look for:**
- `processed_for_proactive: false` (unprocessed emails)
- Recent emails with `created_at` in last 24 hours
- Proper `from`, `subject`, `content` fields

#### **Check Hubspot Contacts Collection:**
```bash
db.hubspot_contacts.find({user_id: ObjectId("YOUR_USER_ID")}).sort({created_at: -1}).limit(5)
```

**Look for:**
- New contacts created
- `processed_for_proactive: false` (unprocessed contacts)

### **Step 4: Check Integrations**

#### **Google Integration:**
```bash
# Check if user has Google tokens
curl http://localhost:4000/test/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### **Hubspot Integration:**
```bash
# Check if user has Hubspot tokens
# Look in user document for hubspot_tokens field
```

### **Step 5: Test Individual Components**

#### **Test Email Ingestion:**
```bash
# Check if emails are being ingested
# Look for Gmail API calls in server logs
# Check if emails collection is being populated
```

#### **Test Hubspot Contact Creation:**
```bash
# Test creating a contact manually
curl -X POST http://localhost:4000/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a contact for test@example.com"}'
```

#### **Test Email Sending:**
```bash
# Test sending an email manually
curl -X POST http://localhost:4000/chat \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "Send an email to test@example.com"}'
```

## 🐛 **Common Issues & Solutions**

### **Issue 1: No Emails Found**
**Symptoms:** `Found 0 recent emails to process`

**Solutions:**
1. **Check Gmail Ingestion:**
   - Ensure Gmail is connected
   - Check if emails are being ingested
   - Look for Gmail API errors in logs

2. **Check Email Collection:**
   - Verify emails are stored in `emails` collection
   - Check if `processed_for_proactive` field exists
   - Ensure emails are recent (last 24 hours)

### **Issue 2: Google Not Connected**
**Symptoms:** `Google not connected` error

**Solutions:**
1. **Reconnect Gmail:**
   - Go to frontend
   - Disconnect and reconnect Gmail
   - Verify tokens are saved

2. **Check Token Validity:**
   - Test Gmail API access
   - Refresh tokens if expired

### **Issue 3: Hubspot Not Connected**
**Symptoms:** `Hubspot not connected` error

**Solutions:**
1. **Reconnect Hubspot:**
   - Go to frontend
   - Disconnect and reconnect Hubspot
   - Verify tokens are saved

2. **Check Token Validity:**
   - Test Hubspot API access
   - Refresh tokens if expired

### **Issue 4: Worker Not Running**
**Symptoms:** No proactive processing happening

**Solutions:**
1. **Check Worker Status:**
   - Look for worker logs
   - Verify worker is running every 2 minutes

2. **Restart Server:**
   - Stop and restart the server
   - Check for worker startup messages

### **Issue 5: Emails Already Processed**
**Symptoms:** All emails have `processed_for_proactive: true`

**Solutions:**
1. **Reset Processing Status:**
   ```bash
   # Reset all emails to unprocessed
   db.emails.updateMany(
     {user_id: ObjectId("YOUR_USER_ID")},
     {$set: {processed_for_proactive: false}}
   )
   ```

2. **Send New Test Email:**
   - Send a new email from unknown address
   - Wait for worker to process

## 🧪 **Manual Testing Steps**

### **Step 1: Send Test Email**
1. **Send an email** to yourself from an unknown address (like `test@example.com`)
2. **Wait 2 minutes** for worker to process
3. **Check server logs** for processing activity

### **Step 2: Manual Trigger**
1. **Run manual trigger:**
   ```bash
   curl -X POST http://localhost:4000/test/trigger-unknown-emailer \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
2. **Check response** for processing results
3. **Verify actions** were taken

### **Step 3: Verify Results**
1. **Check Hubspot** for new contact
2. **Check unknown sender's inbox** for welcome email
3. **Check server logs** for success messages

## 📊 **Expected Behavior**

### **✅ Working Correctly:**
- Unknown sender detected
- Hubspot contact created
- Welcome email sent
- Email marked as processed
- Server logs show success

### **❌ Not Working:**
- No unknown sender detection
- No contact creation
- No welcome email
- Errors in server logs
- No processing activity

## 🔧 **Quick Fixes**

### **Fix 1: Reset All Processing**
```bash
# Reset all emails to unprocessed
db.emails.updateMany(
  {user_id: ObjectId("YOUR_USER_ID")},
  {$set: {processed_for_proactive: false}}
)
```

### **Fix 2: Restart Worker**
```bash
# Restart the server to restart worker
# Check for worker startup messages
```

### **Fix 3: Check Integrations**
```bash
# Verify both Google and Hubspot are connected
# Test API access manually
```

## 📝 **Debug Checklist**

- [ ] Worker is running (check logs)
- [ ] Gmail is connected (check tokens)
- [ ] Hubspot is connected (check tokens)
- [ ] Emails are being ingested (check emails collection)
- [ ] Recent emails exist (check created_at)
- [ ] Emails are unprocessed (check processed_for_proactive)
- [ ] Manual trigger works (test endpoint)
- [ ] Contact creation works (test Hubspot API)
- [ ] Email sending works (test Gmail API)

## 🚀 **Next Steps**

1. **Run manual trigger** to test processing
2. **Check server logs** for any errors
3. **Verify integrations** are working
4. **Test individual components** if needed
5. **Send new test email** if all looks good

The unknown emailer test should work automatically, but these debugging steps will help identify and fix any issues!
