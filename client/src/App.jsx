import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { whoAmI } from './api';
import Login from './components/Login';
import Chat from './components/Chat';

export default function App() {
  const [state, setState] = React.useState({ loading: true, user: null });

  const load = React.useCallback(async (retryCount = 0) => {
    try {
      console.log('Checking authentication...', retryCount > 0 ? `(retry ${retryCount})` : '');
      const me = await whoAmI();
      console.log('User authenticated:', me);
      setState({ loading: false, user: me });
    } catch (error) {
      console.log('Authentication failed:', error);
      
      // If we're on /chat and auth fails, wait a bit and retry (OAuth might still be processing)
      if (window.location.pathname === '/chat' && retryCount < 3) {
        console.log('Retrying authentication in 1 second...');
        setTimeout(() => load(retryCount + 1), 1000);
        return;
      }
      
      setState({ loading: false, user: null });
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h3>Loading…</h3>
          <p>Checking authentication...</p>
        </div>
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
