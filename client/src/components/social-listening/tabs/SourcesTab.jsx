/**
 * Sources Tab - Platform connection management
 */

import React, { useState, useEffect } from 'react';
import { Settings, Plus, CheckCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { useSocialListening } from '../../../contexts/SocialListeningContext';
import LoadingSpinner from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
import './SourcesTab.css';

const SourcesTab = () => {
  const { sources, fetchSources, loading } = useSocialListening();
  const [testingSource, setTestingSource] = useState(null);
  const [syncingSource, setSyncingSource] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const platformsAvailable = [
    { id: 'twitter', name: 'Twitter', icon: '𝕏', color: '#1DA1F2' },
    { id: 'facebook', name: 'Facebook', icon: 'f', color: '#4267B2' },
    { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
    { id: 'linkedin', name: 'LinkedIn', icon: 'in', color: '#0077B5' },
    { id: 'youtube', name: 'YouTube', icon: '▶', color: '#FF0000' },
    { id: 'tiktok', name: 'TikTok', icon: '♪', color: '#000000' },
    { id: 'reddit', name: 'Reddit', icon: '🤖', color: '#FF4500' }
  ];

  const handleTestConnection = async (sourceId) => {
    setTestingSource(sourceId);
    try {
      await socialListeningApi.sources.test(sourceId);
      alert('Connection test successful!');
      fetchSources();
    } catch (error) {
      alert('Connection test failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setTestingSource(null);
    }
  };

  const handleSync = async (sourceId) => {
    setSyncingSource(sourceId);
    try {
      await socialListeningApi.sources.sync(sourceId);
      alert('Sync started successfully!');
      fetchSources();
    } catch (error) {
      alert('Sync failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setSyncingSource(null);
    }
  };

  const handleDelete = async (sourceId) => {
    if (!window.confirm('Are you sure you want to delete this source?')) return;
    try {
      await socialListeningApi.sources.delete(sourceId);
      fetchSources();
    } catch (error) {
      alert('Failed to delete source: ' + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      connected: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Connected' },
      error: { icon: AlertCircle, color: '#ef4444', bg: '#fee2e2', label: 'Error' },
      pending: { icon: RefreshCw, color: '#f59e0b', bg: '#fef3c7', label: 'Pending' }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          backgroundColor: badge.bg,
          color: badge.color,
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600
        }}
      >
        <Icon size={14} />
        {badge.label}
      </span>
    );
  };

  const getPlatformInfo = (platformId) => {
    return platformsAvailable.find(p => p.id === platformId) || {
      id: platformId,
      name: platformId,
      icon: '?',
      color: '#6c757d'
    };
  };

  if (loading.sources) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="sources-tab">
      {/* Header */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <Settings size={20} />
            Connected Sources
          </h2>
          <button className="sl-button" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Source
          </button>
        </div>
      </div>

      {/* Sources Grid */}
      {sources.length === 0 ? (
        <div className="sl-empty-state">
          <Settings size={48} className="sl-empty-icon" />
          <h3>No sources connected</h3>
          <p>Connect social media platforms to start listening</p>
          <button className="sl-button" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Connect Your First Source
          </button>
        </div>
      ) : (
        <div className="sources-grid">
          {sources.map((source) => {
            const platform = getPlatformInfo(source.platform);
            return (
              <div key={source.id} className="source-card">
                {/* Platform Icon */}
                <div
                  className="platform-icon"
                  style={{ backgroundColor: platform.color + '20', color: platform.color }}
                >
                  <span className="platform-emoji">{platform.icon}</span>
                </div>

                {/* Source Info */}
                <div className="source-info">
                  <div className="source-name">{source.name}</div>
                  <div className="source-platform">{platform.name}</div>
                  {getStatusBadge(source.status)}
                </div>

                {/* Metrics */}
                {source.last_sync_at && (
                  <div className="source-meta">
                    <div className="meta-item">
                      <span className="meta-label">Last Sync:</span>
                      <span className="meta-value">
                        {new Date(source.last_sync_at).toLocaleString()}
                      </span>
                    </div>
                    {source.mentions_count !== undefined && (
                      <div className="meta-item">
                        <span className="meta-label">Mentions:</span>
                        <span className="meta-value">{source.mentions_count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {source.status === 'error' && source.error_message && (
                  <div className="error-message">
                    <AlertCircle size={14} />
                    {source.error_message}
                  </div>
                )}

                {/* Actions */}
                <div className="source-actions">
                  <button
                    className="action-btn-test"
                    onClick={() => handleTestConnection(source.id)}
                    disabled={testingSource === source.id}
                  >
                    {testingSource === source.id ? (
                      <>
                        <RefreshCw size={14} className="spinning" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Test
                      </>
                    )}
                  </button>
                  <button
                    className="action-btn-sync"
                    onClick={() => handleSync(source.id)}
                    disabled={syncingSource === source.id}
                  >
                    {syncingSource === source.id ? (
                      <>
                        <RefreshCw size={14} className="spinning" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Sync
                      </>
                    )}
                  </button>
                  <button
                    className="action-btn-delete"
                    onClick={() => handleDelete(source.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Source Modal (Placeholder) */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Connect New Source</h3>
            <p className="modal-subtitle">
              Choose a platform to connect. You'll need API credentials for authentication.
            </p>
            <div className="platforms-grid">
              {platformsAvailable.map((platform) => (
                <button
                  key={platform.id}
                  className="platform-option"
                  onClick={() => {
                    alert(`${platform.name} integration coming soon!\n\nYou'll need:\n- API Key\n- Access Token\n- Account credentials`);
                    setShowAddModal(false);
                  }}
                >
                  <div
                    className="platform-icon-small"
                    style={{ backgroundColor: platform.color + '20', color: platform.color }}
                  >
                    {platform.icon}
                  </div>
                  <div className="platform-name">{platform.name}</div>
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="sl-button-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcesTab;
