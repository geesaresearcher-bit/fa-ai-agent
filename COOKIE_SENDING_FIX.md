# Fix Cookie Not Being Sent Issue

## Problem Identified
The session cookie is being set but not sent from frontend to backend requests.

**Evidence from logs:**
- OAuth callback: `sessionId: 'kjv6XAsej9paQt4gW8qB8vDdJkYBPSax'` ✅
- Frontend request: `sessionId: 'H6yw1byEoefyA8m2AlXGn7wr3UtVhbdW'` ❌
- No cookies sent: `cookies: undefined` ❌
- Session reload fails: `Error: failed to load session` ❌

## Root Cause
The cookie is being set on the backend domain, but when the frontend makes requests, the cookie is not being included due to cross-domain restrictions.

## Fixes Applied

### 1. Enhanced Cookie Configuration ✅
```javascript
cookie: {
  httpOnly: true,
  sameSite: 'none', // Allow cross-site cookies
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: undefined, // Don't restrict domain
  path: '/' // Ensure cookie is available for all paths
}
```

### 2. Manual Cookie Setting ✅
Added explicit cookie setting in OAuth callback:
```javascript
res.cookie('sid', req.sessionID, {
  httpOnly: true,
  sameSite: 'none',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
});
```

### 3. Test Endpoints ✅
- `/set-test-session` - Test cookie setting
- `/debug-session` - Test cookie retrieval
- Enhanced logging for cookie flow

## Testing the Fix

### Step 1: Deploy Changes
```bash
git add .
git commit -m "Fix cookie not being sent from frontend to backend"
git push origin main
```

### Step 2: Test Cookie Setting
1. **Visit test endpoint**: `https://your-backend-url/set-test-session`
2. **Check if cookie is set** in browser DevTools
3. **Visit debug endpoint**: `https://your-backend-url/debug-session`
4. **Check if cookie is sent** in the request

### Step 3: Test OAuth Flow
1. **Complete OAuth flow**
2. **Check if session cookie is set**
3. **Check if cookie is sent** with `/auth/me` request
4. **Verify session persistence**

## Expected Results

### Successful Flow:
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
Session middleware: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] Session check: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] User found: { email: '...', hasGoogle: true, hasHubSpot: true }
```

### Key Changes:
- **Manual cookie setting** in OAuth callback
- **Enhanced cookie configuration** with proper cross-domain settings
- **Test endpoints** for debugging cookie flow
- **Explicit path setting** for cookie availability

## Troubleshooting

### If cookies still not being sent:

1. **Check browser settings**:
   - Disable "Block third-party cookies"
   - Allow cookies for both domains
   - Check if cookies are being blocked

2. **Test with different browsers**:
   - Chrome, Firefox, Safari
   - Check if issue is browser-specific

3. **Check HTTPS requirements**:
   - Both domains must use HTTPS
   - `secure: true` requires HTTPS

4. **Verify cookie domain**:
   - Cookie should be set on backend domain
   - Should be sent with requests to backend

### If session still not persisting:

1. **Check cookie visibility**:
   - Open DevTools → Application → Cookies
   - Look for `sid` cookie on backend domain
   - Check cookie expiration and settings

2. **Test cookie sending**:
   - Use test endpoints to verify cookie flow
   - Check if cookie is included in requests

3. **Check session store**:
   - Verify MongoDB connection
   - Check if sessions are being stored
   - Verify session retrieval

## Alternative Solutions

### If cross-domain cookies still don't work:

1. **Use JWT tokens instead of sessions**:
   - Store JWT in localStorage
   - Send token in Authorization header
   - No cookie dependency

2. **Use subdomain approach**:
   - Deploy frontend and backend on same domain
   - Use subdomains like `app.yourdomain.com` and `api.yourdomain.com`

3. **Use proxy approach**:
   - Serve frontend from backend
   - No cross-domain issues

## Next Steps

1. **Deploy the changes**
2. **Test the OAuth flow**
3. **Check browser cookies**
4. **Verify cookie sending**
5. **If still failing, consider JWT approach**

The key fix is the manual cookie setting with proper cross-domain configuration, combined with explicit path and domain settings.
