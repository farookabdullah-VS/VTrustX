import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Mail, Phone, Ticket, ClipboardList, Calendar, X, Clock } from 'lucide-react';

export function XMDirectory() {
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null); // ID
    const [timeline, setTimeline] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadContacts();
    }, [search]);

    const loadContacts = async () => {
        // Debounce could be added here
        try {
            const res = await axios.get(`/api/directory?search=${search}`);
            setContacts(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    const loadProfile = async (id) => {
        setLoading(true);
        setSelectedContact(id); // Set ID partially to show panel
        try {
            const res = await axios.get(`/api/directory/${id}/timeline`);
            setTimeline(res.data.timeline);
            // Update contact details if needed from separate header query
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const activeUser = contacts.find(c => c.id === selectedContact);

    return (
        <div style={{ display: 'flex', height: '100%', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

            {/* MAIN LIST AREA */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>XM Directory</h1>
                        <p style={{ color: '#64748b', marginTop: '8px' }}>The single source of truth for all customer profiles.</p>
                    </div>
                </div>

                {/* SEARCH BAR */}
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                    <input
                        placeholder="Search by name or email..."
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '16px 16px 16px 48px',
                            fontSize: '1em', borderRadius: '12px', border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}
                    />
                </div>

                {/* CONTACTS TABLE */}
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Email</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Tickets</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Added</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contacts.map(c => (
                                <tr
                                    key={c.id}
                                    onClick={() => loadProfile(c.id)}
                                    style={{
                                        borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                        background: selectedContact === c.id ? '#eff6ff' : 'white'
                                    }}
                                    className="hover-row"
                                >
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                            }}>
                                                {c.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: '600' }}>{c.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{c.email}</td>
                                    <td style={{ padding: '16px' }}>
                                        {c.ticket_count > 0 ? (
                                            <span style={{ padding: '4px 10px', background: '#fee2e2', color: '#dc2626', borderRadius: '12px', fontSize: '0.85em', fontWeight: 'bold' }}>
                                                {c.ticket_count} Tickets
                                            </span>
                                        ) : <span style={{ color: '#cbd5e1' }}>-</span>}
                                    </td>
                                    <td style={{ padding: '16px', color: '#94a3b8' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {contacts.length === 0 && (
                                <tr><td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No contacts found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* SLIDE-OVER PROFILE PANEL */}
            {selectedContact && activeUser && (
                <div style={{ width: '400px', background: 'white', borderLeft: '1px solid #e2e8f0', padding: '0', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 15px rgba(0,0,0,0.05)' }}>
                    {/* Header */}
                    <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', fontSize: '1.5em', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginBottom: '16px' }}>
                                {activeUser.name.charAt(0)}
                            </div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{activeUser.name}</h2>
                            <div style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <Mail size={14} /> {activeUser.email}
                            </div>
                        </div>
                        <button onClick={() => setSelectedContact(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={24} color="#94a3b8" /></button>
                    </div>

                    {/* Timeline */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#fafafa' }}>
                        <h3 style={{ fontSize: '0.85em', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '1px', marginBottom: '20px' }}>Interaction Timeline</h3>

                        {loading ? <div>Loading Timeline...</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                {timeline.map((event, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '16px' }}>
                                        {/* Line & Dot */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <div style={{
                                                width: '12px', height: '12px', borderRadius: '50%',
                                                background: event.type === 'ticket' ? '#f87171' : '#3b82f6',
                                                zIndex: 2
                                            }} />
                                            {i !== timeline.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e2e8f0', minHeight: '40px' }} />}
                                        </div>
                                        {/* Content */}
                                        <div style={{ paddingBottom: '32px' }}>
                                            <div style={{ fontSize: '0.85em', color: '#94a3b8', marginBottom: '4px' }}>
                                                {new Date(event.date).toLocaleDateString()} • {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e293b' }}>{event.title}</div>
                                                <div style={{ color: '#475569', fontSize: '0.9em' }}>{event.description}</div>
                                                {event.type === 'survey' && (
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75em', padding: '2px 8px', background: '#eff6ff', color: '#3b82f6', borderRadius: '4px', fontWeight: '600' }}>Survey</span>
                                                    </div>
                                                )}
                                                {event.type === 'ticket' && (
                                                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                                        <span style={{ fontSize: '0.75em', padding: '2px 8px', background: '#fef2f2', color: '#ef4444', borderRadius: '4px', fontWeight: '600' }}>CASE</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {timeline.length === 0 && <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>No history found.</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .hover-row:hover { background: #f8fafc !important; }
            `}</style>
        </div>
    );
}
