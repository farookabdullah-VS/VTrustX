import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Filter, Download, RefreshCw, Calendar, User, FileText } from 'lucide-react';

/**
 * Enhanced Audit Log Viewer with Filtering and Export
 * Compliance dashboard for persona assignment tracking
 */
export function EnhancedAuditLogViewer() {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        action: '',
        profileId: '',
        dateFrom: '',
        dateTo: '',
        changedBy: ''
    });

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [logs, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/persona/audit-logs');
            setLogs(res.data || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        }
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...logs];

        if (filters.action) {
            filtered = filtered.filter(log =>
                log.action.toLowerCase().includes(filters.action.toLowerCase())
            );
        }

        if (filters.profileId) {
            filtered = filtered.filter(log =>
                log.profile_id && log.profile_id.toLowerCase().includes(filters.profileId.toLowerCase())
            );
        }

        if (filters.changedBy) {
            filtered = filtered.filter(log =>
                log.changed_by && log.changed_by.toLowerCase().includes(filters.changedBy.toLowerCase())
            );
        }

        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            filtered = filtered.filter(log => new Date(log.timestamp) >= fromDate);
        }

        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(log => new Date(log.timestamp) <= toDate);
        }

        setFilteredLogs(filtered);
    };

    const handleExport = () => {
        const exportData = {
            exported_at: new Date().toISOString(),
            total_records: filteredLogs.length,
            filters_applied: filters,
            logs: filteredLogs
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `persona_audit_logs_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportCSV = () => {
        const headers = ['Timestamp', 'Action', 'Profile ID', 'Changed By', 'Reason', 'Details'];
        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.action,
            log.profile_id || '',
            log.changed_by || '',
            log.reason || '',
            JSON.stringify(log.details || {})
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `persona_audit_logs_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const clearFilters = () => {
        setFilters({
            action: '',
            profileId: '',
            dateFrom: '',
            dateTo: '',
            changedBy: ''
        });
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.8em', color: 'var(--text-color)' }}>Persona Audit Logs</h2>
                    <div style={{ color: 'var(--text-muted)', marginTop: '5px' }}>
                        Compliance tracking for all persona assignments and changes
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={fetchLogs}
                        disabled={loading}
                        style={{
                            padding: '10px 16px',
                            background: 'var(--sidebar-bg)',
                            border: '1px solid var(--input-border)',
                            borderRadius: '8px',
                            cursor: loading ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            color: 'var(--text-color)',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={handleExportCSV}
                        style={{
                            padding: '10px 16px',
                            background: 'var(--primary-color)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            color: 'white'
                        }}
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid var(--input-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <Filter size={18} color="var(--text-muted)" />
                    <h3 style={{ margin: 0, fontSize: '1.1em', color: 'var(--text-color)' }}>Filters</h3>
                    <button
                        onClick={clearFilters}
                        style={{
                            marginLeft: 'auto',
                            padding: '6px 12px',
                            background: 'none',
                            border: '1px solid var(--input-border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85em',
                            color: 'var(--text-muted)'
                        }}
                    >
                        Clear All
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            Action Type
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., ASSIGN_PERSONA"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--input-border)',
                                fontSize: '0.9em',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            Profile ID
                        </label>
                        <input
                            type="text"
                            placeholder="Search profile..."
                            value={filters.profileId}
                            onChange={(e) => setFilters({ ...filters, profileId: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--input-border)',
                                fontSize: '0.9em',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            Changed By
                        </label>
                        <input
                            type="text"
                            placeholder="User/System"
                            value={filters.changedBy}
                            onChange={(e) => setFilters({ ...filters, changedBy: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--input-border)',
                                fontSize: '0.9em',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            Date From
                        </label>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--input-border)',
                                fontSize: '0.9em',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '5px' }}>
                            Date To
                        </label>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid var(--input-border)',
                                fontSize: '0.9em',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)'
                            }}
                        />
                    </div>
                </div>

                <div style={{ marginTop: '15px', padding: '10px', background: 'var(--sidebar-bg)', borderRadius: '6px', fontSize: '0.85em', color: 'var(--text-muted)' }}>
                    Showing <strong>{filteredLogs.length}</strong> of <strong>{logs.length}</strong> total records
                </div>
            </div>

            {/* Logs Table */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', border: '1px solid var(--input-border)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                        <thead>
                            <tr style={{ background: 'var(--sidebar-bg)', textAlign: 'left', borderBottom: '2px solid var(--input-border)' }}>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Calendar size={14} />
                                        Timestamp
                                    </div>
                                </th>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <FileText size={14} />
                                        Action
                                    </div>
                                </th>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <User size={14} />
                                        Profile ID
                                    </div>
                                </th>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>Changed By</th>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>Reason</th>
                                <th style={{ padding: '15px', fontWeight: '600', color: 'var(--text-muted)' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No logs found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, idx) => (
                                    <tr
                                        key={log.id || idx}
                                        style={{
                                            borderBottom: '1px solid var(--input-border)',
                                            transition: 'background 0.2s',
                                            background: 'var(--card-bg)'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--sidebar-bg)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'var(--card-bg)'}
                                    >
                                        <td style={{ padding: '15px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '12px',
                                                background: log.action.includes('ASSIGN') ? 'rgba(59, 130, 246, 0.1)' :
                                                    log.action.includes('REMOVE') ? 'rgba(239, 68, 68, 0.1)' : 'var(--sidebar-bg)',
                                                color: log.action.includes('ASSIGN') ? 'var(--primary-color)' :
                                                    log.action.includes('REMOVE') ? '#ef4444' : 'var(--text-muted)',
                                                fontSize: '0.85em',
                                                fontWeight: '600'
                                            }}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td style={{ padding: '15px', fontFamily: 'monospace', fontSize: '0.85em', color: 'var(--text-color)' }}>
                                            {log.profile_id || <span style={{ color: 'var(--text-muted)' }}>System</span>}
                                        </td>
                                        <td style={{ padding: '15px', color: 'var(--text-color)' }}>
                                            {log.changed_by || 'System'}
                                        </td>
                                        <td style={{ padding: '15px', color: 'var(--text-muted)', fontStyle: 'italic', maxWidth: '200px' }}>
                                            {log.reason || '-'}
                                        </td>
                                        <td style={{ padding: '15px' }}>
                                            <div
                                                style={{
                                                    maxWidth: '250px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    color: 'var(--text-muted)',
                                                    fontSize: '0.85em'
                                                }}
                                                title={JSON.stringify(log.details, null, 2)}
                                            >
                                                {log.details ? JSON.stringify(log.details) : '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default EnhancedAuditLogViewer;
