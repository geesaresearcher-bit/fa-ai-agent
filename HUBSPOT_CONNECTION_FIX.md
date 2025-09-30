# 🔧 Hubspot Connection Fix - 401 Error

## 🚨 **Issue Identified:**
The Unknown Emailer test is failing because of a **Hubspot authentication error (401)**. The system can't connect to Hubspot to check if senders are known contacts or create new ones.

## 🔍 **Error Analysis:**
```
[proactive] Result: { ok: false, error: 'Request failed with status code 401' }
[proactive] Error processing email: Request failed with status code 401
```

**401 Error means**: Unauthorized - Hubspot API credentials are invalid or expired.

## 🛠️ **How to Fix:**

### **Step 1: Check Hubspot Integration**
1. **Go to your frontend application**
2. **Look for Hubspot connection status**
3. **Check if Hubspot is connected**

### **Step 2: Reconnect Hubspot**
1. **Disconnect Hubspot** (if connected)
2. **Reconnect Hubspot** with fresh credentials
3. **Verify the connection** is successful

### **Step 3: Check Hubspot Tokens**
```bash
# Check if user has valid Hubspot tokens
# Look in MongoDB for user document
db.users.findOne({_id: ObjectId("68da0805c67f522fa24c1486")})
```

**Look for:**
- `hubspot_tokens` field exists
- `hubspot_tokens.access_token` is present
- `hubspot_tokens.refresh_token` is present

### **Step 4: Test Hubspot Connection**
```bash
# Test Hubspot API access
curl -X GET "https://api.hubapi.com/crm/v3/objects/contacts" \
  -H "Authorization: Bearer YOUR_HUBSPOT_ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

## 🔧 **Quick Fixes:**

### **Fix 1: Reconnect Hubspot**
1. **Go to frontend**
2. **Disconnect Hubspot**
3. **Reconnect Hubspot**
4. **Verify connection**

### **Fix 2: Check Environment Variables**
Make sure these are set in your `.env` file:
```
HUBSPOT_CLIENT_ID=your_client_id
HUBSPOT_CLIENT_SECRET=your_client_secret
HUBSPOT_REDIRECT_URI=your_redirect_uri
```

### **Fix 3: Refresh Tokens**
If tokens are expired, the system should automatically refresh them. If not:
1. **Disconnect Hubspot**
2. **Reconnect Hubspot**
3. **Get fresh tokens**

## 🧪 **Test After Fix:**

### **Step 1: Check Hubspot Connection**
```bash
# Run this to test Hubspot connection
node test_unknown_emailer_manual.js
```

**Expected Output:**
```
✅ User found
✅ Google tokens found
✅ Hubspot tokens found
✅ Both integrations connected
```

### **Step 2: Test Unknown Emailer**
1. **Send test email** from unknown address
2. **Wait 2 minutes** for processing
3. **Check server logs** for success

**Expected Logs:**
```
[proactive] Processing emails for user: 68da0805c67f522fa24c1486
[proactive] Found X recent emails to process
[proactive] Processing email from: test@example.com, subject: Test Email
[proactive] Result: { ok: true, isUnknownSender: true, contactCreated: true, welcomeEmailSent: true }
[proactive] Unknown sender detected: test@example.com
```

## 🚨 **Common Hubspot 401 Issues:**

### **Issue 1: Expired Tokens**
**Symptoms**: 401 error on API calls
**Solution**: Reconnect Hubspot to get fresh tokens

### **Issue 2: Invalid Credentials**
**Symptoms**: 401 error on API calls
**Solution**: Check Hubspot app credentials in environment variables

### **Issue 3: Wrong Scopes**
**Symptoms**: 401 error on API calls
**Solution**: Ensure Hubspot app has correct scopes (contacts, emails)

### **Issue 4: Rate Limiting**
**Symptoms**: 401 error on API calls
**Solution**: Wait and retry, or check Hubspot rate limits

## 📊 **Expected Results After Fix:**

### **✅ Working Correctly:**
- Server logs show: `[proactive] Unknown sender detected: [email]`
- Hubspot contact created successfully
- Welcome email sent successfully
- No 401 errors in logs

### **❌ Still Not Working:**
- 401 errors persist
- Hubspot connection fails
- No contact creation
- No welcome email

## 🔄 **Alternative Testing:**

If Hubspot connection can't be fixed immediately, you can test the email processing logic without Hubspot:

### **Test Email Processing Only:**
```bash
# Test just the email processing logic
node test_unknown_emailer_manual.js
```

This will show you if the email processing works, even if Hubspot connection fails.

## 🎯 **Success Criteria:**

The Unknown Emailer test is working when:
1. ✅ No 401 errors in server logs
2. ✅ Hubspot contact created successfully
3. ✅ Welcome email sent successfully
4. ✅ Email marked as processed

## 🚀 **Next Steps:**

1. **Fix Hubspot connection** (reconnect in frontend)
2. **Test the connection** (run manual test)
3. **Send test email** (from unknown address)
4. **Verify results** (check Hubspot and welcome email)

The 401 error is the root cause of the Unknown Emailer test failure. Once Hubspot is properly connected, the test should work correctly!
