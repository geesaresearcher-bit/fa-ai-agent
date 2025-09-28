# Advanced Session Debugging

## Current Status
✅ **Cookie is being set** - Cross-domain issue fixed  
❌ **Still on login page** - Session not being retrieved properly  

## Debugging Steps

### Step 1: Test Session Endpoints
Visit these URLs directly in your browser:

1. **Health check**: `https://your-backend-url/health`
2. **Cookie test**: `https://your-backend-url/test-cookie`
3. **Session debug**: `https://your-backend-url/debug-session`
4. **Auth check**: `https://your-backend-url/auth/me`

### Step 2: Check Backend Logs
Look for these patterns in your backend logs:

**During OAuth callback:**
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
```

**During /auth/me check:**
```
[/me] Session check: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] Session exists, checking store...
[/me] Session reloaded: { sessionId: '...', userId: '...' }
```

### Step 3: Check Browser Cookies
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Check Cookies for your domain
4. Look for `sid` cookie with value

### Step 4: Test Session Persistence
1. **Complete OAuth flow**
2. **Check if session cookie is set**
3. **Visit `/debug-session` endpoint**
4. **Check if session ID matches**

## Common Issues

### Issue 1: Session ID Mismatch
**Symptoms**: Different session IDs between OAuth callback and /auth/me
**Cause**: Session not being properly stored/retrieved from MongoDB
**Solution**: Check MongoDB connection and session store

### Issue 2: Session Store Not Working
**Symptoms**: Session exists in memory but not in database
**Cause**: MongoDB connection issues or session store configuration
**Solution**: Verify MongoDB connection and session store settings

### Issue 3: Cookie Domain Issues
**Symptoms**: Cookie is set but not being sent with requests
**Cause**: Domain/path mismatch in cookie settings
**Solution**: Check cookie domain and path settings

## Debugging Commands

### Check MongoDB Sessions
If you have MongoDB access, check the sessions collection:
```javascript
db.sessions.find().pretty()
```

### Check Session Store
Look for sessions with your session ID in the database.

## Expected Flow

### Successful Authentication:
1. **OAuth callback**: Sets session with userId
2. **Session saved**: Stored in MongoDB
3. **Frontend request**: Sends session cookie
4. **Backend retrieval**: Finds session in store
5. **User authenticated**: Returns user data

### Current Issue:
1. **OAuth callback**: ✅ Sets session with userId
2. **Session saved**: ✅ Stored in MongoDB
3. **Frontend request**: ✅ Sends session cookie
4. **Backend retrieval**: ❌ Session not found or different ID
5. **User authenticated**: ❌ Returns 401

## Quick Fixes to Try

### Fix 1: Check Session Store Connection
Add this to your backend to test MongoDB connection:
```javascript
// Test MongoDB connection
app.get('/test-db', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.collection('sessions').findOne({});
    res.json({ connected: true, sample: result });
  } catch (error) {
    res.json({ connected: false, error: error.message });
  }
});
```

### Fix 2: Force Session Reload
The session reload might help if there's a timing issue:
```javascript
req.session.reload((err) => {
  if (err) {
    console.log('Session reload error:', err);
  } else {
    console.log('Session reloaded successfully');
  }
});
```

### Fix 3: Check Session Store Configuration
Make sure the session store is properly configured:
```javascript
store: MongoStore.create({
  mongoUrl: process.env.MONGODB_URI,
  dbName: process.env.DB_NAME || 'fa_agent',
  collectionName: 'sessions',
  stringify: false,
  touchAfter: 24 * 3600
})
```

## Next Steps

1. **Deploy the enhanced debugging**
2. **Test the OAuth flow again**
3. **Check the new debug logs**
4. **Visit `/debug-session` endpoint**
5. **Compare session IDs between OAuth and /auth/me**

The key is to see if the session ID is consistent between the OAuth callback and the /auth/me check. If they're different, we have a session store issue. If they're the same but userId is missing, we have a session data issue.
