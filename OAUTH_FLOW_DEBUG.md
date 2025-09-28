# Debug OAuth Flow Issue

## Current Status
✅ **Google OAuth**: Working perfectly  
❌ **HubSpot OAuth**: Missing `response_type=code` parameter  
❌ **Final Redirect**: Not reaching frontend  

## OAuth Flow Analysis

### What's Working:
```
Google OAuth configuration: ✅
OAuth callback received: ✅
Session set: ✅
Session saved successfully: ✅
```

### What's Not Working:
The flow is redirecting back to Google OAuth instead of proceeding to HubSpot OAuth.

## Root Cause
The HubSpot OAuth URL was missing the `response_type=code` parameter, which is required for OAuth flows.

## Fixes Applied

### 1. Fixed HubSpot OAuth URL ✅
```javascript
// Before (missing response_type):
const url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${callback}&scope=${scope}`;

// After (with response_type):
const url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${callback}&scope=${scope}&response_type=code`;
```

### 2. Added HubSpot OAuth Debugging ✅
- Logs HubSpot OAuth URL generation
- Logs HubSpot callback reception
- Shows session state during HubSpot flow

## Expected OAuth Flow

### Complete Flow:
1. **User clicks login** → Google OAuth ✅
2. **Google OAuth completes** → Session created ✅
3. **Redirect to HubSpot OAuth** → HubSpot authorization
4. **HubSpot OAuth completes** → HubSpot tokens stored
5. **Redirect to frontend** → `/chat` page

### Current Issue:
The flow is stopping at step 3 because HubSpot OAuth URL was malformed.

## Testing the Fix

### Step 1: Deploy Changes
```bash
git add .
git commit -m "Fix HubSpot OAuth URL and add debugging"
git push origin main
```

### Step 2: Test OAuth Flow
1. **Start OAuth flow**: Visit your frontend
2. **Complete Google OAuth**: Should work as before
3. **Check HubSpot redirect**: Should now redirect to HubSpot properly
4. **Complete HubSpot OAuth**: Should redirect to frontend

### Step 3: Check Logs
Look for these logs:
```
HubSpot OAuth URL: https://app.hubspot.com/oauth/authorize?...
HubSpot OAuth callback received: { sessionId: '...', userId: '...', code: 'present' }
```

## Environment Variables Required

### For HubSpot OAuth:
```
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
HUBSPOT_OAUTH_CALLBACK=https://fa-ai-agent-backend.onrender.com/auth/hubspot/callback
```

### Verify in HubSpot:
1. **Go to HubSpot Developer Portal**
2. **Navigate to your app**
3. **Check OAuth settings**
4. **Add redirect URL**: `https://fa-ai-agent-backend.onrender.com/auth/hubspot/callback`

## Troubleshooting

### If HubSpot OAuth still fails:

1. **Check HubSpot app settings**:
   - Verify client ID and secret
   - Check redirect URL is configured
   - Ensure app is published

2. **Check environment variables**:
   - Verify all HubSpot variables are set
   - Check callback URL matches exactly

3. **Test HubSpot OAuth URL**:
   - Visit the generated HubSpot OAuth URL
   - Check if it redirects properly
   - Look for error messages

### If session is lost during HubSpot flow:

1. **Check session persistence**:
   - Verify session is maintained between redirects
   - Check cookie settings
   - Test session endpoints

2. **Check redirect URLs**:
   - Ensure all redirects use HTTPS
   - Verify domain consistency

## Next Steps

1. **Deploy the HubSpot OAuth fix**
2. **Test the complete OAuth flow**
3. **Check if it reaches the frontend**
4. **Verify session persistence**

The key fix is adding `response_type=code` to the HubSpot OAuth URL. This should allow the OAuth flow to complete properly and redirect to your frontend.
