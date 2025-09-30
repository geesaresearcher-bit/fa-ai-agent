# 📧 Sample Test Email for Unknown Emailer Test

## 🧪 **Test Email Content**

Send this email to yourself from an unknown email address to test the Unknown Emailer functionality:

### **From:** `test.unknown.sender@gmail.com`
### **To:** `your.email@gmail.com` (your actual email)
### **Subject:** `Inquiry about Financial Planning Services`

---

**Email Body:**

```
Dear Financial Advisor,

I hope this email finds you well. I am writing to inquire about your financial planning services.

I am a 35-year-old professional looking to get my finances in order and plan for retirement. I have heard great things about your services and would like to schedule a consultation to discuss my financial goals.

Some of my key concerns include:
- Retirement planning
- Investment strategies
- Tax optimization
- Estate planning

I would appreciate it if you could let me know your availability for a consultation in the coming weeks. I am flexible with timing and can work around your schedule.

Thank you for your time and consideration. I look forward to hearing from you soon.

Best regards,
John Smith
Phone: (555) 123-4567
Email: test.unknown.sender@gmail.com
```

---

## 🔧 **How to Send This Test Email:**

### **Method 1: Gmail (Recommended)**
1. **Open Gmail** in your browser
2. **Click "Compose"** to create a new email
3. **From:** Use a different email address (like `test.unknown.sender@gmail.com`)
4. **To:** Your actual email address
5. **Subject:** `Inquiry about Financial Planning Services`
6. **Body:** Copy the email content above
7. **Send** the email

### **Method 2: Create Temporary Email**
1. **Go to** [10minutemail.com](https://10minutemail.com) or [temp-mail.org](https://temp-mail.org)
2. **Copy the temporary email address**
3. **Use that address** to send the test email
4. **Send to your actual email**

### **Method 3: Use Another Email Provider**
1. **Create a new email** with Yahoo, Outlook, or another provider
2. **Use that address** to send the test email
3. **Send to your actual email**

## ⏰ **Testing Timeline:**

### **Step 1: Send Email (0 minutes)**
- Send the test email from unknown address
- Wait for email to arrive in your inbox

### **Step 2: Wait for Processing (2 minutes)**
- Worker runs every 2 minutes
- Check server logs for processing activity
- Look for: `[proactive] Unknown sender detected: test.unknown.sender@gmail.com`

### **Step 3: Check Results (5 minutes)**
- **Check Hubspot** for new contact "John Smith"
- **Check unknown sender's inbox** for welcome email
- **Check server logs** for success messages

## 🔍 **What to Look For:**

### **✅ Success Indicators:**
- Server logs show: `[proactive] Processing emails for user: [user_id]`
- Server logs show: `[proactive] Unknown sender detected: test.unknown.sender@gmail.com`
- Server logs show: `[proactive] Email marked as processed`
- **Hubspot**: New contact "John Smith" created
- **Unknown sender's inbox**: Welcome email received
- **Welcome email content**: "Thank you for reaching out..."

### **❌ Failure Indicators:**
- No server logs for proactive processing
- No contact created in Hubspot
- No welcome email sent
- Error messages in server logs

## 🚨 **Troubleshooting:**

### **If No Processing Happens:**
1. **Check worker is running**: Look for `Processing X users...` in server logs
2. **Check Gmail integration**: Verify Gmail is connected
3. **Check Hubspot integration**: Verify Hubspot is connected
4. **Check email ingestion**: Verify email is stored in database

### **If Processing Fails:**
1. **Check server logs** for specific error messages
2. **Run manual test**: `node test_unknown_emailer_manual.js`
3. **Check integrations** are working properly
4. **Verify email format** is correct

## 📊 **Expected Results:**

### **Server Logs:**
```
[proactive] Processing emails for user: 68da0805c67f522fa24c1486
[proactive] Found 1 recent emails to process
[proactive] Processing email from: test.unknown.sender@gmail.com, subject: Inquiry about Financial Planning Services
[proactive] Result: { ok: true, isUnknownSender: true, contactCreated: true, welcomeEmailSent: true }
[proactive] Unknown sender detected: test.unknown.sender@gmail.com
[proactive] Email marked as processed: 507f1f77bcf86cd799439011
```

### **Hubspot Contact:**
- **Name**: John Smith
- **Email**: test.unknown.sender@gmail.com
- **Note**: "Email received: Inquiry about Financial Planning Services\nContent: Dear Financial Advisor..."
- **Status**: New contact created

### **Welcome Email to Unknown Sender:**
- **To**: test.unknown.sender@gmail.com
- **Subject**: "Thank you for reaching out"
- **Content**: "Hi John, Thank you for reaching out to me. I've received your email and will get back to you soon..."

## 🎯 **Success Criteria:**

The test is successful when:
1. ✅ Unknown sender is automatically detected
2. ✅ Hubspot contact is created automatically
3. ✅ Welcome email is sent automatically
4. ✅ Email is marked as processed
5. ✅ No manual intervention required

## 🔄 **Repeat Test:**

To test again:
1. **Delete the contact** from Hubspot
2. **Send another test email** from a different unknown address
3. **Wait 2 minutes** for processing
4. **Check results** again

This sample email is designed to trigger all the Unknown Emailer functionality and should work with the fixes I made to the code!
