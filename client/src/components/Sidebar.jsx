import React from 'react';
import { listConversations, createConversation, renameConversation, deleteConversation } from '../api';

export default function Sidebar({ activeId, onSelect, onNew, mobile = false }) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameText, setRenameText] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { conversations } = await listConversations();
      setItems(conversations);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function onCreate() {
    const title = 'Untitled chat';
    const created = await createConversation(title);
    await load();
    onNew?.(created._id, created.title);
  }

  async function startRename(id, current) {
    setRenamingId(id);
    setRenameText(current);
  }

  async function submitRename(id) {
    const title = renameText.trim();
    if (title) {
      await renameConversation(id, title);
      await load();
    }
    setRenamingId(null);
    setRenameText('');
  }

  async function onDeleteConv(id) {
    if (!window.confirm('Delete this conversation?')) return;
    await deleteConversation(id);
    await load();
    if (id === activeId) onSelect?.(null);
  }

  return (
    <aside className={`sidebar ${mobile ? 'sidebar--mobile' : ''}`}>
      <div className="sidebar-header">
        <strong>History</strong>
        <button onClick={onCreate} className="sidebar-btn">+ New</button>
      </div>
      <div className="sidebar-list">
        {loading ? (
          <div className="sidebar-loading">Loading…</div>
        ) : items.length === 0 ? (
          <div className="sidebar-empty">No conversations yet</div>
        ) : (
          items.map(c => (
            <div
              key={c._id}
              className={`sidebar-item ${c._id === activeId ? 'sidebar-item--active' : ''}`}
              onClick={() => onSelect?.(c._id)}
            >
              {renamingId === c._id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    value={renameText}
                    onChange={e => setRenameText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitRename(c._id)}
                    className="sidebar-input"
                  />
                  <button onClick={() => submitRename(c._id)} className="sidebar-smallbtn">Save</button>
                  <button onClick={() => setRenamingId(null)} className="sidebar-smallbtn">Cancel</button>
                </div>
              ) : (
                <>
                  <div className="sidebar-title">{c.title || 'Untitled chat'}</div>
                  <div className="sidebar-rowbtns">
                    <button
                      onClick={(e) => { e.stopPropagation(); startRename(c._id, c.title || ''); }}
                      className="sidebar-smallbtn">Rename</button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConv(c._id); }}
                      className="sidebar-smallbtn">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
