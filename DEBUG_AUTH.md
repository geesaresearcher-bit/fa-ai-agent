# Debug Authentication Issues

## What I've Added for Debugging

### 1. Enhanced Logging ✅
- Added console logs to track authentication flow
- Shows API requests and responses
- Displays error details

### 2. Retry Mechanism ✅
- If on `/chat` route and auth fails, retries up to 3 times
- Waits 1 second between retries
- Handles OAuth processing delays

### 3. Better Error Handling ✅
- Shows detailed error messages
- Logs response status codes
- Displays server error responses

## How to Debug

### Step 1: Check Browser Console
1. Open your deployed frontend
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Try to login and watch the logs

**Look for these messages:**
```
Checking authentication...
Making request to: https://your-backend-url/auth/me
Response status: 200
Auth response: {email: "...", hasGoogle: true, hasHubSpot: true}
User authenticated: {...}
```

### Step 2: Check Network Tab
1. In Developer Tools, go to Network tab
2. Try to login
3. Look for the `/auth/me` request
4. Check the response status and content

### Step 3: Test Backend Directly
Visit these URLs directly in your browser:
- `https://your-backend-url/health` - Should show server status
- `https://your-backend-url/auth/me` - Should show auth status (might be 401 if not logged in)

## Common Issues and Solutions

### Issue 1: "Making request to: http://localhost:4000"
**Problem**: Environment variable not set correctly
**Solution**: Check that `REACT_APP_API_URL` is set in your frontend service

### Issue 2: "Response status: 401"
**Problem**: Session not persisting or backend auth failing
**Solutions**:
- Check that `SESSION_SECRET` is set in backend
- Verify `MONGODB_URI` is correct
- Check backend logs for errors

### Issue 3: "Response status: 500"
**Problem**: Backend server error
**Solution**: Check backend logs in Render dashboard

### Issue 4: CORS errors
**Problem**: Frontend can't communicate with backend
**Solution**: Check that `FRONTEND_URL` is set correctly in backend

## Testing the OAuth Flow

### Manual Test Steps:
1. **Visit frontend** → Should redirect to `/login`
2. **Click "Continue with Google"** → Should redirect to Google
3. **Complete Google OAuth** → Should redirect to HubSpot
4. **Complete HubSpot OAuth** → Should redirect to `/chat`
5. **Check console logs** → Should show successful authentication

### If OAuth Flow Breaks:
1. **Check OAuth provider settings**:
   - Google: Authorized redirect URIs
   - HubSpot: Redirect URLs
2. **Verify environment variables** in Render dashboard
3. **Check backend logs** for OAuth errors

## Quick Fixes

### If still redirecting to login:
1. **Clear browser cookies** for your domain
2. **Check console** for specific error messages
3. **Test `/auth/me` endpoint** directly
4. **Verify all environment variables** are set

### If OAuth providers show errors:
1. **Update callback URLs** in OAuth provider settings
2. **Check that environment variables** match your OAuth app settings
3. **Verify OAuth app is configured** for production URLs

## Environment Variables Checklist

### Backend (Required):
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=[your MongoDB connection]`
- [ ] `SESSION_SECRET=[secure random string]`
- [ ] `FRONTEND_URL=[your frontend URL]`
- [ ] `BACKEND_URL=[your backend URL]`
- [ ] `GOOGLE_CLIENT_ID=[your Google client ID]`
- [ ] `GOOGLE_CLIENT_SECRET=[your Google client secret]`
- [ ] `GOOGLE_OAUTH_CALLBACK=[your backend URL]/auth/google/callback`
- [ ] `HUBSPOT_CLIENT_ID=[your HubSpot client ID]`
- [ ] `HUBSPOT_CLIENT_SECRET=[your HubSpot client secret]`
- [ ] `HUBSPOT_OAUTH_CALLBACK=[your backend URL]/auth/hubspot/callback`

### Frontend (Required):
- [ ] `REACT_APP_API_URL=[your backend URL]`
