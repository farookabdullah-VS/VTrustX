import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Clock, Ticket, Search, RefreshCw, X, ChevronDown } from 'lucide-react';
import { useToast } from './common/Toast';
import { Pagination } from './common/Pagination';
import * as ctlApi from '../services/closeLoopApi';

const ALERT_COLORS = {
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', badge: '#dc2626' },
    high: { bg: '#fff7ed', border: '#fdba74', text: '#9a3412', badge: '#ea580c' },
    medium: { bg: '#fefce8', border: '#fde047', text: '#854d0e', badge: '#ca8a04' },
    low: { bg: '#f0fdf4', border: '#86efac', text: '#166534', badge: '#16a34a' },
};

const STATUS_COLORS = {
    open: { bg: '#dbeafe', text: '#1e40af' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    resolved: { bg: '#d1fae5', text: '#065f46' },
    dismissed: { bg: '#f1f5f9', text: '#475569' },
};

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
}

function StatCard({ label, value, icon: Icon, color = '#3b82f6' }) {
    return (
        <div style={{ background: 'var(--card-bg, white)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--input-border, #e2e8f0)', flex: '1 1 140px', minWidth: '140px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {Icon && <Icon size={16} style={{ color }} />}
                <span style={{ fontSize: '0.8em', color: 'var(--text-muted, #64748b)' }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.6em', fontWeight: '700', color: 'var(--text-color, #0f172a)' }}>{value}</div>
        </div>
    );
}

export function CloseTheLoop({ formId }) {
    const toast = useToast();
    const [alerts, setAlerts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [statusFilter, setStatusFilter] = useState('');
    const [levelFilter, setLevelFilter] = useState('');

    // Inline ticket form state
    const [ticketFormAlertId, setTicketFormAlertId] = useState(null);
    const [ticketSubject, setTicketSubject] = useState('');
    const [ticketPriority, setTicketPriority] = useState('medium');
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [alertsData, statsData] = await Promise.all([
                ctlApi.getAlerts(formId, { status: statusFilter || undefined, alertLevel: levelFilter || undefined, page, limit }),
                ctlApi.getStats(formId),
            ]);
            setAlerts(alertsData.alerts);
            setTotal(alertsData.total);
            setStats(statsData);
        } catch (err) {
            toast.error('Failed to load alerts: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [formId, statusFilter, levelFilter, page, limit]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleCreateTicket = async (alertId) => {
        if (!ticketSubject.trim()) { toast.warning('Please enter a ticket subject'); return; }
        setSubmitting(true);
        try {
            await ctlApi.createTicketFromAlert(alertId, { subject: ticketSubject, priority: ticketPriority });
            toast.success('Ticket created successfully');
            setTicketFormAlertId(null);
            setTicketSubject('');
            setTicketPriority('medium');
            fetchData();
        } catch (err) {
            toast.error('Failed to create ticket: ' + (err.response?.data?.error || err.message));
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateStatus = async (alertId, status) => {
        try {
            await ctlApi.updateAlert(alertId, { status });
            toast.success(`Alert ${status === 'resolved' ? 'resolved' : 'dismissed'}`);
            fetchData();
        } catch (err) {
            toast.error('Failed to update alert: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleScan = async () => {
        setScanning(true);
        try {
            const result = await ctlApi.scanForm(formId);
            toast.success(`Scan complete: ${result.alertsCreated} new alerts from ${result.scanned} submissions`);
            fetchData();
        } catch (err) {
            toast.error('Scan failed: ' + (err.response?.data?.error || err.message));
        } finally {
            setScanning(false);
        }
    };

    const getRespondentInfo = (alert) => {
        const data = alert.submission_data || {};
        const name = data.name || data.Name || data.full_name || null;
        const email = data.email || data.Email || data.contact_email || null;
        return { name, email };
    };

    if (loading && alerts.length === 0) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', color: 'var(--text-muted, #64748b)' }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', marginRight: '10px' }} />
                Loading alerts...
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ── Metrics Bar ── */}
            {stats && (
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <StatCard label="Total Alerts" value={stats.total} icon={AlertTriangle} color="#6366f1" />
                    <StatCard label="Open" value={stats.byStatus?.open || 0} icon={Clock} color="#3b82f6" />
                    <StatCard label="In Progress" value={stats.byStatus?.in_progress || 0} icon={Ticket} color="#f59e0b" />
                    <StatCard label="Resolved" value={stats.byStatus?.resolved || 0} icon={CheckCircle} color="#22c55e" />
                    <StatCard
                        label="Resolution Rate"
                        value={`${stats.resolutionRate}%`}
                        icon={CheckCircle}
                        color="#10b981"
                    />
                    {stats.avgResolutionHours !== null && (
                        <StatCard label="Avg Resolution" value={`${stats.avgResolutionHours}h`} icon={Clock} color="#8b5cf6" />
                    )}
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                padding: '12px 16px', background: 'var(--card-bg, white)', borderRadius: '12px',
                border: '1px solid var(--input-border, #e2e8f0)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Search size={14} style={{ color: 'var(--text-muted, #64748b)' }} />
                    <span style={{ fontSize: '0.85em', color: 'var(--text-muted, #64748b)' }}>Filter:</span>
                </div>

                <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, white)', color: 'var(--text-color, #334155)', fontSize: '0.85em' }}
                >
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                </select>

                <select
                    value={levelFilter}
                    onChange={e => { setLevelFilter(e.target.value); setPage(1); }}
                    style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, white)', color: 'var(--text-color, #334155)', fontSize: '0.85em' }}
                >
                    <option value="">All Levels</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>

                <div style={{ flex: 1 }} />

                <button
                    onClick={handleScan}
                    disabled={scanning}
                    style={{
                        padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--input-border, #cbd5e1)',
                        background: 'var(--input-bg, white)', color: 'var(--text-color, #475569)',
                        fontSize: '0.85em', cursor: scanning ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    <RefreshCw size={14} style={scanning ? { animation: 'spin 1s linear infinite' } : {}} />
                    {scanning ? 'Scanning...' : 'Scan Past Submissions'}
                </button>
            </div>

            {/* ── Alert Cards ── */}
            {alerts.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '60px 20px',
                    background: 'var(--card-bg, white)', borderRadius: '12px',
                    border: '1px solid var(--input-border, #e2e8f0)'
                }}>
                    <AlertTriangle size={48} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '12px' }} />
                    <h3 style={{ color: 'var(--text-color, #334155)', margin: '0 0 8px' }}>No alerts found</h3>
                    <p style={{ color: 'var(--text-muted, #64748b)', margin: 0, fontSize: '0.9em' }}>
                        {statusFilter || levelFilter
                            ? 'Try changing your filters.'
                            : 'Alerts are created automatically when at-risk submissions are received. Click "Scan Past Submissions" to check existing responses.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {alerts.map(alert => {
                        const colors = ALERT_COLORS[alert.alert_level] || ALERT_COLORS.medium;
                        const statusColor = STATUS_COLORS[alert.status] || STATUS_COLORS.open;
                        const respondent = getRespondentInfo(alert);

                        return (
                            <div key={alert.id} style={{
                                background: 'var(--card-bg, white)', borderRadius: '12px',
                                border: `1px solid var(--input-border, #e2e8f0)`,
                                borderLeft: `4px solid ${colors.badge}`,
                                padding: '16px 20px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                    {/* Left section */}
                                    <div style={{ flex: 1, minWidth: '200px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                            {/* Alert level badge */}
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.75em', fontWeight: '600',
                                                background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
                                                textTransform: 'uppercase',
                                            }}>
                                                {alert.alert_level}
                                            </span>

                                            {/* Score */}
                                            {alert.score_value !== null && (
                                                <span style={{ fontSize: '0.85em', fontWeight: '600', color: 'var(--text-color, #334155)' }}>
                                                    {(alert.score_type || '').toUpperCase()}: {alert.score_value}
                                                </span>
                                            )}

                                            {/* Status pill */}
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '6px', fontSize: '0.72em', fontWeight: '500',
                                                background: statusColor.bg, color: statusColor.text,
                                            }}>
                                                {alert.status.replace('_', ' ')}
                                            </span>

                                            {/* Linked ticket */}
                                            {alert.ticket_code && (
                                                <span style={{ fontSize: '0.8em', color: 'var(--primary-color, #3b82f6)', fontWeight: '500' }}>
                                                    {alert.ticket_code}
                                                </span>
                                            )}
                                        </div>

                                        {/* Respondent info */}
                                        <div style={{ fontSize: '0.85em', color: 'var(--text-muted, #64748b)' }}>
                                            {respondent.name && <span style={{ fontWeight: '500', color: 'var(--text-color, #334155)' }}>{respondent.name}</span>}
                                            {respondent.name && respondent.email && <span> &middot; </span>}
                                            {respondent.email && <span>{respondent.email}</span>}
                                            {!respondent.name && !respondent.email && <span>Anonymous respondent</span>}
                                            <span> &middot; {formatRelativeTime(alert.submission_date || alert.created_at)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    {alert.status === 'open' && (
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => {
                                                    setTicketFormAlertId(ticketFormAlertId === alert.id ? null : alert.id);
                                                    setTicketSubject(`Follow-up: ${(alert.score_type || 'survey').toUpperCase()} score ${alert.score_value || ''} - Submission #${alert.submission_id}`);
                                                }}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8em', fontWeight: '500',
                                                    background: 'var(--primary-color, #3b82f6)', color: 'white',
                                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                }}
                                            >
                                                <Ticket size={13} /> Create Ticket
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8em', fontWeight: '500',
                                                    background: '#d1fae5', color: '#065f46',
                                                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                }}
                                            >
                                                <CheckCircle size={13} /> Resolve
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(alert.id, 'dismissed')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8em', fontWeight: '500',
                                                    background: 'var(--input-bg, #f1f5f9)', color: 'var(--text-muted, #64748b)',
                                                    border: '1px solid var(--input-border, #e2e8f0)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                }}
                                            >
                                                <X size={13} /> Dismiss
                                            </button>
                                        </div>
                                    )}

                                    {alert.status === 'in_progress' && !alert.ticket_id && (
                                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => handleUpdateStatus(alert.id, 'resolved')}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '8px', fontSize: '0.8em', fontWeight: '500',
                                                    background: '#d1fae5', color: '#065f46',
                                                    border: 'none', cursor: 'pointer',
                                                }}
                                            >
                                                Resolve
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Inline Ticket Creation Form */}
                                {ticketFormAlertId === alert.id && (
                                    <div style={{
                                        marginTop: '12px', padding: '14px', borderRadius: '10px',
                                        background: 'var(--deep-bg, #f8fafc)', border: '1px solid var(--input-border, #e2e8f0)',
                                        display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap',
                                    }}>
                                        <div style={{ flex: '1 1 250px' }}>
                                            <label style={{ fontSize: '0.78em', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Subject</label>
                                            <input
                                                type="text"
                                                value={ticketSubject}
                                                onChange={e => setTicketSubject(e.target.value)}
                                                placeholder="Ticket subject..."
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                                                    border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, white)',
                                                    color: 'var(--text-color, #334155)', fontSize: '0.85em',
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: '0 0 120px' }}>
                                            <label style={{ fontSize: '0.78em', color: 'var(--text-muted, #64748b)', display: 'block', marginBottom: '4px' }}>Priority</label>
                                            <select
                                                value={ticketPriority}
                                                onChange={e => setTicketPriority(e.target.value)}
                                                style={{
                                                    width: '100%', padding: '8px 10px', borderRadius: '8px',
                                                    border: '1px solid var(--input-border, #cbd5e1)', background: 'var(--input-bg, white)',
                                                    color: 'var(--text-color, #334155)', fontSize: '0.85em',
                                                }}
                                            >
                                                <option value="low">Low</option>
                                                <option value="medium">Medium</option>
                                                <option value="high">High</option>
                                                <option value="urgent">Urgent</option>
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => handleCreateTicket(alert.id)}
                                            disabled={submitting}
                                            style={{
                                                padding: '8px 16px', borderRadius: '8px', fontSize: '0.85em', fontWeight: '600',
                                                background: 'var(--primary-color, #3b82f6)', color: 'white',
                                                border: 'none', cursor: submitting ? 'wait' : 'pointer',
                                            }}
                                        >
                                            {submitting ? 'Creating...' : 'Create'}
                                        </button>
                                        <button
                                            onClick={() => setTicketFormAlertId(null)}
                                            style={{
                                                padding: '8px 12px', borderRadius: '8px', fontSize: '0.85em',
                                                background: 'none', color: 'var(--text-muted, #64748b)',
                                                border: '1px solid var(--input-border, #e2e8f0)', cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Pagination ── */}
            {total > limit && (
                <Pagination
                    currentPage={page}
                    totalItems={total}
                    pageSize={limit}
                    onPageChange={setPage}
                    showPageSize={false}
                />
            )}
        </div>
    );
}
