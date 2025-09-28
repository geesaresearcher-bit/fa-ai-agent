# Test Steps After Database Reset

## Current Situation
- You deleted the user from the database
- Google is asking for account selection (normal behavior)
- Need to test if the session is being properly created after OAuth

## Testing Steps

### Step 1: Test Database Connection
Visit: `https://your-backend-url/test-db`

**Expected Response:**
```json
{
  "connected": true,
  "ping": { "ok": 1 },
  "sessionsCount": 0,
  "usersCount": 0,
  "message": "Database connection successful"
}
```

### Step 2: Test Session Creation
Visit: `https://your-backend-url/set-test-session`

**Expected Response:**
```json
{
  "message": "Test session set",
  "sessionId": "...",
  "userId": "test-user-123"
}
```

### Step 3: Test OAuth Flow
1. **Go to your frontend**
2. **Click "Continue with Google"**
3. **Select your Google account**
4. **Complete the OAuth flow**
5. **Check the backend logs** for:
   ```
   [/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
   Session saved successfully
   ```

### Step 4: Check Session Persistence
After OAuth, check if the session is working:
1. **Visit `/debug-session`** endpoint
2. **Check if session cookie is set**
3. **Verify session data**

## What to Look For

### Successful OAuth Flow:
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
Session middleware: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] Session check: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] User found: { email: '...', hasGoogle: true, hasHubSpot: true }
```

### If Session Still Fails:
```
[/me] Session reload error: Error: failed to load session
[/me] Attempting to find session in database...
[/me] Found session in database: ...
```

## Next Steps

1. **Test database connection** first
2. **Test session creation** 
3. **Complete OAuth flow** and check logs
4. **Verify session persistence**

The key is to see if the session is being created and stored properly after the OAuth flow.
