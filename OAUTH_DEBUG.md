# Debug Google OAuth Redirect Issue

## Problem
Google OAuth flow stops at account selection page and doesn't redirect back to the app.

## Common Causes

### 1. OAuth Callback URL Not Configured
**Issue**: Google Console doesn't have the correct redirect URI
**Solution**: Add the callback URL to Google OAuth settings

### 2. Environment Variables Missing
**Issue**: OAuth credentials not set properly
**Solution**: Verify all OAuth environment variables

### 3. OAuth App Not Published
**Issue**: OAuth app is in testing mode
**Solution**: Publish the OAuth app or add test users

## Debugging Steps

### Step 1: Check OAuth Configuration
Visit: `https://your-backend-url/auth/google`

**Check the logs for:**
```
Google OAuth configuration: {
  clientId: '398973775387-3pvr78lk8vkbanu2u8f763q8gej5spnf.apps.googleusercontent.com',
  callback: 'https://fa-ai-agent-backend.onrender.com/auth/google/callback',
  hasClientSecret: true
}
```

### Step 2: Verify Google Console Settings
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID
4. Check "Authorized redirect URIs":
   ```
   https://fa-ai-agent-backend.onrender.com/auth/google/callback
   ```

### Step 3: Test OAuth Flow
1. **Start OAuth flow**: Visit `/auth/google`
2. **Complete Google login**: Select account and grant permissions
3. **Check callback**: Should redirect to `/auth/google/callback`
4. **Check logs**: Look for callback debugging info

## Expected OAuth Flow

### Successful Flow:
1. **User clicks login** → Redirects to Google
2. **User selects account** → Google shows consent screen
3. **User grants permissions** → Google redirects to callback
4. **Callback processes** → Creates session and redirects to frontend

### Current Issue:
1. **User clicks login** → Redirects to Google ✅
2. **User selects account** → Google shows consent screen ✅
3. **User grants permissions** → **STOPS HERE** ❌

## Quick Fixes

### Fix 1: Check Google Console Settings
1. **Go to Google Cloud Console**
2. **Navigate to APIs & Services → Credentials**
3. **Edit your OAuth 2.0 Client ID**
4. **Add redirect URI**: `https://fa-ai-agent-backend.onrender.com/auth/google/callback`
5. **Save changes**

### Fix 2: Verify Environment Variables
Check these are set in Render dashboard:
```
GOOGLE_CLIENT_ID=398973775387-3pvr78lk8vkbanu2u8f763q8gej5spnf.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_CALLBACK=https://fa-ai-agent-backend.onrender.com/auth/google/callback
```

### Fix 3: Test OAuth App Status
1. **Check if OAuth app is published**
2. **Add your email as test user** if in testing mode
3. **Verify OAuth consent screen** is configured

### Fix 4: Check OAuth Scopes
The current scopes might be too broad. Try reducing them:
```javascript
scope: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]
```

## Debugging Endpoints

### Test OAuth Configuration
Visit: `https://your-backend-url/auth/google`
- Check logs for OAuth configuration
- Verify redirect URL is correct

### Test OAuth Callback
After completing Google login, check:
- Does it redirect to `/auth/google/callback`?
- Are there any errors in the callback?
- Check backend logs for callback debugging

## Common Solutions

### Solution 1: Update Google Console
1. **Add redirect URI** to Google Console
2. **Save and wait 5-10 minutes** for changes to propagate
3. **Test OAuth flow again**

### Solution 2: Check OAuth App Status
1. **Go to OAuth consent screen**
2. **Check publishing status**
3. **Add test users** if in testing mode

### Solution 3: Verify Environment Variables
1. **Check all OAuth variables** are set
2. **Verify callback URL** matches exactly
3. **Test with different OAuth app** if needed

## Next Steps

1. **Check Google Console settings**
2. **Verify environment variables**
3. **Test OAuth flow with debugging**
4. **Check callback processing**

The most common issue is the redirect URI not being configured in Google Console. Make sure `https://fa-ai-agent-backend.onrender.com/auth/google/callback` is added to your OAuth app's authorized redirect URIs.
