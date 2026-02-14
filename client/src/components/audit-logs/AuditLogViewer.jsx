import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import {
    Shield, Search, Filter, Download, AlertTriangle, Info, AlertCircle,
    Clock, User, Activity, FileText, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import './AuditLogViewer.css';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'authentication', label: 'Authentication' },
    { value: 'authorization', label: 'Authorization' },
    { value: 'data_access', label: 'Data Access' },
    { value: 'data_modification', label: 'Data Modification' },
    { value: 'security', label: 'Security' },
    { value: 'system', label: 'System' }
];

const SEVERITIES = [
    { value: '', label: 'All Severities' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'critical', label: 'Critical' }
];

const STATUSES = [
    { value: '', label: 'All Statuses' },
    { value: 'success', label: 'Success' },
    { value: 'failure', label: 'Failure' }
];

function AuditLogViewer() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState(null);
    const [expandedLog, setExpandedLog] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        category: '',
        severity: '',
        status: '',
        startDate: '',
        endDate: '',
        action: '',
        userId: '',
        resourceType: '',
        resourceId: ''
    });

    // Pagination
    const [pagination, setPagination] = useState({
        limit: 50,
        offset: 0,
        total: 0
    });

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                ...filters,
                limit: pagination.limit,
                offset: pagination.offset
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await axios.get('/api/audit-logs', { params });

            setLogs(response.data.logs || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.total || 0
            }));
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
            setError('Failed to load audit logs. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filters, pagination.limit, pagination.offset]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get('/api/audit-logs/stats', {
                params: { days: 30 }
            });
            setStats(response.data.stats || []);
        } catch (err) {
            console.error('Failed to fetch audit stats:', err);
        }
    }, []);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
    };

    const handleResetFilters = () => {
        setFilters({
            category: '',
            severity: '',
            status: '',
            startDate: '',
            endDate: '',
            action: '',
            userId: '',
            resourceType: '',
            resourceId: ''
        });
        setPagination(prev => ({ ...prev, offset: 0 }));
    };

    const handleExport = async () => {
        try {
            const params = { ...filters };
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null) {
                    delete params[key];
                }
            });

            const response = await axios.get('/api/audit-logs/export', {
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `audit-logs-${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export audit logs');
        }
    };

    const toggleExpand = (logId) => {
        setExpandedLog(expandedLog === logId ? null : logId);
    };

    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'critical':
                return <AlertTriangle size={16} />;
            case 'warning':
                return <AlertCircle size={16} />;
            case 'info':
            default:
                return <Info size={16} />;
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return '#EF4444';
            case 'warning':
                return '#F59E0B';
            case 'info':
            default:
                return '#3B82F6';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'authentication':
                return <User size={16} />;
            case 'security':
                return <Shield size={16} />;
            case 'data_modification':
                return <FileText size={16} />;
            default:
                return <Activity size={16} />;
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="audit-log-viewer">
            <div className="audit-header">
                <div className="audit-header-left">
                    <Shield size={24} />
                    <h1>Audit Logs</h1>
                </div>
                <div className="audit-header-right">
                    <button
                        className="btn-refresh"
                        onClick={fetchLogs}
                        disabled={loading}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        className="btn-export"
                        onClick={handleExport}
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && stats.length > 0 && (
                <div className="audit-stats-grid">
                    {stats.slice(0, 4).map((stat, index) => (
                        <div key={index} className="stat-card">
                            <div className="stat-icon">
                                {getCategoryIcon(stat.category)}
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">{stat.category.replace('_', ' ')}</div>
                                <div className="stat-value">{parseInt(stat.total_count).toLocaleString()}</div>
                                <div className="stat-detail">
                                    {stat.critical_count > 0 && (
                                        <span className="stat-critical">
                                            {stat.critical_count} critical
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="audit-filters">
                <div className="filters-header">
                    <Filter size={16} />
                    <span>Filters</span>
                    <button className="btn-reset" onClick={handleResetFilters}>
                        Reset
                    </button>
                </div>
                <div className="filters-grid">
                    <div className="filter-group">
                        <label>Category</label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Severity</label>
                        <select
                            value={filters.severity}
                            onChange={(e) => handleFilterChange('severity', e.target.value)}
                        >
                            {SEVERITIES.map(sev => (
                                <option key={sev.value} value={sev.value}>
                                    {sev.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            {STATUSES.map(status => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Action</label>
                        <input
                            type="text"
                            placeholder="e.g., user.login"
                            value={filters.action}
                            onChange={(e) => handleFilterChange('action', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>Start Date</label>
                        <input
                            type="datetime-local"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                        />
                    </div>

                    <div className="filter-group">
                        <label>End Date</label>
                        <input
                            type="datetime-local"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Logs Table */}
            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading audit logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="empty-state">
                    <Shield size={48} />
                    <h3>No Audit Logs Found</h3>
                    <p>No logs match your current filters</p>
                </div>
            ) : (
                <>
                    <div className="logs-table">
                        {logs.map((log) => (
                            <div key={log.id} className="log-row">
                                <div className="log-main" onClick={() => toggleExpand(log.id)}>
                                    <div className="log-severity" style={{ color: getSeverityColor(log.severity) }}>
                                        {getSeverityIcon(log.severity)}
                                    </div>

                                    <div className="log-content">
                                        <div className="log-action">
                                            {log.action}
                                            {log.status === 'failure' && (
                                                <span className="status-badge failure">Failed</span>
                                            )}
                                        </div>
                                        <div className="log-meta">
                                            <span className="log-category">
                                                {getCategoryIcon(log.category)}
                                                {log.category.replace('_', ' ')}
                                            </span>
                                            <span className="log-actor">
                                                <User size={12} />
                                                {log.actor_email || 'System'}
                                            </span>
                                            <span className="log-time">
                                                <Clock size={12} />
                                                {formatDate(log.created_at)}
                                            </span>
                                            {log.ip_address && (
                                                <span className="log-ip">{log.ip_address}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="log-expand">
                                        {expandedLog === log.id ? (
                                            <ChevronUp size={16} />
                                        ) : (
                                            <ChevronDown size={16} />
                                        )}
                                    </div>
                                </div>

                                {expandedLog === log.id && (
                                    <div className="log-details">
                                        <div className="details-grid">
                                            {log.resource_type && (
                                                <div className="detail-item">
                                                    <strong>Resource:</strong>
                                                    <span>{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}</span>
                                                </div>
                                            )}
                                            {log.resource_name && (
                                                <div className="detail-item">
                                                    <strong>Resource Name:</strong>
                                                    <span>{log.resource_name}</span>
                                                </div>
                                            )}
                                            {log.request_method && (
                                                <div className="detail-item">
                                                    <strong>Request:</strong>
                                                    <span>{log.request_method} {log.request_path}</span>
                                                </div>
                                            )}
                                            {log.user_agent && (
                                                <div className="detail-item">
                                                    <strong>User Agent:</strong>
                                                    <span className="user-agent">{log.user_agent}</span>
                                                </div>
                                            )}
                                            {log.error_message && (
                                                <div className="detail-item error-detail">
                                                    <strong>Error:</strong>
                                                    <span>{log.error_message}</span>
                                                </div>
                                            )}
                                            {log.changes && (
                                                <div className="detail-item full-width">
                                                    <strong>Changes:</strong>
                                                    <pre>{JSON.stringify(JSON.parse(log.changes), null, 2)}</pre>
                                                </div>
                                            )}
                                            {log.metadata && Object.keys(JSON.parse(log.metadata)).length > 0 && (
                                                <div className="detail-item full-width">
                                                    <strong>Metadata:</strong>
                                                    <pre>{JSON.stringify(JSON.parse(log.metadata), null, 2)}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="pagination">
                        <div className="pagination-info">
                            Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} logs
                        </div>
                        <div className="pagination-controls">
                            <button
                                disabled={pagination.offset === 0}
                                onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                            >
                                Previous
                            </button>
                            <span className="page-numbers">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                disabled={pagination.offset + pagination.limit >= pagination.total}
                                onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default AuditLogViewer;
