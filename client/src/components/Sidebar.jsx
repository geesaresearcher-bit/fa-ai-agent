import React from 'react';
import { listConversations, createConversation, renameConversation, deleteConversation } from '../api';

export default function Sidebar({ activeId, onSelect, onNew }) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState([]);
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameText, setRenameText] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { conversations } = await listConversations();
      setItems(conversations);
    } catch (e) {
      // unauthorized handled by parent
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  async function onCreate() {
    const title = prompt('New chat title (optional):') || undefined;
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

  async function onDelete(id) {
    const confirmed = window.confirm('Delete this conversation?');
    if (!confirmed) return;
    await deleteConversation(id);
    await load();
    if (id === activeId) onSelect?.(null); // clear selection
  }

  return (
    <aside style={styles.aside}>
      <div style={styles.header}>
        <strong>Chats</strong>
        <button onClick={onCreate} style={styles.newBtn}>+ New</button>
      </div>
      <div style={styles.list}>
        {loading ? <div style={styles.loading}>Loading…</div> : (
          items.length === 0 ? <div style={styles.empty}>No conversations yet</div> : (
            items.map(c => (
              <div
                key={c._id}
                style={{ ...styles.item, background: c._id === activeId ? '#EEF2FF' : 'transparent' }}
                onClick={() => onSelect?.(c._id)}
              >
                {renamingId === c._id ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      autoFocus
                      value={renameText}
                      onChange={e => setRenameText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submitRename(c._id)}
                      style={styles.input}
                    />
                    <button onClick={() => submitRename(c._id)} style={styles.smallBtn}>Save</button>
                    <button onClick={() => setRenamingId(null)} style={styles.smallBtn}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <div style={styles.title}>{c.title || 'Untitled chat'}</div>
                    <div style={styles.rowBtns}>
                      <button onClick={(e) => { e.stopPropagation(); startRename(c._id, c.title || ''); }} style={styles.smallBtn}>Rename</button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(c._id); }} style={styles.smallBtn}>Delete</button>
                    </div>
                  </>
                )}
              </div>
            ))
          )
        )}
      </div>
    </aside>
  );
}

const styles = {
  aside: { width: 280, borderRight: '1px solid #e5e7eb', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  newBtn: { padding: '6px 8px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white' },
  list: { overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  item: { border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, cursor: 'pointer' },
  title: { fontSize: 14, fontWeight: 600, marginBottom: 6 },
  rowBtns: { display: 'flex', gap: 6 },
  smallBtn: { padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', fontSize: 12 },
  input: { flex: 1, padding: 6, borderRadius: 6, border: '1px solid #e5e7eb' },
  loading: { color: '#6b7280' },
  empty: { color: '#6b7280' }
};
