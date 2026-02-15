import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Webhook, Plus, Globe, Power, Trash2, Activity, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import './WebhooksList.css';

function WebhooksList() {
    const navigate = useNavigate();
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [showConfirmDelete, setShowConfirmDelete] = useState(null);
    const [deliveryStats, setDeliveryStats] = useState({});

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/webhooks');
            setWebhooks(response.data.webhooks || []);

            // Fetch delivery stats for each webhook
            const statsPromises = (response.data.webhooks || []).map(webhook =>
                axios.get(`/api/webhooks/${webhook.id}/deliveries?limit=10`)
                    .then(res => ({
                        webhookId: webhook.id,
                        deliveries: res.data.deliveries,
                        recentSuccess: res.data.deliveries?.filter(d => d.status === 'success').length || 0,
                        recentFailed: res.data.deliveries?.filter(d => d.status === 'failed').length || 0
                    }))
                    .catch(() => ({ webhookId: webhook.id, deliveries: [], recentSuccess: 0, recentFailed: 0 }))
            );

            const stats = await Promise.all(statsPromises);
            const statsMap = stats.reduce((acc, stat) => {
                acc[stat.webhookId] = stat;
                return acc;
            }, {});
            setDeliveryStats(statsMap);
        } catch (err) {
            console.error('Failed to fetch webhooks:', err);
            setError(err.response?.data?.error || 'Failed to load webhooks');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (webhookId, currentStatus) => {
        try {
            await axios.put(`/api/webhooks/${webhookId}`, {
                is_active: !currentStatus
            });
            await fetchWebhooks();
        } catch (err) {
            console.error('Failed to toggle webhook:', err);
            alert(err.response?.data?.error || 'Failed to update webhook');
        }
    };

    const handleDelete = async (webhookId) => {
        try {
            setDeletingId(webhookId);
            await axios.delete(`/api/webhooks/${webhookId}`);
            await fetchWebhooks();
            setShowConfirmDelete(null);
        } catch (err) {
            console.error('Failed to delete webhook:', err);
            alert(err.response?.data?.error || 'Failed to delete webhook');
        } finally {
            setDeletingId(null);
        }
    };

    const handleTestWebhook = async (webhookId) => {
        try {
            await axios.post(`/api/webhooks/${webhookId}/test`);
            alert('Test webhook queued! Check delivery logs in a few seconds.');
        } catch (err) {
            console.error('Failed to test webhook:', err);
            alert(err.response?.data?.error || 'Failed to send test webhook');
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

    const getHealthColor = (stats) => {
        if (!stats || stats.recentSuccess + stats.recentFailed === 0) return 'unknown';
        const successRate = (stats.recentSuccess / (stats.recentSuccess + stats.recentFailed)) * 100;
        if (successRate >= 90) return 'healthy';
        if (successRate >= 70) return 'warning';
        return 'unhealthy';
    };

    if (loading) {
        return (
            <div className="webhooks-list">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading webhooks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="webhooks-list">
            <div className="webhooks-header">
                <div className="header-left">
                    <Webhook size={24} />
                    <div>
                        <h1>Webhooks</h1>
                        <p className="subtitle">Configure webhook endpoints to receive real-time event notifications</p>
                    </div>
                </div>
                <button className="btn-create-webhook" onClick={() => navigate('/webhooks/new')}>
                    <Plus size={18} />
                    Create Webhook
                </button>
            </div>

            {error && (
                <div className="error-banner">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {webhooks.length === 0 && !error ? (
                <div className="empty-state">
                    <Webhook size={64} className="empty-icon" />
                    <h3>No Webhooks Configured</h3>
                    <p>Set up webhooks to receive real-time notifications about events in your VTrustX account</p>
                    <button className="btn-primary" onClick={() => navigate('/webhooks/new')}>
                        <Plus size={18} />
                        Create Webhook
                    </button>
                </div>
            ) : (
                <div className="webhooks-grid">
                    {webhooks.map((webhook) => {
                        const stats = deliveryStats[webhook.id];
                        const healthColor = getHealthColor(stats);

                        return (
                            <div
                                key={webhook.id}
                                className={`webhook-card ${!webhook.is_active ? 'inactive' : ''}`}
                            >
                                <div className="webhook-card-header">
                                    <div className="webhook-name-section">
                                        <h3>{webhook.name}</h3>
                                        <div className="webhook-badges">
                                            {webhook.is_active ? (
                                                <span className="status-badge active">Active</span>
                                            ) : (
                                                <span className="status-badge inactive">Inactive</span>
                                            )}
                                            <span className={`health-badge ${healthColor}`}>
                                                {healthColor === 'healthy' && <CheckCircle size={12} />}
                                                {healthColor === 'warning' && <AlertCircle size={12} />}
                                                {healthColor === 'unhealthy' && <XCircle size={12} />}
                                                {healthColor === 'unknown' && <Activity size={12} />}
                                                {healthColor === 'unknown' ? 'No Data' : healthColor}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="webhook-actions">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleToggleActive(webhook.id, webhook.is_active)}
                                            aria-label={webhook.is_active ? `Deactivate webhook ${webhook.name}` : `Activate webhook ${webhook.name}`}
                                        >
                                            <Power size={16} aria-hidden="true" />
                                        </button>
                                        <button
                                            className="btn-icon btn-danger"
                                            onClick={() => setShowConfirmDelete(webhook.id)}
                                            aria-label={`Delete webhook ${webhook.name}`}
                                        >
                                            <Trash2 size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                <div className="webhook-url">
                                    <Globe size={14} />
                                    <code>{webhook.url}</code>
                                </div>

                                <div className="webhook-events">
                                    <strong>Events:</strong>
                                    <div className="events-list">
                                        {webhook.events.map((event, idx) => (
                                            <span key={idx} className="event-badge">
                                                {event}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {stats && stats.deliveries.length > 0 && (
                                    <div className="delivery-summary">
                                        <div className="summary-row">
                                            <span>Recent Deliveries:</span>
                                            <span>
                                                <span className="success-count">{stats.recentSuccess} success</span>
                                                {' / '}
                                                <span className="failed-count">{stats.recentFailed} failed</span>
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="webhook-metadata">
                                    <div className="metadata-row">
                                        <span className="metadata-label">Last Triggered:</span>
                                        <span className="metadata-value">{formatDate(webhook.last_triggered_at)}</span>
                                    </div>
                                    <div className="metadata-row">
                                        <span className="metadata-label">Created:</span>
                                        <span className="metadata-value">{formatDate(webhook.created_at)}</span>
                                    </div>
                                </div>

                                <div className="webhook-card-actions">
                                    <button
                                        className="btn-secondary"
                                        onClick={() => navigate(`/webhooks/${webhook.id}/deliveries`)}
                                    >
                                        <Activity size={16} />
                                        View Logs
                                    </button>
                                    <button
                                        className="btn-test"
                                        onClick={() => handleTestWebhook(webhook.id)}
                                    >
                                        Test Webhook
                                    </button>
                                </div>

                                {/* Confirm Delete Modal */}
                                {showConfirmDelete === webhook.id && (
                                    <div className="confirm-delete-overlay">
                                        <div className="confirm-delete-modal">
                                            <h4>Delete Webhook?</h4>
                                            <p>This will permanently delete the webhook <strong>{webhook.name}</strong> and all its delivery history.</p>
                                            <div className="confirm-actions">
                                                <button
                                                    className="btn-cancel"
                                                    onClick={() => setShowConfirmDelete(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn-confirm-delete"
                                                    onClick={() => handleDelete(webhook.id)}
                                                    disabled={deletingId === webhook.id}
                                                >
                                                    {deletingId === webhook.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default WebhooksList;
