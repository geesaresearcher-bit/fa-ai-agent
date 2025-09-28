# Fix Cross-Domain Cookie Issue

## Problem Identified
The session cookie is not being sent from frontend to backend due to cross-domain cookie restrictions.

**Evidence from logs:**
- OAuth callback sets session: `sessionId: 'xzwRJAbLYXjTn-priIrCshfdNp-6uTL6'`
- Frontend request has different session: `sessionId: 'fdTpIadypoCF29AlLEX9SpPM-l4svWL0'`
- No cookies being sent: `cookies: undefined`

## Fixes Applied

### 1. Enhanced CORS Configuration ✅
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));
```

### 2. Fixed Cookie Settings ✅
```javascript
cookie: {
  httpOnly: true,
  sameSite: 'none', // Allow cross-site cookies
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  domain: undefined // Don't restrict domain
}
```

### 3. Added Session Save ✅
- Explicitly save session after setting userId
- Added error handling for session save

### 4. Added Cookie Test Endpoint ✅
- Test endpoint: `/test-cookie`
- Helps debug cookie issues

## Testing the Fix

### Step 1: Deploy Changes
```bash
git add .
git commit -m "Fix cross-domain cookie issue for session persistence"
git push origin main
```

### Step 2: Test Cookie Functionality
1. **Test cookie endpoint**:
   - Visit: `https://your-backend-url/test-cookie`
   - Check if cookie is set in browser
   - Check backend logs for cookie information

2. **Test OAuth flow**:
   - Complete Google OAuth
   - Check if session cookie is set
   - Verify session persists in `/auth/me`

### Step 3: Check Browser Cookies
1. Open Developer Tools (F12)
2. Go to Application/Storage tab
3. Check Cookies for your domain
4. Look for `sid` cookie

## Expected Results After Fix

### Successful Flow:
```
[/google/callback] Session set: { sessionId: '...', userId: '...', email: '...' }
Session saved successfully
Session middleware: { sessionId: '...', userId: '...', cookies: 'sid=...' }
[/me] Session check: { sessionId: '...', userId: '...', session: {...} }
[/me] User found: { email: '...', hasGoogle: true, hasHubSpot: true }
```

### Key Changes:
- **sameSite: 'none'** - Allows cross-site cookies
- **Enhanced CORS** - Properly handles credentials
- **Session save** - Ensures session is persisted
- **Cookie test** - Helps debug cookie issues

## Troubleshooting

### If cookies still not working:

1. **Check browser settings**:
   - Disable "Block third-party cookies"
   - Allow cookies for your domain

2. **Test with different browsers**:
   - Chrome, Firefox, Safari
   - Check if issue is browser-specific

3. **Check HTTPS**:
   - Both frontend and backend must use HTTPS
   - `secure: true` requires HTTPS

4. **Verify domains**:
   - Frontend: `https://fa-ai-agent-frontend.onrender.com`
   - Backend: `https://fa-ai-agent-backend.onrender.com`

### If session still not persisting:

1. **Check MongoDB connection**:
   - Verify sessions are being stored
   - Check sessions collection in database

2. **Check environment variables**:
   - `SESSION_SECRET` must be set
   - `MONGODB_URI` must be correct
   - `FRONTEND_URL` must match your frontend domain

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
4. **Verify session persistence**
5. **If still failing, consider JWT approach**

The key fix is `sameSite: 'none'` which allows cross-site cookies, combined with proper CORS configuration and explicit session saving.
