# JWT-Based Authentication Solution

## Problem
MongoDB session store is failing with connection errors, causing session persistence issues between OAuth redirects.

## Solution: JWT Tokens
Replace unreliable session-based authentication with JWT tokens for cross-domain OAuth flows.

## Implementation

### 1. Google OAuth Callback ✅
```javascript
// Use JWT token instead of session for cross-domain reliability
const jwt = require('jsonwebtoken');
const token = jwt.sign({ userId: user._id.toString() }, process.env.SESSION_SECRET, { expiresIn: '1h' });

return res.redirect(`${process.env.BACKEND_URL}/auth/hubspot?token=${token}`);
```

### 2. HubSpot OAuth Route ✅
```javascript
// Check for JWT token first (more reliable)
if (req.query.token) {
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.token, process.env.SESSION_SECRET);
        userId = decoded.userId;
        console.log('JWT token verified, userId:', userId);
    } catch (err) {
        console.log('JWT token invalid:', err.message);
    }
}
```

### 3. HubSpot OAuth URL ✅
```javascript
// Create JWT token for state parameter
const stateToken = jwt.sign({ userId: req.session.userId }, process.env.SESSION_SECRET, { expiresIn: '1h' });

const url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${callback}&scope=${scope}&response_type=code&state=${stateToken}`;
```

### 4. HubSpot Callback ✅
```javascript
// Check for JWT token in case session is lost
let userId = req.session?.userId;
if (!userId && req.query.state) {
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.query.state, process.env.SESSION_SECRET);
        userId = decoded.userId;
        req.session.userId = userId;
        console.log('Recovered userId from JWT state:', userId);
    } catch (err) {
        console.log('JWT state invalid:', err.message);
    }
}
```

## Benefits of JWT Solution

### 1. **No Session Store Dependency**
- No MongoDB session store required
- No cross-domain cookie issues
- Stateless authentication

### 2. **Cross-Domain Reliability**
- JWT tokens work across domains
- No cookie transmission issues
- URL-based token passing

### 3. **Fallback Mechanism**
- JWT tokens as primary authentication
- Session as fallback
- Multiple recovery methods

## Expected OAuth Flow

### Successful Flow:
1. **Google OAuth** → Creates JWT token
2. **Redirect to HubSpot** → JWT token in URL
3. **HubSpot OAuth** → JWT token verified
4. **HubSpot Callback** → JWT state parameter
5. **Final Redirect** → Frontend `/chat`

### Logs to Look For:
```
JWT token verified, userId: ...
Proceeding with HubSpot OAuth for user: ...
HubSpot OAuth URL: https://app.hubspot.com/oauth/authorize?...&state=...
Recovered userId from JWT state: ...
```

## Testing the Solution

### Step 1: Deploy JWT Solution
```bash
git add .
git commit -m "Implement JWT-based authentication for OAuth flows"
git push origin main
```

### Step 2: Test OAuth Flow
1. **Start OAuth flow**: Visit your frontend
2. **Complete Google OAuth**: Should create JWT token
3. **Check HubSpot redirect**: Should include JWT token
4. **Complete HubSpot OAuth**: Should use JWT state
5. **Final redirect**: Should reach frontend

### Step 3: Check Logs
Look for these success indicators:
- JWT token creation and verification
- Successful HubSpot OAuth URL generation
- JWT state recovery in callback

## Troubleshooting

### If JWT tokens fail:

1. **Check JWT library**: Ensure `jsonwebtoken` is installed
2. **Verify secret**: Check `SESSION_SECRET` is set
3. **Check token expiration**: Tokens expire in 1 hour
4. **Verify token format**: Check token format in logs

### If OAuth flow still fails:

1. **Check HubSpot configuration**: Verify client ID and secret
2. **Check redirect URLs**: Ensure callback URLs are correct
3. **Check state parameter**: Verify JWT state is being passed

## Alternative Solutions

### If JWT tokens don't work:

1. **Use URL parameters**: Pass user ID directly in URL
2. **Use localStorage**: Store user ID in browser storage
3. **Use same domain**: Deploy on same domain to avoid cross-domain issues

## Next Steps

1. **Deploy the JWT solution**
2. **Test the complete OAuth flow**
3. **Verify JWT token creation and verification**
4. **Check if OAuth flow reaches frontend**

The JWT solution should resolve the session store issues and provide reliable cross-domain authentication for the OAuth flow.
