import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { whoAmI } from './api';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
  const [state, setState] = React.useState({ loading: true, user: null });

  const load = React.useCallback(async () => {
    try {
      const me = await whoAmI();
      setState({ loading: false, user: me });
    } catch {
      setState({ loading: false, user: null });
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}><h3>Loading…</h3></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={state.user ? <Navigate to="/chat" replace /> : <Login />} 
      />
      <Route 
        path="/chat" 
        element={state.user ? <Chat me={state.user} onAuthChanged={load} /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/" 
        element={<Navigate to={state.user ? "/chat" : "/login"} replace />} 
      />
    </Routes>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' },
  card: { width: 420, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
};
