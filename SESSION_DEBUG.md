# Debug Session Authentication Issue

## Problem Identified
The authentication is failing with `401 {"error":"Not logged in"}` because the session isn't being established properly between OAuth redirects.

## Debugging Added

### 1. Backend Session Logging ✅
- Added detailed logging to `/auth/me` endpoint
- Shows session ID, user ID, and session data
- Logs when session is set during OAuth callback

### 2. Session Configuration Fix ✅
- Fixed `secure: true` for production HTTPS
- Added session debugging middleware
- Enhanced OAuth callback logging

### 3. Frontend Retry Logic ✅
- Added retry mechanism for authentication checks
- Enhanced error logging with detailed messages

## How to Debug

### Step 1: Check Backend Logs
1. Go to your Render dashboard
2. Navigate to your backend service
3. Go to "Logs" tab
4. Try the login flow and watch for these logs:

**During OAuth callback:**
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
```

**During /auth/me check:**
```
Session middleware: { sessionId: '...', userId: '...', cookies: '...' }
[/me] Session check: { sessionId: '...', userId: '...', session: {...} }
```

### Step 2: Check Frontend Console
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try login flow and look for:

**Successful flow:**
```
Making request to: https://your-backend-url/auth/me
Response status: 200
Auth response: {email: "...", hasGoogle: true, hasHubSpot: true}
User authenticated: {...}
```

**Failed flow:**
```
Making request to: https://your-backend-url/auth/me
Response status: 401
Auth error: {"error":"Not logged in"}
Authentication failed: Error: unauthorized: 401 {"error":"Not logged in"}
```

## Common Issues and Solutions

### Issue 1: Session Not Persisting
**Symptoms**: Session is set in OAuth callback but not found in /auth/me
**Causes**:
- CORS issues preventing cookies
- Session store not working
- Cookie domain/path issues

**Solutions**:
1. **Check CORS configuration**:
   ```javascript
   // In server/index.js
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true  // This is crucial!
   }));
   ```

2. **Verify session store**:
   - Check MongoDB connection
   - Verify sessions collection exists
   - Check session store logs

### Issue 2: Cookie Not Being Set
**Symptoms**: No cookies in browser for the domain
**Causes**:
- `secure: true` on HTTP (should only be true for HTTPS)
- Domain/path mismatch
- SameSite policy issues

**Solutions**:
1. **Check cookie settings**:
   ```javascript
   cookie: {
     httpOnly: true,
     sameSite: 'lax',
     secure: process.env.NODE_ENV === 'production', // Only true for HTTPS
     maxAge: 7 * 24 * 60 * 60 * 1000
   }
   ```

2. **Verify domain settings**:
   - Frontend and backend should be on same domain or properly configured CORS

### Issue 3: OAuth Redirect Breaking Session
**Symptoms**: Session works in OAuth callback but lost on redirect to frontend
**Causes**:
- Cross-domain redirects
- Session store not persisting
- Cookie not being sent with requests

**Solutions**:
1. **Check redirect URLs**:
   - Google callback should go to backend
   - Final redirect should go to frontend
   - Ensure proper session handling in between

2. **Verify session persistence**:
   - Check MongoDB sessions collection
   - Verify session ID is consistent

## Testing Steps

### 1. Test Session Creation
1. Complete OAuth flow
2. Check backend logs for session creation
3. Verify session exists in MongoDB

### 2. Test Session Retrieval
1. After OAuth, check if session persists
2. Test `/auth/me` endpoint directly
3. Check browser cookies

### 3. Test Cross-Domain Issues
1. Verify CORS is configured correctly
2. Check that cookies are being sent
3. Ensure same domain or proper CORS setup

## Quick Fixes

### If session is not persisting:
1. **Check MongoDB connection** in backend logs
2. **Verify SESSION_SECRET** is set
3. **Check CORS configuration** includes `credentials: true`

### If cookies are not being set:
1. **Check cookie settings** (secure, sameSite, etc.)
2. **Verify domain configuration**
3. **Test with different browsers**

### If OAuth flow breaks:
1. **Check OAuth provider settings**
2. **Verify callback URLs**
3. **Check environment variables**

## Environment Variables to Verify

### Backend (Critical for sessions):
- [ ] `SESSION_SECRET` - Must be set and secure
- [ ] `MONGODB_URI` - Must be correct for session store
- [ ] `FRONTEND_URL` - Must match your frontend domain
- [ ] `NODE_ENV=production` - For proper cookie settings

### OAuth Providers:
- [ ] Google OAuth callback URL
- [ ] HubSpot OAuth callback URL
- [ ] All OAuth credentials are correct
