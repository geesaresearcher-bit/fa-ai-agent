const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function whoAmI() {
  console.log('Making request to:', `${BASE}/auth/me`);
  const res = await fetch(`${BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include'
  });
  console.log('Response status:', res.status);
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Auth error:', errorText);
    throw new Error(`unauthorized: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  console.log('Auth response:', data);
  return data;
}

export function googleLoginUrl() {
  return `${BASE}/auth/google`;
}

export async function logout() {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  return res.json();
}

export async function sendMessage(message, threadId) {
  const res = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, threadId })
  });
  if (!res.ok) {
    // If session expired (Google/HubSpot token expired), backend returns 401
    if (res.status === 401) throw new Error('unauthorized');
    throw new Error('request_failed');
  }
  return res.json();
}

export async function listConversations() {
  const res = await fetch(`${BASE}/conversations`, { credentials: 'include' });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function createConversation(title) {
  const res = await fetch(`${BASE}/conversations`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function getConversationMessages(id) {
  const res = await fetch(`${BASE}/conversations/${id}/messages`, { credentials: 'include' });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function renameConversation(id, title) {
  const res = await fetch(`${BASE}/conversations/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function deleteConversation(id) {
  const res = await fetch(`${BASE}/conversations/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

// Integration management functions
export async function getIntegrations() {
  const res = await fetch(`${BASE}/auth/integrations`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function disconnectGoogle() {
  const res = await fetch(`${BASE}/auth/disconnect/google`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('failed_to_disconnect');
  return res.json();
}

export async function disconnectHubspot() {
  const res = await fetch(`${BASE}/auth/disconnect/hubspot`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('failed_to_disconnect');
  return res.json();
}

export function getGoogleConnectUrl() {
  return `${BASE}/auth/google`;
}

export function getHubspotConnectUrl() {
  return `${BASE}/auth/hubspot`;
}