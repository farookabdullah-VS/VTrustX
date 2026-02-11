import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const FONT = 'var(--font-family, "Outfit", "Google Sans", "Inter", system-ui, sans-serif)';
const RADIUS = 'var(--border-radius, 24px)';
const TRANSITION = 'var(--transition-fast, 0.2s cubic-bezier(0.2, 0, 0, 1))';

const BTN_RESET = {
    backgroundImage: 'none', textTransform: 'none', letterSpacing: 'normal',
    boxShadow: 'none', fontFamily: FONT, fontSize: 'inherit', fontWeight: 'inherit',
    padding: 0, border: 'none', borderRadius: 0, cursor: 'pointer', background: 'none',
};

const STATUS_OPTIONS = ['new', 'open', 'pending', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const CHANNEL_OPTIONS = ['web', 'email', 'phone', 'chat'];

export function TicketListView({ onSelectTicket, user }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language?.startsWith('ar');

    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterPriority, setFilterPriority] = useState('');
    const [filterAssignee, setFilterAssignee] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const searchTimer = useRef(null);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkAssignee, setBulkAssignee] = useState('');

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [createData, setCreateData] = useState({ subject: '', description: '', priority: 'medium', channel: 'web' });
    const [creating, setCreating] = useState(false);

    useEffect(() => { loadUsers(); loadStats(); }, []);
    useEffect(() => { loadTickets(); }, [pagination.page, filterStatus, filterPriority, filterAssignee, dateFrom, dateTo, sortField, sortOrder]);

    useEffect(() => {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => loadTickets(), 400);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
    }, [search]);

    const loadUsers = () => {
        axios.get('/api/users').then(r => setUsers(r.data)).catch(() => {});
    };

    const loadStats = () => {
        axios.get('/api/crm/stats').then(r => setStats(r.data)).catch(() => {});
    };

    const loadTickets = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', pagination.page);
        params.set('limit', pagination.limit);
        params.set('sort', sortField);
        params.set('order', sortOrder);
        if (search) params.set('search', search);
        if (filterStatus) params.set('status', filterStatus);
        if (filterPriority) params.set('priority', filterPriority);
        if (filterAssignee) params.set('assignee', filterAssignee);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        axios.get(`/api/crm/tickets?${params.toString()}`)
            .then(res => {
                if (res.data.data) {
                    setTickets(res.data.data);
                    setPagination(p => ({ ...p, ...res.data.pagination }));
                } else {
                    setTickets(res.data);
                    setPagination(p => ({ ...p, total: res.data.length, totalPages: 1 }));
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [pagination.page, pagination.limit, search, filterStatus, filterPriority, filterAssignee, dateFrom, dateTo, sortField, sortOrder]);

    const handleSort = (field) => {
        if (sortField === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortOrder('desc'); }
    };

    const clearFilters = () => {
        setSearch(''); setFilterStatus(''); setFilterPriority(''); setFilterAssignee(''); setDateFrom(''); setDateTo('');
        setPagination(p => ({ ...p, page: 1 }));
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === tickets.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(tickets.map(t => t.id)));
    };

    const handleBulkAction = async (action) => {
        if (selectedIds.size === 0) return;
        const updates = {};
        if (action === 'close') updates.status = 'closed';
        else if (action === 'status' && bulkStatus) updates.status = bulkStatus;
        else if (action === 'assign' && bulkAssignee) updates.assigned_user_id = parseInt(bulkAssignee);
        else return;

        try {
            await axios.put('/api/crm/tickets/bulk', { ticketIds: [...selectedIds], updates });
            setSelectedIds(new Set());
            setBulkStatus(''); setBulkAssignee('');
            loadTickets(); loadStats();
        } catch (err) {
            console.error('Bulk action failed:', err);
        }
    };

    const handleCreate = async () => {
        if (!createData.subject.trim()) return;
        setCreating(true);
        try {
            await axios.post('/api/crm/tickets', createData);
            setShowCreate(false);
            setCreateData({ subject: '', description: '', priority: 'medium', channel: 'web' });
            loadTickets(); loadStats();
        } catch (err) {
            console.error('Create failed:', err);
        } finally {
            setCreating(false);
        }
    };

    const getSlaInfo = (ticket) => {
        if (!ticket.resolution_due_at) return { text: '-', color: 'var(--text-muted, #64748b)' };
        if (ticket.status === 'resolved' || ticket.status === 'closed') return { text: 'Done', color: 'var(--primary-color)' };
        const diff = (new Date(ticket.resolution_due_at) - new Date()) / (1000 * 60 * 60);
        if (diff < 0) return { text: `Overdue ${Math.abs(Math.round(diff))}h`, color: '#ef4444', bold: true };
        if (diff < 4) return { text: `${Math.round(diff)}h left`, color: '#f59e0b' };
        return { text: `${Math.round(diff)}h left`, color: 'var(--text-muted, #64748b)' };
    };

    const hasFilters = search || filterStatus || filterPriority || filterAssignee || dateFrom || dateTo;
    const totalOpen = stats ? (stats.byStatus?.find(s => s.status === 'open')?.count || 0) : 0;
    const totalResolved = stats ? ((stats.byStatus?.find(s => s.status === 'resolved')?.count || 0) + (stats.byStatus?.find(s => s.status === 'closed')?.count || 0)) : 0;
    const totalAll = stats ? stats.byStatus?.reduce((a, s) => a + parseInt(s.count), 0) || 0 : 0;
    const breaches = stats?.breaches || 0;

    // Styles
    const glassCard = {
        background: 'var(--glass-bg, rgba(255,255,255,0.85))',
        backdropFilter: 'blur(var(--glass-blur, 24px))',
        WebkitBackdropFilter: 'blur(var(--glass-blur, 24px))',
        border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
        borderRadius: `calc(${RADIUS} * 0.67)`,
        padding: '20px',
        transition: TRANSITION,
    };

    const inputBase = {
        ...BTN_RESET,
        background: 'var(--input-bg, #f0f2f5)',
        border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
        borderRadius: `calc(${RADIUS} * 0.33)`,
        padding: '8px 14px',
        fontSize: '0.9em',
        color: 'var(--text-color, #1a1c1e)',
        fontFamily: FONT,
        outline: 'none',
        cursor: 'auto',
        transition: TRANSITION,
    };

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '10px 20px', fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr', color: 'var(--text-color, #1a1c1e)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8em', fontWeight: 800, color: 'var(--text-color)' }}>{t('tickets.title', 'Tickets')}</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted, #64748b)', fontSize: '0.95em' }}>{t('tickets.subtitle', 'Manage support requests')}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => onSelectTicket('reports')} style={{ ...BTN_RESET, background: 'var(--input-bg)', border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', padding: '10px 20px', borderRadius: `calc(${RADIUS} * 0.33)`, fontWeight: 600, fontSize: '0.9em', color: 'var(--text-muted)' }}>
                        {t('tickets.reports', 'Reports')}
                    </button>
                    <button onClick={() => setShowCreate(true)} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '10px 24px', borderRadius: `calc(${RADIUS} * 0.33)`, fontWeight: 700, fontSize: '0.9em' }}>
                        + {t('tickets.new', 'New Ticket')}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {[
                    { label: t('tickets.kpi.total', 'Total Tickets'), value: totalAll, color: 'var(--primary-color)' },
                    { label: t('tickets.kpi.open', 'Open'), value: totalOpen, color: '#3b82f6' },
                    { label: t('tickets.kpi.resolved', 'Resolved'), value: totalResolved, color: '#22c55e' },
                    { label: t('tickets.kpi.breaches', 'SLA Breaches'), value: breaches, color: '#ef4444' },
                ].map((kpi, i) => (
                    <div key={i} style={glassCard}>
                        <div style={{ fontSize: '0.8em', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                        <div style={{ fontSize: '2.2em', fontWeight: 800, color: kpi.color, marginTop: 6 }}>{kpi.value}</div>
                    </div>
                ))}
            </div>

            {/* Filter Bar */}
            <div style={{ ...glassCard, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <input
                    type="text" value={search} onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    placeholder={t('tickets.search', 'Search tickets...')}
                    style={{ ...inputBase, flex: '1 1 200px', minWidth: 180 }}
                />
                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="">{t('tickets.filter.allStatus', 'All Status')}</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
                <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="">{t('tickets.filter.allPriority', 'All Priority')}</option>
                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <select value={filterAssignee} onChange={e => { setFilterAssignee(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} style={{ ...inputBase, cursor: 'pointer' }}>
                    <option value="">{t('tickets.filter.allAssignee', 'All Assignees')}</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }} title="From date" />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }} title="To date" />
                {hasFilters && (
                    <button onClick={clearFilters} style={{ ...BTN_RESET, color: '#ef4444', fontWeight: 600, fontSize: '0.85em', padding: '8px 12px' }}>
                        {t('tickets.filter.clear', 'Clear')}
                    </button>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div style={{ ...glassCard, padding: '10px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: `color-mix(in srgb, var(--primary-color) 8%, var(--glass-bg, white))` }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9em' }}>{selectedIds.size} {t('tickets.selected', 'selected')}</span>
                    <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                        <option value="">{t('tickets.bulk.changeStatus', 'Change Status')}</option>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    {bulkStatus && <button onClick={() => handleBulkAction('status')} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '6px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, fontWeight: 600, fontSize: '0.85em' }}>Apply</button>}
                    <select value={bulkAssignee} onChange={e => setBulkAssignee(e.target.value)} style={{ ...inputBase, cursor: 'pointer' }}>
                        <option value="">{t('tickets.bulk.assign', 'Assign To')}</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                    </select>
                    {bulkAssignee && <button onClick={() => handleBulkAction('assign')} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '6px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, fontWeight: 600, fontSize: '0.85em' }}>Assign</button>}
                    <button onClick={() => handleBulkAction('close')} style={{ ...BTN_RESET, background: '#ef4444', color: '#fff', padding: '6px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, fontWeight: 600, fontSize: '0.85em' }}>
                        {t('tickets.bulk.close', 'Close All')}
                    </button>
                </div>
            )}

            {/* Table */}
            <div style={{ ...glassCard, padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    /* Loading Skeleton */
                    <div style={{ padding: 0 }}>
                        {[...Array(8)].map((_, i) => (
                            <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 20px', borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
                                {[60, 200, 100, 80, 70, 100, 80, 90].map((w, j) => (
                                    <div key={j} style={{ width: w, height: 16, borderRadius: 8, background: 'var(--input-bg, #f0f2f5)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 0.6 }} />
                                ))}
                            </div>
                        ))}
                        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }`}</style>
                    </div>
                ) : tickets.length === 0 ? (
                    /* Empty State */
                    <div style={{ padding: '80px 40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3em', marginBottom: 16, opacity: 0.3 }}>&#128203;</div>
                        <h3 style={{ margin: '0 0 8px', color: 'var(--text-color)', fontWeight: 700 }}>
                            {hasFilters ? t('tickets.emptyFiltered', 'No tickets match your filters') : t('tickets.empty', 'No tickets yet')}
                        </h3>
                        <p style={{ color: 'var(--text-muted, #64748b)', margin: '0 0 20px', fontSize: '0.95em' }}>
                            {hasFilters ? t('tickets.tryClear', 'Try adjusting your filters') : t('tickets.createFirst', 'Create your first support ticket to get started')}
                        </p>
                        {!hasFilters && (
                            <button onClick={() => setShowCreate(true)} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '12px 28px', borderRadius: `calc(${RADIUS} * 0.33)`, fontWeight: 700, fontSize: '0.95em' }}>
                                + {t('tickets.createFirst.btn', 'Create First Ticket')}
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--glass-border, rgba(0,0,0,0.08))' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', width: 40 }}>
                                            <input type="checkbox" checked={selectedIds.size === tickets.length && tickets.length > 0} onChange={toggleSelectAll} style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }} />
                                        </th>
                                        {[
                                            { key: 'ticket_code', label: t('tickets.table.code', 'Code') },
                                            { key: 'subject', label: t('tickets.table.subject', 'Subject') },
                                            { key: 'status', label: t('tickets.table.status', 'Status') },
                                            { key: 'priority', label: t('tickets.table.priority', 'Priority') },
                                            { key: null, label: t('tickets.table.assignee', 'Assignee') },
                                            { key: null, label: t('tickets.table.sla', 'SLA') },
                                            { key: 'created_at', label: t('tickets.table.created', 'Created') },
                                        ].map((col, i) => (
                                            <th
                                                key={i}
                                                onClick={col.key ? () => handleSort(col.key) : undefined}
                                                style={{
                                                    padding: '12px 16px',
                                                    textAlign: isRtl ? 'right' : 'left',
                                                    fontWeight: 700,
                                                    color: 'var(--text-muted, #64748b)',
                                                    fontSize: '0.85em',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    cursor: col.key ? 'pointer' : 'default',
                                                    userSelect: 'none',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {col.label}
                                                {col.key && sortField === col.key && (
                                                    <span style={{ marginInlineStart: 4, fontSize: '0.9em' }}>{sortOrder === 'asc' ? '\u25B2' : '\u25BC'}</span>
                                                )}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map(ticket => {
                                        const sla = getSlaInfo(ticket);
                                        const statusColors = { new: '#3b82f6', open: '#22c55e', pending: '#f59e0b', resolved: '#64748b', closed: '#0f172a' };
                                        const prioColors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };
                                        const sc = statusColors[ticket.status] || 'var(--text-muted)';
                                        const pc = prioColors[ticket.priority] || 'var(--text-muted)';

                                        return (
                                            <tr
                                                key={ticket.id}
                                                style={{ borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.06))', cursor: 'pointer', transition: TRANSITION }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--input-bg, #f8fafc)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" checked={selectedIds.has(ticket.id)} onChange={() => toggleSelect(ticket.id)} style={{ cursor: 'pointer', accentColor: 'var(--primary-color)' }} />
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {ticket.ticket_code || `#${ticket.id}`}
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px' }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-color)' }}>{ticket.subject}</div>
                                                    {ticket.description && <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: 2, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.description.substring(0, 60)}</div>}
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px', borderRadius: 20, fontSize: '0.8em', fontWeight: 700,
                                                        background: `color-mix(in srgb, ${sc} 15%, transparent)`, color: sc, textTransform: 'uppercase',
                                                    }}>
                                                        {t(`tickets.status.${ticket.status}`, ticket.status)}
                                                    </span>
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px' }}>
                                                    <span style={{ color: pc, fontWeight: 700, fontSize: '0.9em' }}>
                                                        &#9679; {ticket.priority}
                                                    </span>
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px' }}>
                                                    {ticket.assignee_name ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: `color-mix(in srgb, var(--primary-color) 15%, transparent)`, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 700 }}>
                                                                {ticket.assignee_name[0]?.toUpperCase()}
                                                            </div>
                                                            <span style={{ fontSize: '0.9em' }}>{ticket.assignee_name}</span>
                                                        </div>
                                                    ) : <span style={{ color: 'var(--text-muted)', opacity: 0.5, fontSize: '0.85em' }}>{t('tickets.unassigned', 'Unassigned')}</span>}
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                                    <span style={{ color: sla.color, fontWeight: sla.bold ? 700 : 500, fontSize: '0.85em' }}>
                                                        {sla.text}
                                                    </span>
                                                </td>
                                                <td onClick={() => onSelectTicket(ticket.id)} style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.85em', whiteSpace: 'nowrap' }}>
                                                    {new Date(ticket.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
                                <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>
                                    {t('tickets.showing', 'Showing')} {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} {t('tickets.of', 'of')} {pagination.total}
                                </span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                        disabled={pagination.page <= 1}
                                        style={{ ...BTN_RESET, padding: '6px 14px', borderRadius: `calc(${RADIUS} * 0.25)`, background: pagination.page <= 1 ? 'var(--input-bg)' : 'var(--glass-bg)', border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 600, fontSize: '0.85em', color: 'var(--text-color)', opacity: pagination.page <= 1 ? 0.4 : 1 }}
                                    >
                                        {isRtl ? '\u25B6' : '\u25C0'}
                                    </button>
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (pagination.totalPages <= 5) pageNum = i + 1;
                                        else if (pagination.page <= 3) pageNum = i + 1;
                                        else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                        else pageNum = pagination.page - 2 + i;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                                style={{ ...BTN_RESET, padding: '6px 12px', borderRadius: `calc(${RADIUS} * 0.25)`, background: pageNum === pagination.page ? 'var(--primary-color)' : 'var(--glass-bg)', color: pageNum === pagination.page ? '#fff' : 'var(--text-color)', border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 700, fontSize: '0.85em', minWidth: 36 }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                                        disabled={pagination.page >= pagination.totalPages}
                                        style={{ ...BTN_RESET, padding: '6px 14px', borderRadius: `calc(${RADIUS} * 0.25)`, background: pagination.page >= pagination.totalPages ? 'var(--input-bg)' : 'var(--glass-bg)', border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 600, fontSize: '0.85em', color: 'var(--text-color)', opacity: pagination.page >= pagination.totalPages ? 0.4 : 1 }}
                                    >
                                        {isRtl ? '\u25C0' : '\u25B6'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Ticket Modal */}
            {showCreate && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreate(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ ...glassCard, background: 'var(--card-bg, #fff)', width: '100%', maxWidth: 520, padding: 32, borderRadius: RADIUS }}>
                        <h2 style={{ margin: '0 0 20px', fontWeight: 800, color: 'var(--text-color)', fontSize: '1.3em' }}>{t('tickets.createModal.title', 'Create Ticket')}</h2>
                        <div style={{ display: 'grid', gap: 14 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('tickets.createModal.subject', 'Subject')} *</label>
                                <input
                                    value={createData.subject} onChange={e => setCreateData(d => ({ ...d, subject: e.target.value }))}
                                    placeholder={t('tickets.createModal.subjectPlaceholder', 'Brief description of the issue')}
                                    style={{ ...inputBase, width: '100%', padding: '10px 14px', boxSizing: 'border-box' }}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('tickets.createModal.description', 'Description')}</label>
                                <textarea
                                    value={createData.description} onChange={e => setCreateData(d => ({ ...d, description: e.target.value }))}
                                    placeholder={t('tickets.createModal.descPlaceholder', 'Detailed description...')}
                                    rows={4}
                                    style={{ ...inputBase, width: '100%', padding: '10px 14px', resize: 'vertical', boxSizing: 'border-box' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('tickets.createModal.priority', 'Priority')}</label>
                                    <select value={createData.priority} onChange={e => setCreateData(d => ({ ...d, priority: e.target.value }))} style={{ ...inputBase, width: '100%', padding: '10px 14px', cursor: 'pointer', boxSizing: 'border-box' }}>
                                        {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85em', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{t('tickets.createModal.channel', 'Channel')}</label>
                                    <select value={createData.channel} onChange={e => setCreateData(d => ({ ...d, channel: e.target.value }))} style={{ ...inputBase, width: '100%', padding: '10px 14px', cursor: 'pointer', boxSizing: 'border-box' }}>
                                        {CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                            <button onClick={() => setShowCreate(false)} style={{ ...BTN_RESET, padding: '10px 24px', borderRadius: `calc(${RADIUS} * 0.33)`, border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 600, fontSize: '0.9em', color: 'var(--text-muted)' }}>
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button onClick={handleCreate} disabled={creating || !createData.subject.trim()} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '10px 28px', borderRadius: `calc(${RADIUS} * 0.33)`, fontWeight: 700, fontSize: '0.9em', opacity: (creating || !createData.subject.trim()) ? 0.6 : 1 }}>
                                {creating ? t('common.creating', 'Creating...') : t('tickets.createModal.create', 'Create')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
