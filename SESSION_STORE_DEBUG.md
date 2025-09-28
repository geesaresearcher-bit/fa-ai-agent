# Debug Session Store Issues

## Problem Identified
The session reload is failing with MongoDB connection errors, indicating issues with the session store.

**Error**: `Error: failed to load session` from `connect-mongo`

## Debugging Steps

### Step 1: Test Database Connection
Visit: `https://your-backend-url/test-db`

**Expected Response:**
```json
{
  "connected": true,
  "ping": { "ok": 1 },
  "sessionsCount": 0,
  "usersCount": 1,
  "message": "Database connection successful"
}
```

**If Error:**
```json
{
  "connected": false,
  "error": "Connection failed",
  "stack": "..."
}
```

### Step 2: Check Session Store Configuration
The session store might be misconfigured. Check these settings:

1. **MongoDB URI**: Must be correct and accessible
2. **Database Name**: Must match your database
3. **Collection Name**: Must be 'sessions'
4. **TTL Settings**: Must be properly configured

### Step 3: Test Session Creation
Visit: `https://your-backend-url/set-test-session`

**Expected Response:**
```json
{
  "message": "Test session set",
  "sessionId": "...",
  "userId": "test-user-123"
}
```

**If Error:**
```json
{
  "error": "Session save failed",
  "details": "..."
}
```

## Common Issues and Solutions

### Issue 1: MongoDB Connection Failed
**Symptoms**: Database test fails
**Causes**:
- Incorrect `MONGODB_URI`
- Network connectivity issues
- Database authentication problems

**Solutions**:
1. **Check MongoDB URI format**:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/database
   ```

2. **Verify database access**:
   - Check if database is accessible
   - Verify credentials are correct
   - Check network connectivity

3. **Test with MongoDB Atlas**:
   - Use MongoDB Atlas free tier
   - Ensure IP whitelist includes Render IPs

### Issue 2: Session Store Configuration
**Symptoms**: Session save fails
**Causes**:
- Incorrect store configuration
- Collection permissions
- TTL settings

**Solutions**:
1. **Check store configuration**:
   ```javascript
   store: MongoStore.create({
     mongoUrl: process.env.MONGODB_URI,
     dbName: process.env.DB_NAME || 'fa_agent',
     collectionName: 'sessions',
     stringify: false,
     touchAfter: 24 * 3600,
     autoRemove: 'native',
     autoRemoveInterval: 10,
     ttl: 7 * 24 * 60 * 60
   })
   ```

2. **Verify collection permissions**:
   - Check if sessions collection exists
   - Verify write permissions
   - Check TTL index

### Issue 3: Session Reload Fails
**Symptoms**: Session reload error
**Causes**:
- Session data corruption
- Store connection issues
- TTL expiration

**Solutions**:
1. **Check session data**:
   - Verify session exists in database
   - Check session format
   - Verify TTL settings

2. **Fallback mechanism**:
   - Direct database lookup
   - Session reconstruction
   - Error handling

## Enhanced Debugging

### Database Test Endpoint
The `/test-db` endpoint will show:
- MongoDB connection status
- Database ping result
- Sessions collection access
- Users collection access

### Session Test Endpoint
The `/set-test-session` endpoint will show:
- Session creation success
- Cookie setting
- Session store functionality

### Fallback Mechanism
If session reload fails:
1. **Direct database lookup** by session ID
2. **Session reconstruction** from database
3. **Error handling** for missing sessions

## Quick Fixes

### Fix 1: Check Environment Variables
```bash
# Verify these are set correctly:
MONGODB_URI=mongodb+srv://...
DB_NAME=fa_agent
SESSION_SECRET=your-secret-key
```

### Fix 2: Test MongoDB Connection
1. **Visit `/test-db`** endpoint
2. **Check connection status**
3. **Verify database access**

### Fix 3: Test Session Store
1. **Visit `/set-test-session`** endpoint
2. **Check session creation**
3. **Verify cookie setting**

## Alternative Solutions

### If MongoDB continues to fail:

1. **Use in-memory session store** (temporary):
   ```javascript
   // Replace MongoStore with MemoryStore for testing
   const MemoryStore = require('memorystore')(session);
   store: new MemoryStore({ checkPeriod: 86400000 })
   ```

2. **Use Redis session store**:
   ```javascript
   const RedisStore = require('connect-redis')(session);
   store: new RedisStore({ url: process.env.REDIS_URL })
   ```

3. **Use JWT tokens instead of sessions**:
   - No session store dependency
   - Stateless authentication
   - Easier to debug

## Next Steps

1. **Test database connection** with `/test-db`
2. **Test session creation** with `/set-test-session`
3. **Check session store** configuration
4. **Verify MongoDB access** and permissions
5. **Consider alternative** session stores if MongoDB fails

The key is to identify whether the issue is with MongoDB connection, session store configuration, or session data format.
