// server/middleware/sessionAuth.js
import { getDb } from '../lib/db.js';
import {
  isGoogleExpired,
  isHubSpotExpired,
  refreshGoogleIfNeeded,
  refreshHubSpotIfNeeded
} from '../lib/oauthRefresh.js';

export async function sessionAuth(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) return logout401(req, res, 'Not logged in');

    const db = getDb();
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user) return logout401(req, res, 'User not found');

    // If you want both required for access:
    if (!user.google_tokens) return logout401(req, res, 'Google not connected');
    if (!user.hubspot_tokens) return logout401(req, res, 'HubSpot not connected');

    // Attempt refresh if needed
    try {
      if (isGoogleExpired(user.google_tokens)) {
        user.google_tokens = await refreshGoogleIfNeeded(user);
      }
      if (isHubSpotExpired(user.hubspot_tokens)) {
        user.hubspot_tokens = await refreshHubSpotIfNeeded(user);
      }
    } catch (e) {
      // Refresh failed -> logout
      return logout401(req, res, `Auth refresh failed: ${e.message}`);
    }

    // good to go
    req.userId = userId;
    req.user = user;
    return next();
  } catch (e) {
    return logout401(req, res, 'Auth error');
  }
}

function logout401(req, res, msg) {
  if (req.session) req.session.destroy(() => {});
  res.status(401).json({ error: msg || 'Unauthorized' });
}
