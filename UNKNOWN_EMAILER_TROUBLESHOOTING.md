# 🔍 Unknown Emailer Test Troubleshooting

## 🚨 **Issue**: Unknown Emailer Contact Creation Not Working

The test should automatically create Hubspot contacts and send welcome emails when someone emails you from an unknown address.

## 🔧 **Quick Diagnosis**

### **Step 1: Run Simple Test**
```bash
node test_unknown_emailer_simple.js
```

This will check:
- ✅ User exists
- ✅ Google integration connected
- ✅ Hubspot integration connected
- ✅ Recent emails found
- ✅ Worker status

### **Step 2: Manual Trigger**
```bash
curl -X POST http://localhost:4000/test/trigger-unknown-emailer \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🐛 **Common Issues & Solutions**

### **Issue 1: No Recent Emails Found**
**Symptoms:** `Found 0 recent emails to process`

**Causes:**
1. **Gmail not connected** - No Google tokens
2. **Gmail ingestion not working** - Emails not being stored
3. **All emails already processed** - `processed_for_proactive: true`
4. **No emails received** - No emails in last 24 hours

**Solutions:**
1. **Connect Gmail:**
   - Go to frontend
   - Click "Connect Gmail"
   - Authorize access

2. **Check Gmail Ingestion:**
   - Look for Gmail API calls in server logs
   - Check if emails are being stored in database
   - Verify Gmail tokens are valid

3. **Reset Processing Status:**
   ```bash
   # Connect to MongoDB and run:
   db.emails.updateMany(
     {user_id: ObjectId("YOUR_USER_ID")},
     {$set: {processed_for_proactive: false}}
   )
   ```

4. **Send Test Email:**
   - Send an email to yourself from unknown address
   - Wait 2 minutes for worker to process

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
   - Look for worker logs in server console
   - Verify worker is running every 2 minutes
   - Look for messages like: `[worker] Processing user: [user_id]`

2. **Restart Server:**
   - Stop and restart the server
   - Check for worker startup messages

### **Issue 5: Emails Already Processed**
**Symptoms:** All emails have `processed_for_proactive: true`

**Solutions:**
1. **Reset Processing Status:**
   ```bash
   # Connect to MongoDB and run:
   db.emails.updateMany(
     {user_id: ObjectId("YOUR_USER_ID")},
     {$set: {processed_for_proactive: false}}
   )
   ```

2. **Send New Test Email:**
   - Send a new email from unknown address
   - Wait for worker to process

## 🧪 **Testing Steps**

### **Step 1: Check Prerequisites**
```bash
# Run the simple test
node test_unknown_emailer_simple.js
```

**Expected Output:**
```
✅ User found
✅ Google tokens found
✅ Hubspot tokens found
Found X recent emails
```

### **Step 2: Manual Trigger Test**
```bash
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

### **Step 3: Verify Results**
1. **Check Hubspot** for new contact
2. **Check unknown sender's inbox** for welcome email
3. **Check server logs** for success messages

## 🔧 **Manual Testing**

### **Test 1: Send Test Email**
1. **Send an email** to yourself from an unknown address (like `test@example.com`)
2. **Wait 2 minutes** for worker to process
3. **Check server logs** for processing activity

### **Test 2: Manual Trigger**
1. **Run manual trigger:**
   ```bash
   curl -X POST http://localhost:4000/test/trigger-unknown-emailer \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
2. **Check response** for processing results
3. **Verify actions** were taken

### **Test 3: Check Database**
```bash
# Check emails collection
db.emails.find({user_id: ObjectId("YOUR_USER_ID")}).sort({created_at: -1}).limit(5)

# Check hubspot_contacts collection
db.hubspot_contacts.find({user_id: ObjectId("YOUR_USER_ID")}).sort({created_at: -1}).limit(5)
```

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

## 🚀 **Quick Fixes**

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

## 🎯 **Next Steps**

1. **Run simple test** to check prerequisites
2. **Check server logs** for any errors
3. **Verify integrations** are working
4. **Test manual trigger** if needed
5. **Send new test email** if all looks good

The unknown emailer test should work automatically, but these steps will help identify and fix any issues!
