import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import { whoAmI, sendMessage, getConversationMessages } from '../api';

export default function Chat() {
  const navigate = useNavigate();
  const [me, setMe] = React.useState(null);
  const [threadId, setThreadId] = React.useState(localStorage.getItem('threadId') || '');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);

  // Load profile/session
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await whoAmI();
        if (alive) setMe(data);
      } catch {
        if (alive) navigate('/login', { replace: true });
      }
    })();
    return () => { alive = false; };
  }, [navigate]);

  // Load messages for selected thread
  const loadThread = React.useCallback(async (id) => {
    if (!id) {
      setMessages([{ from: 'bot', text: 'New chat started. How can I help?' }]);
      return;
    }
    try {
      const data = await getConversationMessages(id);
      const mapped = data.messages.map(m => ({ from: m.role === 'user' ? 'me' : 'bot', text: m.content }));
      setMessages(mapped.length ? mapped : [{ from: 'bot', text: 'This conversation has no messages yet.' }]);
    } catch (e) {
      // unauthorized handled at whoAmI
      setMessages([{ from: 'bot', text: 'Unable to load messages.' }]);
    }
  }, []);

  React.useEffect(() => { loadThread(threadId); }, [threadId, loadThread]);

  // When user selects a conversation in sidebar
  function onSelectConversation(id) {
    setThreadId(id || '');
    if (id) localStorage.setItem('threadId', id); else localStorage.removeItem('threadId');
  }

  // When a new conversation is created from sidebar
  function onNewConversation(id) {
    onSelectConversation(id);
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, { from: 'me', text }]);
    setSending(true);
    try {
      const data = await sendMessage(text, threadId);
      // if backend created a new conversation, capture it
      if (data.threadId && data.threadId !== threadId) {
        setThreadId(data.threadId);
        localStorage.setItem('threadId', data.threadId);
      }
      setMessages(m => [...m, { from: 'bot', text: data.reply || 'Done.' }]);
    } catch (e) {
      if (e.message === 'unauthorized') {
        alert('Your session ended. Please login again.');
        navigate('/login', { replace: true });
      } else {
        setMessages(m => [...m, { from: 'bot', text: 'Something went wrong.' }]);
      }
    } finally {
      setSending(false);
    }
  }

  async function onLogout() {
    try { await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    navigate('/login', { replace: true });
  }

  if (!me) return <div style={styles.center}>Loading…</div>;

  return (
    <div style={styles.container}>
      <Sidebar
        activeId={threadId}
        onSelect={onSelectConversation}
        onNew={(id) => onNewConversation(id)}
      />

      <div style={styles.main}>
        <header style={styles.header}>
          <div>
            <strong>Financial Advisor AI Agent</strong>
            <div style={styles.subheader}>
              {me.email} {me.hasHubSpot ? '• HubSpot Connected' : '• Connecting HubSpot…'}
            </div>
          </div>
          <button onClick={onLogout} style={styles.logout}>Logout</button>
        </header>

        <main style={styles.chat}>
          {messages.map((m, i) => (
            <div key={i} style={{ textAlign: m.from === 'me' ? 'right' : 'left' }}>
              <div style={{ ...styles.bubble, background: m.from === 'me' ? '#DCFCE7' : '#F3F4F6' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{m.from}</div>
                <div>{m.text}</div>
              </div>
            </div>
          ))}
        </main>

        <footer style={styles.inputBar}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !sending && onSend()}
            placeholder="Ask about clients or request actions…"
            style={styles.input}
            disabled={sending}
          />
          <button onClick={onSend} disabled={sending || !input.trim()} style={styles.send}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  center: { minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' },
  container: { display: 'grid', gridTemplateColumns: '280px 1fr', height: '100vh', fontFamily: 'system-ui' },
  main: { display: 'flex', flexDirection: 'column', padding: 16 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  subheader: { fontSize: 12, color: '#6b7280' },
  logout: { padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' },
  chat: { border: '1px solid #e5e7eb', borderRadius: 12, flex: 1, padding: 12, overflowY: 'auto' },
  bubble: { display: 'inline-block', padding: 10, borderRadius: 10, margin: '6px 0', maxWidth: '75%' },
  inputBar: { display: 'flex', gap: 8, marginTop: 12 },
  input: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb' },
  send: { padding: '12px 14px', borderRadius: 10, background: '#111827', color: 'white', border: 'none' }
};
