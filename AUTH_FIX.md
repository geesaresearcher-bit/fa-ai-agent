# Fix for Login Redirect Issue

## Problem
After login, the app redirects back to the login page instead of staying logged in.

## Root Causes Fixed

### 1. Environment Variable Mismatch ✅
- **Fixed**: Changed `REACT_APP_BACKEND_URL` to `REACT_APP_API_URL` in `client/src/api.js`
- **Reason**: Your deployment sets `REACT_APP_API_URL` but code was looking for `REACT_APP_BACKEND_URL`

### 2. Missing Backend Environment Variables ✅
- **Added**: `BACKEND_URL`, `GOOGLE_OAUTH_CALLBACK`, `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_OAUTH_CALLBACK`
- **Reason**: Backend needs these for OAuth flow to work properly

### 3. OAuth Callback URLs ✅
- **Fixed**: Set proper callback URLs in render.yaml
- **Google Callback**: `https://fa-ai-agent-backend.onrender.com/auth/google/callback`
- **HubSpot Callback**: `https://fa-ai-agent-backend.onrender.com/auth/hubspot/callback`

## Required Environment Variables

### Backend Service (Set in Render Dashboard):
```
NODE_ENV = production
MONGODB_URI = [your MongoDB connection string]
DB_NAME = fa_agent
SESSION_SECRET = [generate a secure random string]
FRONTEND_URL = [your frontend URL]
BACKEND_URL = https://fa-ai-agent-backend.onrender.com
GOOGLE_CLIENT_ID = [your Google OAuth client ID]
GOOGLE_CLIENT_SECRET = [your Google OAuth client secret]
GOOGLE_OAUTH_CALLBACK = https://fa-ai-agent-backend.onrender.com/auth/google/callback
HUBSPOT_CLIENT_ID = [your HubSpot client ID]
HUBSPOT_CLIENT_SECRET = [your HubSpot client secret]
HUBSPOT_OAUTH_CALLBACK = https://fa-ai-agent-backend.onrender.com/auth/hubspot/callback
HUBSPOT_ACCESS_TOKEN = [your HubSpot access token]
```

### Frontend Service:
```
REACT_APP_API_URL = [your backend URL]
```

## OAuth Provider Configuration

### Google OAuth Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Edit your OAuth 2.0 Client ID
4. Add to "Authorized redirect URIs":
   ```
   https://fa-ai-agent-backend.onrender.com/auth/google/callback
   ```

### HubSpot OAuth Setup:
1. Go to [HubSpot Developer Portal](https://developers.hubspot.com)
2. Navigate to your app settings
3. Add to "Redirect URLs":
   ```
   https://fa-ai-agent-backend.onrender.com/auth/hubspot/callback
   ```

## Deployment Steps

1. **Commit and push changes:**
   ```bash
   git add .
   git commit -m "Fix authentication flow and environment variables"
   git push origin main
   ```

2. **Update OAuth providers** with the callback URLs above

3. **Set environment variables** in Render dashboard:
   - Go to your backend service
   - Add all the environment variables listed above
   - Make sure to use your actual API keys

4. **Redeploy** (should happen automatically)

## Testing the Fix

1. **Visit your frontend URL**
2. **Click "Continue with Google"**
3. **Complete Google OAuth** (should redirect to HubSpot)
4. **Complete HubSpot OAuth** (should redirect to `/chat`)
5. **Should stay logged in** and show the chat interface

## Troubleshooting

### If still redirecting to login:
1. **Check browser console** for JavaScript errors
2. **Check backend logs** in Render dashboard
3. **Verify environment variables** are set correctly
4. **Test `/auth/me` endpoint** directly: `https://your-backend-url/auth/me`

### Common issues:
- **CORS errors**: Check that `FRONTEND_URL` is set correctly
- **Session not persisting**: Check that `SESSION_SECRET` is set
- **OAuth errors**: Verify callback URLs in OAuth providers
- **Database connection**: Check `MONGODB_URI` is correct

## Debug Endpoints

- **Health check**: `https://your-backend-url/health`
- **Auth status**: `https://your-backend-url/auth/me`
- **Google OAuth**: `https://your-backend-url/auth/google`
- **HubSpot OAuth**: `https://your-backend-url/auth/hubspot`
