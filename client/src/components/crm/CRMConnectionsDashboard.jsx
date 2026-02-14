/**
 * CRM Connections Dashboard
 *
 * Main dashboard for viewing and managing CRM integrations
 * Features:
 * - List all CRM connections
 * - Connection status monitoring
 * - Quick sync actions
 * - Setup wizard for new connections
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    RefreshCw,
    Settings,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
    PlayCircle,
    AlertCircle
} from 'lucide-react';
import axios from '../../axiosConfig';
import './CRMConnectionsDashboard.css';

const CRMConnectionsDashboard = () => {
    const navigate = useNavigate();
    const [connections, setConnections] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState({});

    useEffect(() => {
        fetchConnections();
        fetchPlatforms();
    }, []);

    const fetchConnections = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/crm-connections');
            setConnections(response.data.data);
        } catch (error) {
            console.error('Failed to fetch connections:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlatforms = async () => {
        try {
            const response = await axios.get('/api/crm-connections/platforms');
            setPlatforms(response.data.data);
        } catch (error) {
            console.error('Failed to fetch platforms:', error);
        }
    };

    const handleTestConnection = async (connectionId) => {
        try {
            const response = await axios.post(`/api/crm-connections/${connectionId}/test`);

            if (response.data.data.success) {
                alert('Connection test successful!');
                fetchConnections();
            } else {
                alert(`Connection test failed: ${response.data.data.message}`);
            }
        } catch (error) {
            console.error('Connection test failed:', error);
            alert('Connection test failed');
        }
    };

    const handleSyncContacts = async (connectionId, direction) => {
        try {
            setSyncing({ ...syncing, [connectionId]: direction });

            const endpoint = direction === 'to-crm'
                ? `/api/crm-connections/${connectionId}/sync/contacts/to-crm`
                : `/api/crm-connections/${connectionId}/sync/contacts/from-crm`;

            const response = await axios.post(endpoint, {});

            alert(`Sync completed: ${response.data.data.success || 0} successful, ${response.data.data.failed || 0} failed`);
            fetchConnections();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Sync failed');
        } finally {
            setSyncing({ ...syncing, [connectionId]: null });
        }
    };

    const handleDeleteConnection = async (connectionId) => {
        if (!confirm('Are you sure you want to delete this connection?')) return;

        try {
            await axios.delete(`/api/crm-connections/${connectionId}`);
            setConnections(connections.filter(c => c.id !== connectionId));
            alert('Connection deleted successfully');
        } catch (error) {
            console.error('Failed to delete connection:', error);
            alert('Failed to delete connection');
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'active':
                return <CheckCircle size={20} color="#10B981" />;
            case 'inactive':
                return <Clock size={20} color="#6B7280" />;
            case 'error':
                return <XCircle size={20} color="#EF4444" />;
            case 'expired':
                return <AlertCircle size={20} color="#F59E0B" />;
            default:
                return <Clock size={20} color="#6B7280" />;
        }
    };

    const getPlatformLogo = (platform) => {
        const logos = {
            salesforce: '☁️',
            hubspot: '🟠',
            zoho: '🔶'
        };
        return logos[platform.toLowerCase()] || '🔗';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="crm-connections-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>CRM Integrations</h1>
                    <p>Connect and sync with your CRM platforms</p>
                </div>

                <button
                    className="btn-add-connection"
                    onClick={() => navigate('/crm-connections/new')}
                >
                    <Plus size={20} />
                    Add Connection
                </button>
            </div>

            {/* Available Platforms */}
            {connections.length === 0 && !loading && (
                <div className="platforms-showcase">
                    <h2>Connect to Your CRM</h2>
                    <p>Sync contacts, push survey responses, and automate workflows</p>

                    <div className="platforms-grid">
                        {platforms.map((platform) => (
                            <div
                                key={platform.id}
                                className="platform-card"
                                onClick={() => navigate(`/crm-connections/new?platform=${platform.id}`)}
                            >
                                <div className="platform-logo">{getPlatformLogo(platform.id)}</div>
                                <h3>{platform.name}</h3>
                                <p>{platform.description}</p>
                                <div className="platform-features">
                                    {platform.features.slice(0, 3).map((feature, i) => (
                                        <span key={i} className="feature-tag">{feature}</span>
                                    ))}
                                </div>
                                <button className="btn-connect">Connect</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Connections List */}
            {loading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading connections...</p>
                </div>
            ) : connections.length > 0 ? (
                <div className="connections-list">
                    {connections.map((connection) => (
                        <div key={connection.id} className="connection-card">
                            <div className="connection-header">
                                <div className="connection-info">
                                    <div className="platform-badge">
                                        <span className="platform-icon">{getPlatformLogo(connection.platform)}</span>
                                        <span className="platform-name">{connection.platform}</span>
                                    </div>
                                    <h3>{connection.connection_name}</h3>
                                </div>

                                <div className="connection-status">
                                    {getStatusIcon(connection.status)}
                                    <span className={`status-text ${connection.status}`}>
                                        {connection.status}
                                    </span>
                                </div>
                            </div>

                            <div className="connection-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Last Sync:</span>
                                    <span className="meta-value">{formatDate(connection.last_sync_at)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Sync Status:</span>
                                    <span className={`sync-status ${connection.last_sync_status}`}>
                                        {connection.last_sync_status || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {connection.last_error && (
                                <div className="connection-error">
                                    <AlertCircle size={16} />
                                    <span>{connection.last_error}</span>
                                </div>
                            )}

                            <div className="connection-actions">
                                <button
                                    className="action-btn test"
                                    onClick={() => handleTestConnection(connection.id)}
                                    title="Test Connection"
                                >
                                    <PlayCircle size={16} />
                                    Test
                                </button>

                                <button
                                    className="action-btn sync"
                                    onClick={() => handleSyncContacts(connection.id, 'to-crm')}
                                    disabled={syncing[connection.id]}
                                    title="Sync to CRM"
                                >
                                    <RefreshCw size={16} />
                                    {syncing[connection.id] === 'to-crm' ? 'Syncing...' : 'Push to CRM'}
                                </button>

                                <button
                                    className="action-btn sync"
                                    onClick={() => handleSyncContacts(connection.id, 'from-crm')}
                                    disabled={syncing[connection.id]}
                                    title="Sync from CRM"
                                >
                                    <RefreshCw size={16} />
                                    {syncing[connection.id] === 'from-crm' ? 'Syncing...' : 'Pull from CRM'}
                                </button>

                                <button
                                    className="action-btn settings"
                                    onClick={() => navigate(`/crm-connections/${connection.id}/settings`)}
                                    title="Settings"
                                >
                                    <Settings size={16} />
                                </button>

                                <button
                                    className="action-btn delete"
                                    onClick={() => handleDeleteConnection(connection.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

export default CRMConnectionsDashboard;
