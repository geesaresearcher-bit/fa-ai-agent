// server/lib/oauthRefresh.js
import { google } from 'googleapis';
import axios from 'axios';
import { getDb } from './db.js';

const GOOGLE_SAFETY_SEC = 60; // refresh 60s early
const HUBSPOT_SAFETY_SEC = 60;

export function isGoogleExpired(google_tokens) {
  if (!google_tokens?.expiry_date) return false; // if absent, assume valid until an API call fails
  return Date.now() >= (google_tokens.expiry_date - GOOGLE_SAFETY_SEC * 1000);
}

export function isHubSpotExpired(hubspot_tokens) {
  if (!hubspot_tokens?.access_token || !hubspot_tokens?.expires_in || !hubspot_tokens?.updated_at) return true;
  const issuedAt = new Date(hubspot_tokens.updated_at).getTime();
  const ttlMs = (hubspot_tokens.expires_in - HUBSPOT_SAFETY_SEC) * 1000;
  return Date.now() >= (issuedAt + ttlMs);
}

export async function refreshGoogleIfNeeded(user) {
  if (!user.google_tokens) throw new Error('Google not connected');

  if (!isGoogleExpired(user.google_tokens)) return user.google_tokens; // still valid

  // Need refresh — requires refresh_token
  if (!user.google_tokens.refresh_token) {
    throw new Error('Missing Google refresh_token');
  }

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_CALLBACK
  );
  oAuth2Client.setCredentials({
    refresh_token: user.google_tokens.refresh_token
  });

  // This will fetch a new access_token and expiry_date
  const { credentials } = await oAuth2Client.refreshAccessToken(); // deprecated in types, still works; alt is oAuth2Client.getAccessToken()
  // credentials: { access_token, expiry_date, ... } (no new refresh_token usually)

  const db = getDb();
  const newTokens = { ...user.google_tokens, ...credentials }; // keep old refresh_token
  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { google_tokens: newTokens, updated_at: new Date() } }
  );
  return newTokens;
}

export async function refreshHubSpotIfNeeded(user) {
  if (!user.hubspot_tokens?.access_token) throw new Error('HubSpot not connected');

  if (!isHubSpotExpired(user.hubspot_tokens)) return user.hubspot_tokens; // still valid

  // Need refresh — requires refresh_token
  const rt = user.hubspot_tokens.refresh_token;
  if (!rt) throw new Error('Missing HubSpot refresh_token');

  const tokenRes = await axios.post(
    'https://api.hubapi.com/oauth/v1/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.HUBSPOT_CLIENT_ID,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET,
      refresh_token: rt
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  // HubSpot can ROTATE refresh_token each time — save new one if provided
  const payload = tokenRes.data; // { access_token, refresh_token?, expires_in, token_type }
  const db = getDb();
  const newTokens = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || rt, // keep old if none returned
    expires_in: payload.expires_in,
    token_type: payload.token_type,
    updated_at: new Date()
  };

  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { hubspot_tokens: newTokens, updated_at: new Date() } }
  );
  return newTokens;
}
