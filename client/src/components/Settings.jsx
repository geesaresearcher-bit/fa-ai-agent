import React, { useState, useEffect } from 'react';
import { getIntegrations, disconnectGoogle, disconnectHubspot, getGoogleConnectUrl, getHubspotConnectUrl } from '../api';

export default function Settings({ onClose }) {
  const [integrations, setIntegrations] = useState({
    google: { connected: false, email: '' },
    hubspot: { connected: false, email: '' }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const data = await getIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('Error loading integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google? This will stop email and calendar access.')) {
      return;
    }

    try {
      await disconnectGoogle();
      await loadIntegrations();
      alert('Google disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      alert('Error disconnecting Google');
    }
  };

  const handleDisconnectHubspot = async () => {
    if (!window.confirm('Are you sure you want to disconnect Hubspot? This will stop contact management.')) {
      return;
    }

    try {
      await disconnectHubspot();
      await loadIntegrations();
      alert('Hubspot disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Hubspot:', error);
      alert('Error disconnecting Hubspot');
    }
  };

  const reconnectGoogle = () => {
    window.location.href = getGoogleConnectUrl();
  };

  const reconnectHubspot = () => {
    window.location.href = getHubspotConnectUrl();
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.header}>
            <h2>Settings</h2>
            <button onClick={onClose} style={styles.closeBtn}>×</button>
          </div>
          <div style={styles.content}>
            <div style={styles.loading}>Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2>Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>
        <div style={styles.content}>
          <div style={styles.section}>
            <h3>Integrations</h3>
            
            {/* Google Integration */}
            <div style={styles.integration}>
              <div style={styles.integrationInfo}>
                <div style={styles.integrationName}>
                  <strong>Google</strong>
                  <span style={styles.status(integrations.google.connected)}>
                    {integrations.google.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {integrations.google.connected && integrations.google.email && (
                  <div style={styles.email}>{integrations.google.email}</div>
                )}
              </div>
              <div style={styles.integrationActions}>
                {integrations.google.connected ? (
                  <button onClick={handleDisconnectGoogle} style={styles.disconnectBtn}>
                    Disconnect
                  </button>
                ) : (
                  <button onClick={reconnectGoogle} style={styles.connectBtn}>
                    Connect
                  </button>
                )}
              </div>
            </div>

            {/* Hubspot Integration */}
            <div style={styles.integration}>
              <div style={styles.integrationInfo}>
                <div style={styles.integrationName}>
                  <strong>Hubspot</strong>
                  <span style={styles.status(integrations.hubspot.connected)}>
                    {integrations.hubspot.connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {integrations.hubspot.connected && integrations.hubspot.email && (
                  <div style={styles.email}>{integrations.hubspot.email}</div>
                )}
              </div>
              <div style={styles.integrationActions}>
                {integrations.hubspot.connected ? (
                  <button onClick={handleDisconnectHubspot} style={styles.disconnectBtn}>
                    Disconnect
                  </button>
                ) : (
                  <button onClick={reconnectHubspot} style={styles.connectBtn}>
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h3>About</h3>
            <p style={styles.about}>
              This AI agent requires both Google and Hubspot connections to work properly.
              Google provides email and calendar access, while Hubspot manages your contacts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280'
  },
  content: {
    padding: '24px',
    maxHeight: 'calc(90vh - 80px)',
    overflowY: 'auto'
  },
  section: {
    marginBottom: '24px'
  },
  integration: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    marginBottom: '12px'
  },
  integrationInfo: {
    flex: 1
  },
  integrationName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px'
  },
  status: (connected) => ({
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: connected ? '#dcfce7' : '#fef2f2',
    color: connected ? '#166534' : '#dc2626'
  }),
  email: {
    fontSize: '14px',
    color: '#6b7280'
  },
  integrationActions: {
    marginLeft: '16px'
  },
  connectBtn: {
    background: '#1f2937',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '14px'
  },
  disconnectBtn: {
    background: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '14px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280'
  },
  about: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0
  }
};
