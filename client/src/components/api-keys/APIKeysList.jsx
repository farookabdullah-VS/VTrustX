import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Key, Plus, Eye, EyeOff, Copy, Check, Trash2, Power, AlertCircle } from 'lucide-react';
import './APIKeysList.css';

function APIKeysList() {
    const navigate = useNavigate();
    const [apiKeys, setApiKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [copiedKeyId, setCopiedKeyId] = useState(null);
    const [revokingKeyId, setRevokingKeyId] = useState(null);
    const [deletingKeyId, setDeletingKeyId] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);

    useEffect(() => {
        fetchAPIKeys();
    }, []);

    const fetchAPIKeys = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/api-keys');
            setApiKeys(response.data.api_keys || []);
        } catch (err) {
            console.error('Failed to fetch API keys:', err);
            setError(err.response?.data?.error || 'Failed to load API keys');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = (keyPrefix) => {
        navigator.clipboard.writeText(`${keyPrefix}...`);
        setCopiedKeyId(keyPrefix);
        setTimeout(() => setCopiedKeyId(null), 2000);
    };

    const handleRevokeKey = async (keyId) => {
        if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
            return;
        }

        try {
            setRevokingKeyId(keyId);
            await axios.post(`/api/api-keys/${keyId}/revoke`);
            await fetchAPIKeys();
        } catch (err) {
            console.error('Failed to revoke API key:', err);
            alert(err.response?.data?.error || 'Failed to revoke API key');
        } finally {
            setRevokingKeyId(null);
        }
    };

    const handleDeleteKey = async (keyId) => {
        try {
            setDeletingKeyId(keyId);
            await axios.delete(`/api/api-keys/${keyId}`);
            await fetchAPIKeys();
            setShowConfirmDelete(null);
        } catch (err) {
            console.error('Failed to delete API key:', err);
            alert(err.response?.data?.error || 'Failed to delete API key');
        } finally {
            setDeletingKeyId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getScopeColor = (scope) => {
        if (scope.includes(':read')) return 'scope-read';
        if (scope.includes(':write')) return 'scope-write';
        if (scope.includes(':delete')) return 'scope-delete';
        return 'scope-manage';
    };

    if (loading) {
        return (
            <div className="api-keys-list">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading API keys...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="api-keys-list">
            <div className="api-keys-header">
                <div className="header-left">
                    <Key size={24} />
                    <div>
                        <h1>API Keys</h1>
                        <p className="subtitle">Manage API keys for programmatic access to VTrustX</p>
                    </div>
                </div>
                <button className="btn-create-key" onClick={() => navigate('/api-keys/new')}>
                    <Plus size={18} />
                    Create API Key
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {apiKeys.length === 0 && !error ? (
                <div className="empty-state">
                    <Key size={64} className="empty-icon" />
                    <h3>No API Keys Yet</h3>
                    <p>Create your first API key to start integrating with VTrustX</p>
                    <button className="btn-primary" onClick={() => navigate('/api-keys/new')}>
                        <Plus size={18} />
                        Create API Key
                    </button>
                </div>
            ) : (
                <div className="api-keys-grid">
                    {apiKeys.map((key) => (
                        <div
                            key={key.id}
                            className={`api-key-card ${!key.is_active ? 'revoked' : ''}`}
                        >
                            <div className="key-card-header">
                                <div className="key-name-section">
                                    <h3>{key.name}</h3>
                                    {!key.is_active && (
                                        <span className="status-badge revoked">Revoked</span>
                                    )}
                                    {key.is_active && (
                                        <span className="status-badge active">Active</span>
                                    )}
                                </div>
                                <div className="key-actions">
                                    {key.is_active && (
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleRevokeKey(key.id)}
                                            disabled={revokingKeyId === key.id}
                                            title="Revoke Key"
                                        >
                                            <Power size={16} />
                                        </button>
                                    )}
                                    <button
                                        className="btn-icon btn-danger"
                                        onClick={() => setShowConfirmDelete(key.id)}
                                        disabled={deletingKeyId === key.id}
                                        title="Delete Key"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {key.description && (
                                <p className="key-description">{key.description}</p>
                            )}

                            <div className="key-info">
                                <div className="key-display-row">
                                    <code className="key-display">{key.key_display}</code>
                                    <button
                                        className="btn-copy"
                                        onClick={() => handleCopyKey(key.key_prefix)}
                                        title="Copy Key Prefix"
                                    >
                                        {copiedKeyId === key.key_prefix ? (
                                            <Check size={14} className="copy-success" />
                                        ) : (
                                            <Copy size={14} />
                                        )}
                                    </button>
                                </div>

                                <div className="key-scopes">
                                    <strong>Scopes:</strong>
                                    <div className="scopes-list">
                                        {key.scopes.map((scope, idx) => (
                                            <span key={idx} className={`scope-badge ${getScopeColor(scope)}`}>
                                                {scope}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="key-metadata">
                                    <div className="metadata-row">
                                        <span className="metadata-label">Rate Limit:</span>
                                        <span className="metadata-value">{key.rate_limit} req/hour</span>
                                    </div>
                                    <div className="metadata-row">
                                        <span className="metadata-label">Created:</span>
                                        <span className="metadata-value">{formatDate(key.created_at)}</span>
                                    </div>
                                    <div className="metadata-row">
                                        <span className="metadata-label">Last Used:</span>
                                        <span className="metadata-value">{formatDate(key.last_used_at)}</span>
                                    </div>
                                    {key.expires_at && (
                                        <div className="metadata-row">
                                            <span className="metadata-label">Expires:</span>
                                            <span className="metadata-value expires">{formatDate(key.expires_at)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Confirm Delete Modal */}
                            {showConfirmDelete === key.id && (
                                <div className="confirm-delete-overlay">
                                    <div className="confirm-delete-modal">
                                        <h4>Delete API Key?</h4>
                                        <p>This will permanently delete the API key <strong>{key.name}</strong>. This action cannot be undone.</p>
                                        <div className="confirm-actions">
                                            <button
                                                className="btn-cancel"
                                                onClick={() => setShowConfirmDelete(null)}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="btn-confirm-delete"
                                                onClick={() => handleDeleteKey(key.id)}
                                                disabled={deletingKeyId === key.id}
                                            >
                                                {deletingKeyId === key.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default APIKeysList;
