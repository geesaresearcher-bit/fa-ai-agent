const BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export async function whoAmI() {
  const res = await fetch(`${BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
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
