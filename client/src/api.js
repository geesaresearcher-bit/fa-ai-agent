const BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export async function whoAmI() {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/auth/me?userId=${userId}` : `${BASE}/auth/me`;
  console.log('Making request to:', url);
  const res = await fetch(url, {
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
  // Clear localStorage on logout
  localStorage.removeItem('userId');
  return res.json();
}

export async function sendMessage(message, threadId) {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/chat/message?userId=${userId}` : `${BASE}/chat/message`;
  const res = await fetch(url, {
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
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/conversations?userId=${userId}` : `${BASE}/conversations`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function createConversation(title) {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/conversations?userId=${userId}` : `${BASE}/conversations`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function getConversationMessages(id) {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/conversations/${id}/messages?userId=${userId}` : `${BASE}/conversations/${id}/messages`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function renameConversation(id, title) {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/conversations/${id}?userId=${userId}` : `${BASE}/conversations/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}

export async function deleteConversation(id) {
  const userId = localStorage.getItem('userId');
  const url = userId ? `${BASE}/conversations/${id}?userId=${userId}` : `${BASE}/conversations/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!res.ok) throw new Error('unauthorized');
  return res.json();
}
