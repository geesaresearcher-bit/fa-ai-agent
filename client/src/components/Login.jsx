import React from 'react';
import { googleLoginUrl } from '../api';

export default function Login() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0 }}>Sign in</h2>
        <p>Sign in with Google. After Google connects, we’ll automatically connect your HubSpot account and bring you to chat.</p>
        <a href={googleLoginUrl()} style={styles.button}>Continue with Google</a>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>
          By continuing, you agree to connect Gmail, Calendar, and HubSpot for the AI agent to work.
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'system-ui' },
  card: { width: 420, padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' },
  button: {
    display: 'inline-block',
    marginTop: 12,
    background: '#1f2937',
    color: 'white',
    textDecoration: 'none',
    padding: '10px 14px',
    borderRadius: 8
  }
};
