/**
 * CRM Sync Dashboard
 *
 * View and manage sync operations and logs for a CRM connection
 * Features:
 * - Sync history with filters
 * - Real-time sync status
 * - Sync statistics
 * - Manual sync triggers
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    RefreshCw,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Upload,
    Filter,
    Calendar,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import axios from '../../axiosConfig';
import './CRMSyncDashboard.css';

const CRMSyncDashboard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [connection, setConnection] = useState(null);
    const [syncLogs, setSyncLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        syncType: 'all',
        dateRange: '7d'
    });
    const [stats, setStats] = useState({
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        lastSyncAt: null
    });

    useEffect(() => {
        fetchConnection();
        fetchSyncLogs();
    }, [id, filters]);

    const fetchConnection = async () => {
        try {
            const response = await axios.get(`/api/crm-connections/${id}`);
            setConnection(response.data.data);
        } catch (error) {
            console.error('Failed to fetch connection:', error);
        }
    };

    const fetchSyncLogs = async () => {
        try {
            setLoading(true);
            const params = {};

            if (filters.status !== 'all') {
                params.status = filters.status;
            }

            if (filters.syncType !== 'all') {
                params.syncType = filters.syncType;
            }

            const response = await axios.get(`/api/crm-connections/${id}/sync-logs`, { params });
            const logs = response.data.data;

            setSyncLogs(logs);

            // Calculate stats
            const total = logs.length;
            const successful = logs.filter(l => l.status === 'success').length;
            const failed = logs.filter(l => l.status === 'failed').length;
            const lastSync = logs.length > 0 ? logs[0].created_at : null;

            setStats({
                totalSyncs: total,
                successfulSyncs: successful,
                failedSyncs: failed,
                lastSyncAt: lastSync
            });
        } catch (error) {
            console.error('Failed to fetch sync logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncNow = async (direction) => {
        setSyncing(true);

        try {
            const endpoint = direction === 'to-crm'
                ? `/api/crm-connections/${id}/sync/contacts/to-crm`
                : `/api/crm-connections/${id}/sync/contacts/from-crm`;

            const response = await axios.post(endpoint, {});

            alert(`Sync completed: ${response.data.data.success || 0} successful, ${response.data.data.failed || 0} failed`);

            // Refresh logs
            fetchSyncLogs();
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const getSyncTypeIcon = (syncType) => {
        switch (syncType) {
            case 'contacts_to_crm':
                return <Upload size={16} />;
            case 'contacts_from_crm':
                return <Download size={16} />;
            case 'response_push':
                return <TrendingUp size={16} />;
            default:
                return <RefreshCw size={16} />;
        }
    };

    const getSyncTypeLabel = (syncType) => {
        switch (syncType) {
            case 'contacts_to_crm':
                return 'Push to CRM';
            case 'contacts_from_crm':
                return 'Pull from CRM';
            case 'response_push':
                return 'Response Push';
            default:
                return syncType;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle size={20} color="#10B981" />;
            case 'failed':
                return <XCircle size={20} color="#EF4444" />;
            case 'pending':
                return <Clock size={20} color="#F59E0B" />;
            default:
                return <Clock size={20} color="#6B7280" />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (ms) => {
        if (!ms) return 'N/A';
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s`;
    };

    if (!connection) {
        return (
            <div className="crm-sync-dashboard loading">
                <div className="spinner"></div>
                <p>Loading connection...</p>
            </div>
        );
    }

    return (
        <div className="crm-sync-dashboard">
            {/* Header */}
            <div className="sync-header">
                <button className="btn-back" onClick={() => navigate('/crm-connections')}>
                    <ArrowLeft size={20} />
                    Back to Connections
                </button>

                <div className="connection-info">
                    <h1>Sync Dashboard</h1>
                    <div className="connection-badge">
                        <span className="platform-icon">
                            {connection.platform === 'salesforce' && '☁️'}
                            {connection.platform === 'hubspot' && '🟠'}
                            {connection.platform === 'zoho' && '🔶'}
                        </span>
                        <span>{connection.connection_name}</span>
                    </div>
                </div>

                <div className="sync-actions">
                    <button
                        className="btn-sync push"
                        onClick={() => handleSyncNow('to-crm')}
                        disabled={syncing}
                    >
                        <Upload size={16} />
                        {syncing ? 'Syncing...' : 'Push to CRM'}
                    </button>
                    <button
                        className="btn-sync pull"
                        onClick={() => handleSyncNow('from-crm')}
                        disabled={syncing}
                    >
                        <Download size={16} />
                        {syncing ? 'Syncing...' : 'Pull from CRM'}
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                        <RefreshCw size={24} />
                    </div>
                    <div className="stat-details">
                        <div className="stat-value">{stats.totalSyncs}</div>
                        <div className="stat-label">Total Syncs</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#D1FAE5', color: '#10B981' }}>
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-details">
                        <div className="stat-value">{stats.successfulSyncs}</div>
                        <div className="stat-label">Successful</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#FEE2E2', color: '#EF4444' }}>
                        <XCircle size={24} />
                    </div>
                    <div className="stat-details">
                        <div className="stat-value">{stats.failedSyncs}</div>
                        <div className="stat-label">Failed</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                        <Clock size={24} />
                    </div>
                    <div className="stat-details">
                        <div className="stat-value">
                            {stats.lastSyncAt ? formatDate(stats.lastSyncAt).split(' ')[0] : 'Never'}
                        </div>
                        <div className="stat-label">Last Sync</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="sync-filters">
                <div className="filter-group">
                    <Filter size={16} />
                    <span>Filters:</span>
                </div>

                <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                </select>

                <select
                    value={filters.syncType}
                    onChange={(e) => setFilters({ ...filters, syncType: e.target.value })}
                >
                    <option value="all">All Types</option>
                    <option value="contacts_to_crm">Push to CRM</option>
                    <option value="contacts_from_crm">Pull from CRM</option>
                    <option value="response_push">Response Push</option>
                </select>

                <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                >
                    <option value="1d">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time</option>
                </select>

                <button className="btn-refresh" onClick={fetchSyncLogs}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Sync Logs Table */}
            <div className="sync-logs-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading sync logs...</p>
                    </div>
                ) : syncLogs.length === 0 ? (
                    <div className="empty-state">
                        <Calendar size={48} color="#D1D5DB" />
                        <h3>No Sync Operations</h3>
                        <p>Start syncing contacts to see history here</p>
                    </div>
                ) : (
                    <table className="sync-logs-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Type</th>
                                <th>Date & Time</th>
                                <th>Records</th>
                                <th>Duration</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {syncLogs.map((log) => (
                                <tr key={log.id} className={`log-row ${log.status}`}>
                                    <td>
                                        <div className="status-cell">
                                            {getStatusIcon(log.status)}
                                            <span className={`status-badge ${log.status}`}>
                                                {log.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="type-cell">
                                            {getSyncTypeIcon(log.sync_type)}
                                            <span>{getSyncTypeLabel(log.sync_type)}</span>
                                        </div>
                                    </td>
                                    <td>{formatDate(log.created_at)}</td>
                                    <td>
                                        <div className="records-cell">
                                            <span className="success">{log.records_synced || 0}</span>
                                            {log.records_failed > 0 && (
                                                <span className="failed">/ {log.records_failed} failed</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{formatDuration(log.duration_ms)}</td>
                                    <td>
                                        {log.error_message && (
                                            <div className="error-cell">
                                                <AlertCircle size={16} />
                                                <span>{log.error_message}</span>
                                            </div>
                                        )}
                                        {log.sync_details && (
                                            <div className="details-cell">
                                                {JSON.parse(log.sync_details).message || 'Success'}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default CRMSyncDashboard;
