# Dynamic Timezone Testing Guide

## 🌍 **Dynamic Timezone Features**

The system now supports dynamic timezone handling with multiple fallback options:

### **1. User-Specific Timezone**
- Users can set their preferred timezone
- Stored in user profile: `user.timezone`
- Used for all date/time parsing

### **2. System Timezone Detection**
- Automatically detects system timezone
- Fallback when user timezone not set
- Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`

### **3. UTC Fallback**
- Final fallback to UTC
- Ensures system always works

## 🧪 **Testing Dynamic Timezone**

### **Test 1: User Timezone Setting**
```bash
# Set user timezone
curl -X PUT http://localhost:4000/timezone \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"timezone": "America/New_York"}'
```

**Expected Response:**
```json
{
  "success": true,
  "timezone": "America/New_York",
  "currentTime": "2024-01-XX...",
  "message": "Timezone updated successfully"
}
```

### **Test 2: Get User Timezone**
```bash
# Get current timezone
curl http://localhost:4000/timezone \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "timezone": "America/New_York",
  "currentTime": "2024-01-XX...",
  "availableTimezones": ["UTC", "America/New_York", ...]
}
```

### **Test 3: Date Parsing with Different Timezones**

#### **Test with New York Timezone:**
1. Set timezone to `America/New_York`
2. Send: `"Schedule a meeting for tomorrow at 2pm"`
3. **Expected**: Meeting scheduled in New York time

#### **Test with London Timezone:**
1. Set timezone to `Europe/London`
2. Send: `"Schedule a meeting for tomorrow at 2pm"`
3. **Expected**: Meeting scheduled in London time

#### **Test with Tokyo Timezone:**
1. Set timezone to `Asia/Tokyo`
2. Send: `"Schedule a meeting for tomorrow at 2pm"`
3. **Expected**: Meeting scheduled in Tokyo time

## 🔧 **API Endpoints**

### **GET /timezone**
- **Purpose**: Get user's current timezone
- **Response**: Current timezone, current time, available timezones

### **PUT /timezone**
- **Purpose**: Update user's timezone
- **Body**: `{"timezone": "America/New_York"}`
- **Response**: Success confirmation with new timezone

### **GET /timezone/available**
- **Purpose**: Get list of available timezones
- **Response**: Array of timezone strings

## 📝 **Frontend Testing**

### **Test 1: Timezone Configuration**
1. **Open timezone settings** in your frontend
2. **Select a timezone** (e.g., "America/New_York")
3. **Save the setting**
4. **Verify** the timezone is saved

### **Test 2: Date Parsing with User Timezone**
1. **Set timezone** to "America/New_York"
2. **Send message**: `"Schedule a meeting for tomorrow at 2pm"`
3. **Check calendar**: Meeting should be at 2pm New York time
4. **Change timezone** to "Europe/London"
5. **Send message**: `"Schedule a meeting for tomorrow at 2pm"`
6. **Check calendar**: Meeting should be at 2pm London time

### **Test 3: Timezone Display**
1. **Set timezone** to "Asia/Tokyo"
2. **Send message**: `"What time is it now?"`
3. **Expected**: Agent should respond with Tokyo time

## 🎯 **Expected Behaviors**

### **✅ Correct Timezone Handling:**
- User timezone is respected for all date parsing
- Meetings scheduled in user's timezone
- Time displays in user's timezone
- System timezone used as fallback

### **✅ Timezone Conversion:**
- Dates parsed in user's timezone
- Converted to UTC for storage
- Displayed in user's timezone

### **✅ Fallback Behavior:**
- If user timezone invalid → use system timezone
- If system timezone unavailable → use UTC
- System always works regardless of timezone

## 🚨 **Troubleshooting**

### **Common Issues:**

1. **"Invalid timezone" error**
   - **Solution**: Use valid timezone from available list
   - **Check**: `GET /timezone/available`

2. **Dates parsed in wrong timezone**
   - **Solution**: Verify user timezone is set correctly
   - **Check**: `GET /timezone`

3. **System timezone detection fails**
   - **Solution**: System will fallback to UTC
   - **Check**: Server logs for timezone detection errors

### **Debug Steps:**

1. **Check user timezone**: `GET /timezone`
2. **Verify timezone validity**: Check if timezone is in available list
3. **Test date parsing**: Send a scheduling message
4. **Check server logs**: Look for timezone-related errors

## 📊 **Test Results Template**

```
Timezone Test Results:
✅ User timezone setting: [PASS/FAIL]
✅ Timezone retrieval: [PASS/FAIL]
✅ Date parsing with user timezone: [PASS/FAIL]
✅ Timezone conversion: [PASS/FAIL]
✅ Fallback behavior: [PASS/FAIL]

Issues Found: [List any issues]
```

## 🌍 **Available Timezones**

The system supports these timezones:
- UTC
- America/New_York
- America/Chicago
- America/Denver
- America/Los_Angeles
- Europe/London
- Europe/Paris
- Europe/Berlin
- Asia/Tokyo
- Asia/Shanghai
- Asia/Kolkata
- Asia/Colombo
- Australia/Sydney
- Australia/Melbourne
- Pacific/Auckland

This dynamic timezone system ensures that all users get accurate date/time handling regardless of their location!
