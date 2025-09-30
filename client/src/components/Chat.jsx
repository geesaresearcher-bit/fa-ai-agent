import React from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Settings from '../components/Settings.jsx';
import { whoAmI, sendMessage, getConversationMessages, logout } from '../api';

export default function Chat({ me, onAuthChanged }) {
  const navigate = useNavigate();
  const [threadId, setThreadId] = React.useState(localStorage.getItem('threadId') || '');
  const [messages, setMessages] = React.useState([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('chat');
  const [showSettings, setShowSettings] = React.useState(false);
  const isDesktop = useMedia('(min-width: 1024px)');

  const endRef = React.useRef(null);
  React.useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  React.useEffect(() => { loadThread(threadId); }, [threadId]);

  async function loadThread(id) {
    if (!id) {
      setMessages([{ from: 'bot', text: 'New chat started. How can I help?' }]);
      return;
    }
    try {
      const data = await getConversationMessages(id);
      if (data.messages.length === 0) {
        setMessages([{ from: 'bot', text: 'New chat started. How can I help?' }]);
        return;
      }
      setMessages(data.messages.map(m => ({ from: m.role === 'user' ? 'me' : 'bot', text: m.content })));
    } catch {
      setMessages([{ from: 'bot', text: 'Unable to load messages.' }]);
    }
  }

  function onSelectConversation(id) {
    setThreadId(id || '');
    id ? localStorage.setItem('threadId', id) : localStorage.removeItem('threadId');
    if (!isDesktop) setActiveTab('chat');
  }

  async function onSend() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setLoading(true);
    setMessages(m => [...m, { from: 'me', text }]);
    setSending(true);
    try {
      const data = await sendMessage(text, threadId);
      if (data.threadId) {
        setThreadId(data.threadId);
        localStorage.setItem('threadId', data.threadId);
      }
      setMessages(m => [...m, { from: 'bot', text: data.reply || 'Done.' }]);
    } catch (e) {
      if (e.message === 'unauthorized') onAuthChanged(); // This will trigger a re-check of auth status
      else setMessages(m => [...m, { from: 'bot', text: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
      setSending(false);
    }
  }

  async function onLogout() {
    localStorage.clear();
    try {
      await logout();
    } catch (error) {
      // Logout API call failed, but continue with auth change
    }
    onAuthChanged(); // This will trigger a re-check of auth status
  }

  function TypingLoader() {
    return (
      <div className="typing-loader">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );
  }

  if (!me) return <div className="chat" style={{ margin: 16 }}>Loading…</div>;

  return (
    <div className="app-container">
      <Sidebar activeId={threadId} onSelect={onSelectConversation} onNew={id => onSelectConversation(id)} />

      <div className="main">
        <header className="header">
          <div>
            <strong>Financial Advisor AI Agent</strong>
            <div className="subheader">{me.email} {me.hasHubSpot ? '• HubSpot Connected' : '• Connecting HubSpot…'}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSettings(true)} className="btn-outline">Settings</button>
            <button onClick={onLogout} className="btn-outline">Logout</button>
          </div>
        </header>

        <div className="tabbar">
          <button className={`tabbtn ${activeTab === 'chat' ? 'tabbtn--active' : ''}`} onClick={() => setActiveTab('chat')}>Chat</button>
          <button className={`tabbtn ${activeTab === 'history' ? 'tabbtn--active' : ''}`} onClick={() => setActiveTab('history')}>History</button>
        </div>

        {isDesktop ? (
          <>
            <main className="chat">
              {messages.map((m, i) => (
                <div key={i} style={{ textAlign: m.from === 'me' ? 'right' : 'left' }}>
                  <div className={`bubble ${m.from === 'me' ? 'bubble--me' : ''}`}>
                    <div className="bubble-meta">{m.from}</div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="bubble bot">
                  <TypingLoader />
                </div>
              )}
              <div ref={endRef} />
            </main>
            <footer className="inputbar">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && onSend()} placeholder="Ask about clients or request actions…" className="input" disabled={sending} />
              <button onClick={onSend} disabled={sending || !input.trim()} className="btn-send">{sending ? 'Sending…' : 'Send'}</button>
            </footer>
          </>
        ) : activeTab === 'chat' ? (
          <>
            <main className="chat">
              {messages.map((m, i) => (
                <div key={i} style={{ textAlign: m.from === 'me' ? 'right' : 'left' }}>
                  <div className={`bubble ${m.from === 'me' ? 'bubble--me' : ''}`}>
                    <div className="bubble-meta">{m.from}</div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="bubble bot">
                  <TypingLoader />
                </div>
              )}
              <div ref={endRef} />
            </main>
            <footer className="inputbar">
              <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sending && onSend()} placeholder="Ask about clients or request actions…" className="input" disabled={sending} />
              <button onClick={onSend} disabled={sending || !input.trim()} className="btn-send">{sending ? 'Sending…' : 'Send'}</button>
            </footer>
          </>
        ) : (
          <Sidebar mobile activeId={threadId} onSelect={onSelectConversation} onNew={id => onSelectConversation(id)} />
        )}
      </div>
      
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function useMedia(query) {
  const [match, setMatch] = React.useState(() => window.matchMedia(query).matches);
  React.useEffect(() => {
    const m = window.matchMedia(query);
    const handler = () => setMatch(m.matches);
    m.addEventListener ? m.addEventListener('change', handler) : m.addListener(handler);
    return () => m.removeEventListener ? m.removeEventListener('change', handler) : m.removeListener(handler);
  }, [query]);
  return match;
}
