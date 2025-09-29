# Debug Session Store Mismatch Issue

## Problem Identified
Session ID mismatch between request and cookie, causing session store to fail.

**Evidence from logs:**
- Session ID in request: `jv8qQ1VUumLF6ri_rZpqDruOA-9ujbVf`
- Cookie session ID: `W9KUiSqN_qjzttfrE2K1EyLg9saBej_m`
- Result: `userId: undefined`

## Root Cause
The session store is not properly retrieving session data because of ID mismatch. This suggests:
1. **Session store configuration issue**
2. **MongoDB connection problem**
3. **Session data format issue**

## Debugging Added

### 1. Enhanced Session Logging ✅
```javascript
console.log('HubSpot OAuth check:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    cookies: req.headers.cookie,
    session: req.session
});
```

### 2. Session Reload Attempt ✅
```javascript
req.session.reload((err) => {
    if (err) {
        console.log('Session reload error:', err);
    } else {
        console.log('Session reloaded:', {
            sessionId: req.sessionID,
            userId: req.session?.userId
        });
    }
});
```

### 3. Direct Database Lookup ✅
```javascript
db.collection('sessions').findOne({ _id: req.sessionID })
    .then(sessionDoc => {
        if (sessionDoc && sessionDoc.session && sessionDoc.session.userId) {
            console.log('Found session in database:', sessionDoc.session.userId);
            req.session.userId = sessionDoc.session.userId;
        }
    });
```

## Expected Logs

### Successful Session Store:
```
HubSpot OAuth check: { sessionId: '...', userId: '...', cookies: 'sid=...' }
Proceeding with HubSpot OAuth for user: ...
```

### Failed Session Store (Current):
```
HubSpot OAuth check: { sessionId: '...', userId: undefined, cookies: 'sid=...' }
No session found, trying direct database lookup...
Found session in database: ...
Proceeding with HubSpot OAuth for user: ...
```

## Troubleshooting Steps

### Step 1: Check Session Store Configuration
The session store might be misconfigured. Check these settings:

1. **MongoDB Connection**: Visit `/test-db` endpoint
2. **Session Store Settings**: Verify MongoDB session store configuration
3. **Session Data Format**: Check if sessions are being stored correctly

### Step 2: Check Session Data in Database
If you have MongoDB access, check the sessions collection:
```javascript
db.sessions.find().pretty()
```

Look for:
- Session documents with correct format
- TTL settings
- Session data structure

### Step 3: Test Session Creation
Visit `/set-test-session` endpoint and check:
- Session is created successfully
- Session is stored in database
- Session can be retrieved

## Common Issues and Solutions

### Issue 1: Session Store Configuration
**Symptoms**: Session ID mismatch, session not found
**Causes**:
- Incorrect MongoDB connection
- Session store misconfiguration
- TTL settings

**Solutions**:
1. **Check MongoDB connection**: `/test-db` endpoint
2. **Verify session store settings**: MongoDB connection string
3. **Check TTL settings**: Session expiration

### Issue 2: Session Data Format
**Symptoms**: Session exists but data is missing
**Causes**:
- Incorrect session data structure
- Session serialization issues
- TTL expiration

**Solutions**:
1. **Check session data format**: Verify structure
2. **Check serialization**: Ensure proper JSON format
3. **Check TTL**: Verify session expiration

### Issue 3: Cross-Domain Issues
**Symptoms**: Session not persisting between redirects
**Causes**:
- Cookie domain issues
- CORS problems
- Session store connection

**Solutions**:
1. **Check cookie settings**: Domain, path, secure
2. **Verify CORS**: Proper cross-domain configuration
3. **Test session persistence**: Between requests

## Alternative Solutions

### If Session Store Continues to Fail:

1. **Use JWT Tokens**:
   ```javascript
   // Store JWT in localStorage instead of session
   const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
   res.redirect(`${process.env.FRONTEND_URL}/chat?token=${token}`);
   ```

2. **Use URL Parameters**:
   ```javascript
   // Pass user ID in redirect URL
   res.redirect(`${process.env.BACKEND_URL}/auth/hubspot?userId=${user._id}`);
   ```

3. **Use Memory Store** (temporary):
   ```javascript
   // Use in-memory session store for testing
   const MemoryStore = require('memorystore')(session);
   store: new MemoryStore({ checkPeriod: 86400000 })
   ```

## Next Steps

1. **Deploy the session store debugging**
2. **Test the OAuth flow** and check logs
3. **Check session store functionality** with `/test-db`
4. **If still failing, consider JWT approach**

The key is to identify whether the issue is with the session store configuration, MongoDB connection, or session data format. The debugging will show us exactly what's happening with the session store.
