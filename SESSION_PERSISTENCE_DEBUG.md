# Debug Session Persistence Between OAuth Redirects

## Problem
Session is lost between Google OAuth callback and HubSpot OAuth redirect, causing "Session missing. Login with Google first." error.

## Root Cause
Cross-domain cookie issue: Session cookie is not being sent with the request to `/auth/hubspot` after the Google OAuth callback.

## Current OAuth Flow
1. **Google OAuth** → Sets session ✅
2. **Redirect to HubSpot OAuth** → Session lost ❌
3. **HubSpot OAuth** → No session found ❌

## Debugging Added

### 1. Session Check in HubSpot OAuth ✅
```javascript
console.log('HubSpot OAuth check:', {
    sessionId: req.sessionID,
    userId: req.session?.userId,
    cookies: req.headers.cookie
});
```

### 2. Session Save Before Redirect ✅
```javascript
req.session.save((err) => {
    if (err) {
        console.error('Session save error before HubSpot redirect:', err);
    } else {
        console.log('Session saved before HubSpot redirect');
    }
});
```

### 3. Cookie Setting in HubSpot OAuth ✅
```javascript
res.cookie('sid', req.sessionID, {
    httpOnly: true,
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
});
```

## Expected Logs

### Successful Flow:
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
HubSpot not connected, redirecting to connect it
Session saved before HubSpot redirect
HubSpot OAuth check: { sessionId: '...', userId: '...', cookies: 'sid=...' }
HubSpot OAuth URL: https://app.hubspot.com/oauth/authorize?...
```

### Failed Flow (Current Issue):
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
HubSpot not connected, redirecting to connect it
Session saved before HubSpot redirect
HubSpot OAuth check: { sessionId: '...', userId: undefined, cookies: undefined }
No session found, redirecting to Google OAuth
```

## Troubleshooting Steps

### Step 1: Check Session Persistence
Look for these logs in the backend:
- Session set during Google OAuth callback
- Session saved successfully
- Session check during HubSpot OAuth

### Step 2: Check Cookie Transmission
The key issue is whether the session cookie is being sent:
- `cookies: 'sid=...'` ✅ (cookie being sent)
- `cookies: undefined` ❌ (cookie not being sent)

### Step 3: Test Session Endpoints
1. **After Google OAuth**: Visit `/debug-session`
2. **Check session state**: Should show session data
3. **Test cookie sending**: Should show cookies in request

## Common Solutions

### Solution 1: Cookie Domain Issues
If cookies are not being sent:
1. **Check cookie settings**: `sameSite: 'none'`, `secure: true`
2. **Verify HTTPS**: Both domains must use HTTPS
3. **Check browser settings**: Disable third-party cookie blocking

### Solution 2: Session Store Issues
If session is not persisting:
1. **Check MongoDB connection**: Visit `/test-db`
2. **Verify session store**: Check if sessions are being stored
3. **Test session creation**: Visit `/set-test-session`

### Solution 3: Redirect Timing
If session is lost during redirect:
1. **Add delays**: Wait for session save before redirect
2. **Use JavaScript redirect**: Instead of server redirect
3. **Store session in URL**: Pass session ID in redirect URL

## Alternative Solutions

### If Cross-Domain Cookies Don't Work:

1. **Use JWT Tokens**:
   ```javascript
   // Store JWT in localStorage instead of session
   const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
   res.redirect(`${process.env.FRONTEND_URL}/chat?token=${token}`);
   ```

2. **Use URL Parameters**:
   ```javascript
   // Pass session ID in redirect URL
   res.redirect(`${process.env.BACKEND_URL}/auth/hubspot?sessionId=${req.sessionID}`);
   ```

3. **Use Same Domain**:
   - Deploy frontend and backend on same domain
   - Use subdomains like `app.yourdomain.com` and `api.yourdomain.com`

## Next Steps

1. **Deploy the session persistence fixes**
2. **Test the OAuth flow** and check logs
3. **Verify session persistence** between redirects
4. **If still failing, consider JWT approach**

The key is to ensure the session cookie is being sent with the request to `/auth/hubspot`. The debugging will show us exactly what's happening with the session and cookies.
