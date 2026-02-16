import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Ticket, ArrowLeft, ArrowRight, Circle, Check } from 'lucide-react';

const FONT = 'var(--font-family, "Outfit", "Google Sans", system-ui, sans-serif)';
const RADIUS = 'var(--border-radius, 24px)';
const TRANSITION = 'var(--transition-fast, 0.2s cubic-bezier(0.2, 0, 0, 1))';

const BTN_RESET = {
    backgroundImage: 'none', textTransform: 'none', letterSpacing: 'normal',
    boxShadow: 'none', fontFamily: FONT, fontSize: 'inherit', fontWeight: 'inherit',
    padding: 0, border: 'none', borderRadius: 0, cursor: 'pointer', background: 'none',
};

const WORKFLOW_STEPS = ['new', 'open', 'pending', 'resolved', 'closed'];

export function TicketDetailView({ ticketId: propsTicketId, onBack, user }) {
    const { id: urlTicketId } = useParams();
    const ticketId = propsTicketId || urlTicketId;
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language?.startsWith('ar');

    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('details');
    const [auditLogs, setAuditLogs] = useState([]);
    const [transitions, setTransitions] = useState([]);
    const [users, setUsers] = useState([]);

    // Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    // Conversation state
    const [newMessage, setNewMessage] = useState('');
    const [msgType, setMsgType] = useState('public');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        loadTicket();
        loadUsers();
        loadTransitions();
    }, [ticketId]);

    useEffect(() => {
        if (activeTab === 'activity') loadAuditLogs();
    }, [activeTab, ticketId]);

    useEffect(() => {
        if (messagesEndRef.current && activeTab === 'conversations') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [ticket?.messages, activeTab]);

    const loadTicket = () => {
        setLoading(true);
        axios.get(`/api/crm/tickets/${ticketId}`)
            .then(res => {
                setTicket(res.data);
                setEditData({
                    subject: res.data.subject,
                    description: res.data.description || '',
                    issue: res.data.issue || '', analysis: res.data.analysis || '', solution: res.data.solution || '',
                    request_type: res.data.request_type || '', impact: res.data.impact || '',
                    status: res.data.status, priority: res.data.priority,
                    mode: res.data.mode || '', level: res.data.level || '', urgency: res.data.urgency || '',
                    group_name: res.data.group_name || '', category: res.data.category || '',
                    assets: res.data.assets || '', assigned_user_id: res.data.assigned_user_id,
                });
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    const loadUsers = () => { axios.get('/api/users').then(r => setUsers(r.data)).catch(() => { }); };
    const loadTransitions = () => { axios.get(`/api/crm/tickets/${ticketId}/transitions`).then(r => setTransitions(r.data.allowedTransitions || [])).catch(() => { }); };
    const loadAuditLogs = () => { axios.get(`/api/crm/tickets/${ticketId}/audit`).then(r => setAuditLogs(r.data)).catch(() => { }); };

    const handleUpdate = async () => {
        try {
            await axios.put(`/api/crm/tickets/${ticketId}`, editData);
            setIsEditing(false);
            loadTicket();
            loadTransitions();
        } catch (err) {
            const msg = err.response?.data?.error || 'Update failed';
            console.error(msg);
        }
    };

    const handleTransition = async (newStatus) => {
        try {
            await axios.put(`/api/crm/tickets/${ticketId}`, { status: newStatus });
            loadTicket();
            loadTransitions();
        } catch (err) {
            console.error('Transition failed:', err.response?.data?.error || err.message);
        }
    };

    const handleAssignToMe = async () => {
        const userId = user?.user?.id || user?.id;
        if (!userId) return;
        try {
            await axios.put(`/api/crm/tickets/${ticketId}`, { assigned_user_id: userId });
            loadTicket();
        } catch (err) { console.error(err); }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || sending) return;
        setSending(true);
        try {
            await axios.post(`/api/crm/tickets/${ticketId}/messages`, { body: newMessage, type: msgType });
            setNewMessage('');
            loadTicket();
        } catch (err) { console.error(err); }
        finally { setSending(false); }
    };

    const getSlaInfo = (ticket) => {
        if (!ticket.resolution_due_at) return { text: '-', color: 'var(--text-muted)' };
        if (ticket.status === 'resolved' || ticket.status === 'closed') return { text: 'Met', color: '#22c55e' };
        const diff = (new Date(ticket.resolution_due_at) - new Date()) / (1000 * 60 * 60);
        if (diff < 0) return { text: `Overdue ${Math.abs(Math.round(diff))}h`, color: '#ef4444', bold: true };
        if (diff < 4) return { text: `${Math.round(diff)}h remaining`, color: '#f59e0b' };
        return { text: `${Math.round(diff)}h remaining`, color: 'var(--text-muted)' };
    };

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
        background: 'var(--input-bg, #f0f2f5)',
        border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
        borderRadius: `calc(${RADIUS} * 0.33)`,
        padding: '8px 12px', fontSize: '0.9em', color: 'var(--text-color)', fontFamily: FONT,
        outline: 'none', width: '100%', boxSizing: 'border-box',
    };

    const labelSt = { fontSize: '0.8em', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6, display: 'block' };

    if (loading) {
        return (
            <div style={{ padding: 40, fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr' }}>
                <div style={{ ...glassCard, maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: '1.1em', color: 'var(--text-muted)' }}>Loading ticket...</div>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div style={{ padding: 40, fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr' }}>
                <div style={{ ...glassCard, maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 60 }}>
                    <div style={{ fontSize: '1.1em', color: '#ef4444', fontWeight: 600 }}>Ticket not found</div>
                    <button onClick={onBack} style={{ ...BTN_RESET, marginTop: 16, padding: '10px 24px', borderRadius: `calc(${RADIUS} * 0.33)`, border: '1px solid var(--glass-border)', fontWeight: 600, color: 'var(--text-color)' }}>Go Back</button>
                </div>
            </div>
        );
    }

    const statusColors = { new: '#3b82f6', open: '#22c55e', pending: '#f59e0b', resolved: '#64748b', closed: '#0f172a' };
    const prioColors = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };
    const sla = getSlaInfo(ticket);

    return (
        <div style={{ fontFamily: FONT, direction: isRtl ? 'rtl' : 'ltr', color: 'var(--text-color, #1a1c1e)', minHeight: '100vh' }}>

            {/* Top Action Bar */}
            <div style={{ ...glassCard, borderRadius: `calc(${RADIUS} * 0.5)`, padding: '10px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={onBack} style={{ ...BTN_RESET, padding: '8px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 600, fontSize: '0.9em', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} {t('common.back', 'Back')}
                    </button>
                    <button onClick={() => { if (isEditing) { handleUpdate(); } else { setIsEditing(true); } }} style={{ ...BTN_RESET, padding: '8px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, border: '1px solid var(--glass-border, rgba(0,0,0,0.08))', fontWeight: 600, fontSize: '0.9em', color: isEditing ? '#22c55e' : 'var(--text-color)' }}>
                        {isEditing ? t('common.save', 'Save') : t('common.edit', 'Edit')}
                    </button>
                    {isEditing && (
                        <button onClick={() => { setIsEditing(false); loadTicket(); }} style={{ ...BTN_RESET, padding: '8px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, border: '1px solid var(--glass-border)', fontWeight: 600, fontSize: '0.9em', color: '#ef4444' }}>
                            {t('common.cancel', 'Cancel')}
                        </button>
                    )}
                </div>
                {!isEditing && transitions.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {transitions.map(tr => (
                            <button key={tr} onClick={() => handleTransition(tr)} style={{ ...BTN_RESET, padding: '7px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, background: tr === 'closed' ? '#ef4444' : 'var(--primary-color)', color: '#fff', fontWeight: 700, fontSize: '0.82em', textTransform: 'uppercase' }}>
                                {tr === 'open' && ticket.status === 'closed' ? 'Reopen' : tr === 'open' && ticket.status === 'resolved' ? 'Reopen' : tr}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Header Card */}
            <div style={{ ...glassCard, marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 44, height: 44, borderRadius: `calc(${RADIUS} * 0.33)`, background: `color-mix(in srgb, var(--primary-color) 15%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)', flexShrink: 0 }}>
                    <Ticket size={24} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <h1 style={{ margin: 0, fontSize: '1.4em', fontWeight: 800, color: 'var(--text-color)' }}>
                            {ticket.ticket_code || `#${ticket.id}`} — {ticket.subject}
                        </h1>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', fontSize: '0.88em', color: 'var(--text-muted)' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 16, fontSize: '0.85em', fontWeight: 700, background: `color-mix(in srgb, ${statusColors[ticket.status] || '#64748b'} 15%, transparent)`, color: statusColors[ticket.status] || 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {ticket.status}
                        </span>
                        <span style={{ color: prioColors[ticket.priority] || 'var(--text-muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Circle size={8} fill="currentColor" /> {ticket.priority}
                        </span>
                        <span>
                            SLA: <span style={{ color: sla.color, fontWeight: sla.bold ? 700 : 500 }}>{sla.text}</span>
                        </span>
                        <span>
                            By <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>{ticket.contact_name || 'Unknown'}</span> on {new Date(ticket.created_at).toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Workflow Progress Bar */}
            <div style={{ ...glassCard, marginBottom: 16, padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                    {/* Connecting line */}
                    <div style={{ position: 'absolute', top: '50%', [isRtl ? 'right' : 'left']: 24, [isRtl ? 'left' : 'right']: 24, height: 3, background: 'var(--input-bg, #e2e8f0)', borderRadius: 2, transform: 'translateY(-50%)', zIndex: 0 }} />
                    {/* Active line */}
                    {(() => {
                        const idx = WORKFLOW_STEPS.indexOf(ticket.status);
                        const pct = idx >= 0 ? (idx / (WORKFLOW_STEPS.length - 1)) * 100 : 0;
                        return (
                            <div style={{ position: 'absolute', top: '50%', [isRtl ? 'right' : 'left']: 24, width: `calc(${pct}% - 48px)`, height: 3, background: 'var(--primary-color)', borderRadius: 2, transform: 'translateY(-50%)', zIndex: 1, transition: 'width 0.4s ease' }} />
                        );
                    })()}
                    {WORKFLOW_STEPS.map((step, i) => {
                        const currentIdx = WORKFLOW_STEPS.indexOf(ticket.status);
                        const isPast = i < currentIdx;
                        const isCurrent = i === currentIdx;
                        return (
                            <div key={step} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative' }}>
                                <div style={{
                                    width: isCurrent ? 32 : 24, height: isCurrent ? 32 : 24,
                                    borderRadius: '50%',
                                    background: isCurrent ? 'var(--primary-color)' : isPast ? `color-mix(in srgb, var(--primary-color) 60%, transparent)` : 'var(--input-bg, #e2e8f0)',
                                    border: isCurrent ? '3px solid var(--primary-color)' : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: (isCurrent || isPast) ? '#fff' : 'var(--text-muted)',
                                    fontSize: '0.7em', fontWeight: 700,
                                    transition: TRANSITION,
                                    boxShadow: isCurrent ? '0 0 0 4px color-mix(in srgb, var(--primary-color) 20%, transparent)' : 'none',
                                }}>
                                    {isPast ? <Check size={14} /> : (i + 1)}
                                </div>
                                <span style={{ fontSize: '0.72em', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--primary-color)' : 'var(--text-muted)', marginTop: 6, textTransform: 'capitalize' }}>
                                    {step}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Layout: Tabs + Sidebar */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                {/* Left: Tabs */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Tab Bar */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid var(--glass-border, rgba(0,0,0,0.06))' }}>
                        {['details', 'conversations', 'activity'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    ...BTN_RESET,
                                    padding: '12px 24px',
                                    fontWeight: activeTab === tab ? 700 : 500,
                                    fontSize: '0.92em',
                                    color: activeTab === tab ? 'var(--primary-color)' : 'var(--text-muted)',
                                    borderBottom: activeTab === tab ? '2px solid var(--primary-color)' : '2px solid transparent',
                                    marginBottom: -2,
                                    textTransform: 'capitalize',
                                    transition: TRANSITION,
                                }}
                            >
                                {t(`tickets.tabs.${tab}`, tab)}
                            </button>
                        ))}
                    </div>

                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* Description */}
                            <div style={glassCard}>
                                <div style={labelSt}>{t('tickets.detail.description', 'Description')}</div>
                                {isEditing ? (
                                    <textarea value={editData.description} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} rows={4} style={{ ...inputBase, resize: 'vertical' }} />
                                ) : (
                                    <div style={{ color: 'var(--text-color)', lineHeight: 1.7, fontSize: '0.95em' }}>{ticket.description || '-'}</div>
                                )}
                            </div>

                            {/* Resolution */}
                            <div style={glassCard}>
                                <div style={{ ...labelSt, marginBottom: 14 }}>{t('tickets.detail.resolution', 'Resolution')}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {[
                                        { key: 'issue', label: t('tickets.detail.issue', 'Issue') },
                                        { key: 'analysis', label: t('tickets.detail.analysis', 'Analysis') },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <div style={{ ...labelSt, fontSize: '0.75em' }}>{f.label}</div>
                                            {isEditing ? (
                                                <textarea value={editData[f.key]} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))} rows={3} style={{ ...inputBase, resize: 'vertical' }} />
                                            ) : (
                                                <div style={{ fontSize: '0.9em', color: 'var(--text-color)' }}>{ticket[f.key] || '-'}</div>
                                            )}
                                        </div>
                                    ))}
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ ...labelSt, fontSize: '0.75em' }}>{t('tickets.detail.solution', 'Solution')}</div>
                                        {isEditing ? (
                                            <textarea value={editData.solution} onChange={e => setEditData(d => ({ ...d, solution: e.target.value }))} rows={3} style={{ ...inputBase, resize: 'vertical' }} />
                                        ) : (
                                            <div style={{ fontSize: '0.9em', color: 'var(--text-color)' }}>{ticket.solution || '-'}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Classification Fields */}
                            <div style={glassCard}>
                                <div style={{ ...labelSt, marginBottom: 14 }}>{t('tickets.detail.classification', 'Classification')}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                    {[
                                        { key: 'request_type', label: 'Request Type', opts: ['Incident', 'Service Request', 'Problem', 'Change', 'Access'] },
                                        { key: 'impact', label: 'Impact', opts: ['Low', 'Medium', 'High', 'Critical', 'Site Wide'] },
                                        { key: 'mode', label: 'Mode', opts: ['Web', 'E-Mail', 'Telephone', 'Walk-in', 'Chat'] },
                                        { key: 'urgency', label: 'Urgency', opts: ['Low', 'Medium', 'High', 'Urgent'] },
                                        { key: 'level', label: 'Level', opts: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'] },
                                        { key: 'priority', label: 'Priority', opts: ['low', 'medium', 'high', 'urgent'] },
                                    ].map(f => (
                                        <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}</span>
                                            {isEditing ? (
                                                <select value={editData[f.key] || ''} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputBase, width: '55%', cursor: 'pointer' }}>
                                                    <option value="">-</option>
                                                    {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text-color)' }}>{ticket[f.key] || '-'}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Requester */}
                            <div style={glassCard}>
                                <div style={{ ...labelSt, marginBottom: 14 }}>{t('tickets.detail.requester', 'Requester Details')}</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 600 }}>Name</span>
                                        <span style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--primary-color)' }}>{ticket.contact_name || '-'}</span>
                                    </div>
                                    {[
                                        { key: 'group_name', label: 'Group' },
                                        { key: 'category', label: 'Category' },
                                        { key: 'assets', label: 'Assets' },
                                    ].map(f => (
                                        <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 600 }}>{f.label}</span>
                                            {isEditing ? (
                                                <input value={editData[f.key] || ''} onChange={e => setEditData(d => ({ ...d, [f.key]: e.target.value }))} style={{ ...inputBase, width: '55%' }} />
                                            ) : (
                                                <span style={{ fontSize: '0.9em', fontWeight: 600, color: 'var(--text-color)' }}>{ticket[f.key] || '-'}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Conversations Tab */}
                    {activeTab === 'conversations' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            {/* Messages */}
                            <div style={{ ...glassCard, maxHeight: 500, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 20px' }}>
                                {(!ticket.messages || ticket.messages.length === 0) && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: '0.95em' }}>No messages yet. Start the conversation below.</div>
                                )}
                                {ticket.messages?.map(msg => (
                                    <div key={msg.id} style={{
                                        padding: '14px 18px',
                                        borderRadius: `calc(${RADIUS} * 0.4)`,
                                        background: msg.type === 'internal'
                                            ? 'color-mix(in srgb, #f59e0b 8%, var(--glass-bg, white))'
                                            : 'var(--card-bg, #fff)',
                                        border: msg.type === 'internal'
                                            ? '1px solid color-mix(in srgb, #f59e0b 25%, transparent)'
                                            : '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `color-mix(in srgb, var(--primary-color) 15%, transparent)`, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', fontWeight: 700 }}>
                                                    {(msg.sender_name || 'S')[0].toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 700, fontSize: '0.88em', color: 'var(--text-color)' }}>{msg.sender_name || 'System'}</span>
                                                {msg.type === 'internal' && <span style={{ fontSize: '0.72em', fontWeight: 700, color: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 12%, transparent)', padding: '2px 8px', borderRadius: 10 }}>Internal</span>}
                                            </div>
                                            <span style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleString()}</span>
                                        </div>
                                        <div style={{ fontSize: '0.92em', lineHeight: 1.6, color: 'var(--text-color)' }}>{msg.body}</div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Box */}
                            <div style={glassCard}>
                                <textarea
                                    value={newMessage} onChange={e => setNewMessage(e.target.value)}
                                    placeholder={t('tickets.conversations.placeholder', 'Type a reply...')}
                                    rows={3}
                                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendMessage(); }}
                                    style={{ ...inputBase, resize: 'vertical', marginBottom: 12 }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 4, background: 'var(--input-bg)', borderRadius: `calc(${RADIUS} * 0.25)`, padding: 3 }}>
                                        {['public', 'internal'].map(type => (
                                            <button key={type} onClick={() => setMsgType(type)} style={{
                                                ...BTN_RESET, padding: '6px 14px', borderRadius: `calc(${RADIUS} * 0.2)`,
                                                background: msgType === type ? (type === 'internal' ? '#f59e0b' : 'var(--primary-color)') : 'transparent',
                                                color: msgType === type ? '#fff' : 'var(--text-muted)',
                                                fontWeight: 700, fontSize: '0.8em', textTransform: 'capitalize',
                                            }}>
                                                {type === 'public' ? t('tickets.conversations.public', 'Public') : t('tickets.conversations.internal', 'Internal')}
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={handleSendMessage} disabled={!newMessage.trim() || sending} style={{ ...BTN_RESET, background: 'var(--primary-color)', color: '#fff', padding: '8px 24px', borderRadius: `calc(${RADIUS} * 0.33)`, fontWeight: 700, fontSize: '0.88em', opacity: (!newMessage.trim() || sending) ? 0.5 : 1 }}>
                                        {sending ? t('tickets.conversations.sending', 'Sending...') : t('tickets.conversations.send', 'Send')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activity Tab */}
                    {activeTab === 'activity' && (
                        <div style={glassCard}>
                            <div style={{ ...labelSt, marginBottom: 16 }}>{t('tickets.activity.title', 'Activity Timeline')}</div>
                            {auditLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: '0.95em' }}>No activity recorded yet.</div>
                            ) : (
                                <div style={{ position: 'relative', paddingInlineStart: 24 }}>
                                    {/* Timeline line */}
                                    <div style={{ position: 'absolute', [isRtl ? 'right' : 'left']: 8, top: 6, bottom: 6, width: 2, background: 'var(--glass-border, rgba(0,0,0,0.1))', borderRadius: 1 }} />
                                    {auditLogs.map((log, i) => {
                                        let details = {};
                                        try { details = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {}); } catch { details = {}; }
                                        return (
                                            <div key={log.id || i} style={{ position: 'relative', marginBottom: 20, paddingInlineStart: 20 }}>
                                                <div style={{ position: 'absolute', [isRtl ? 'right' : 'left']: -20, top: 4, width: 12, height: 12, borderRadius: '50%', background: 'var(--primary-color)', border: '2px solid var(--glass-bg, white)', zIndex: 1 }} />
                                                <div style={{ fontSize: '0.78em', color: 'var(--text-muted)', marginBottom: 4 }}>
                                                    {new Date(log.created_at).toLocaleString()} — <span style={{ fontWeight: 700 }}>{log.actor_name || 'System'}</span>
                                                </div>
                                                <div style={{ fontSize: '0.88em', color: 'var(--text-color)' }}>
                                                    <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{log.action}</span>
                                                    {Object.keys(details).length > 0 && (
                                                        <span style={{ color: 'var(--text-muted)', marginInlineStart: 8 }}>
                                                            {Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div style={{ width: 320, flexShrink: 0 }}>
                    <div style={{ ...glassCard, position: 'sticky', top: 20 }}>
                        <div style={{ ...labelSt, marginBottom: 16, fontSize: '0.9em' }}>{t('tickets.sidebar.properties', 'Properties')}</div>
                        <div style={{ display: 'grid', gap: 16 }}>
                            {/* Status */}
                            <div>
                                <div style={labelSt}>Status</div>
                                <span style={{ padding: '4px 12px', borderRadius: 14, fontSize: '0.82em', fontWeight: 700, background: `color-mix(in srgb, ${statusColors[ticket.status]} 15%, transparent)`, color: statusColors[ticket.status], textTransform: 'uppercase' }}>
                                    {ticket.status}
                                </span>
                            </div>

                            {/* Priority */}
                            <div>
                                <div style={labelSt}>Priority</div>
                                <span style={{ color: prioColors[ticket.priority] || 'var(--text-muted)', fontWeight: 700, fontSize: '0.92em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Circle size={8} fill="currentColor" /> {ticket.priority}
                                </span>
                            </div>

                            {/* Assignee */}
                            <div>
                                <div style={labelSt}>Assignee</div>
                                {isEditing ? (
                                    <select value={editData.assigned_user_id || ''} onChange={e => setEditData(d => ({ ...d, assigned_user_id: e.target.value ? parseInt(e.target.value) : null }))} style={{ ...inputBase, cursor: 'pointer' }}>
                                        <option value="">Unassigned</option>
                                        {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                                    </select>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {ticket.assignee_name ? (
                                            <>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                                                <span style={{ fontSize: '0.9em', fontWeight: 600 }}>{ticket.assignee_name}</span>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}>Unassigned</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Assign to Me */}
                            {!isEditing && (
                                <button onClick={handleAssignToMe} style={{ ...BTN_RESET, padding: '8px 16px', borderRadius: `calc(${RADIUS} * 0.25)`, border: '1px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.85em', textAlign: 'center' }}>
                                    {t('tickets.sidebar.assignMe', 'Assign to Me')}
                                </button>
                            )}

                            <div style={{ height: 1, background: 'var(--glass-border, rgba(0,0,0,0.08))' }} />

                            {/* SLA Dates */}
                            <div>
                                <div style={labelSt}>First Response Due</div>
                                <div style={{ fontSize: '0.88em', color: 'var(--text-color)' }}>
                                    {ticket.first_response_due_at ? new Date(ticket.first_response_due_at).toLocaleString() : '-'}
                                </div>
                            </div>
                            <div>
                                <div style={labelSt}>Resolution Due</div>
                                <div style={{ fontSize: '0.88em', color: sla.color, fontWeight: sla.bold ? 700 : 500 }}>
                                    {ticket.resolution_due_at ? new Date(ticket.resolution_due_at).toLocaleString() : '-'}
                                </div>
                            </div>

                            {ticket.closed_at && (
                                <div>
                                    <div style={labelSt}>Closed At</div>
                                    <div style={{ fontSize: '0.88em', color: 'var(--text-color)' }}>{new Date(ticket.closed_at).toLocaleString()}</div>
                                </div>
                            )}

                            <div style={{ height: 1, background: 'var(--glass-border, rgba(0,0,0,0.08))' }} />

                            {/* Channel */}
                            <div>
                                <div style={labelSt}>Channel</div>
                                <span style={{ fontSize: '0.88em', fontWeight: 600, color: 'var(--text-color)', textTransform: 'capitalize' }}>{ticket.channel || 'web'}</span>
                            </div>

                            {/* Ticket ID */}
                            <div>
                                <div style={labelSt}>Ticket ID</div>
                                <span style={{ fontSize: '0.88em', color: 'var(--text-muted)' }}>#{ticket.id}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
