import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function TicketListView({ onSelectTicket, onCreateTicket }) {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.language === 'ar';
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTickets();
    }, []);

    const loadTickets = () => {
        setLoading(true);
        axios.get('/api/crm/tickets')
            .then(res => {
                setTickets(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'new': return '#3b82f6'; // blue
            case 'open': return '#22c55e'; // green
            case 'pending': return '#f59e0b'; // orange
            case 'resolved': return '#64748b'; // gray
            case 'closed': return '#0f172a'; // dark
            default: return '#94a3b8';
        }
    };

    const getPriorityColor = (p) => {
        switch (p) {
            case 'urgent': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            default: return '#94a3b8';
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif", direction: isRtl ? 'rtl' : 'ltr' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2em' }}>{t('tickets.title')}</h1>
                    <p style={{ color: '#64748b' }}>{t('tickets.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => onSelectTicket('reports')}
                        style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        📊 {t('tickets.reports')}
                    </button>
                    <button
                        onClick={onCreateTicket}
                        style={{ background: '#2563eb', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {t('tickets.new')}
                    </button>
                </div>
            </div>

            {loading ? <div>Loading...</div> : (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.code')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.subject')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.requester')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.status')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.priority')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.assignee')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.sla')}</th>
                                <th style={{ padding: '15px', textAlign: isRtl ? 'right' : 'left' }}>{t('tickets.table.created')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(ticket => (
                                <tr
                                    key={ticket.id}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onClick={() => onSelectTicket(ticket.id)}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                >
                                    <td style={{ padding: '15px', fontWeight: 'bold', color: '#64748b' }}>{ticket.ticket_code || ticket.id}</td>
                                    <td style={{ padding: '15px', fontWeight: '500', color: '#1e293b' }}>
                                        {ticket.subject}
                                        <div style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: '4px' }}>{ticket.description?.substring(0, 50)}...</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>{ticket.contact_name || 'Unknown'}</td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{
                                            padding: '4px 10px', borderRadius: '20px', fontSize: '0.85em', fontWeight: '600',
                                            background: `${getStatusColor(ticket.status)}20`, color: getStatusColor(ticket.status), textTransform: 'uppercase'
                                        }}>
                                            {t(`tickets.status.${ticket.status}`, ticket.status)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ color: getPriorityColor(ticket.priority), fontWeight: 'bold' }}>• {ticket.priority}</span>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        {ticket.assignee_name ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em' }}>
                                                    {ticket.assignee_name[0].toUpperCase()}
                                                </div>
                                                {ticket.assignee_name}
                                            </div>
                                        ) : <span style={{ color: '#cbd5e1' }}>{t('tickets.unassigned')}</span>}
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        {(() => {
                                            if (!ticket.resolution_due_at) return <span style={{ color: '#ccc' }}>-</span>;
                                            const due = new Date(ticket.resolution_due_at);
                                            const now = new Date();
                                            const diff = (due - now) / (1000 * 60 * 60); // hours
                                            const isOverdue = diff < 0;

                                            if (ticket.status === 'resolved' || ticket.status === 'closed') return <span style={{ color: '#22c55e' }}>✓ Done</span>;

                                            return (
                                                <span style={{
                                                    color: isOverdue ? '#ef4444' : (diff < 4 ? '#f59e0b' : '#64748b'),
                                                    fontWeight: isOverdue ? 'bold' : 'normal',
                                                    fontSize: '0.9em'
                                                }}>
                                                    {isOverdue ? `Overdue ${Math.abs(Math.round(diff))}h` : `Due in ${Math.round(diff)}h`}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: '15px', color: '#64748b', fontSize: '0.9em' }}>
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        {t('tickets.empty')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
