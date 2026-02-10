import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell } from 'lucide-react';

export function Notifications() {
    const [isOpen, setIsOpen] = useState(false);
    const [list, setList] = useState([]);
    const [unread, setUnread] = useState(0);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const load = () => {
        axios.get('/api/notifications')
            .then(res => {
                setList(res.data);
                setUnread(res.data.filter(n => !n.is_read).length);
            })
            .catch(e => console.error(e)); // Silent fail
    };

    const markRead = (id) => {
        axios.put(`/api/notifications/${id}/read`)
            .then(() => {
                setList(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
                setUnread(prev => Math.max(0, prev - 1));
            });
    };

    return (
        <div style={{ position: 'relative', margin: '0 10px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
                style={{
                    background: 'transparent',
                    border: '1px solid var(--secondary-color, #cbd5e1)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--secondary-color, #64748b)',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--secondary-color, #64748b)'; e.currentTarget.style.color = 'white'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--secondary-color, #64748b)'; }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--secondary-color, #64748b)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unread > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', border: '2px solid white' }}>
                        {unread}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{ position: 'absolute', top: '45px', insetInlineEnd: '0', width: '320px', background: 'var(--input-bg)', border: '1px solid var(--primary-color)', borderRadius: '12px', boxShadow: '0 10px 25px -3px rgba(0,0,0,0.15)', zIndex: 9999, maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid var(--input-border)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--primary-color)' }}>
                        <span>Notifications</span>
                        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8em', color: 'var(--primary-hover)' }}>Refresh</button>
                    </div>
                    {list.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-color)' }}>No notifications</div>}
                    {list.map(n => (
                        <div key={n.id} onClick={() => n.is_read ? null : markRead(n.id)} style={{ padding: '12px', borderBottom: '1px solid var(--input-border)', background: n.is_read ? 'transparent' : 'rgba(0,0,0,0.02)', cursor: n.is_read ? 'default' : 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9em', color: 'var(--text-color)' }}>{n.title}</div>
                            <div style={{ fontSize: '0.85em', color: 'var(--text-color)', margin: '4px 0', opacity: 0.8 }}>{n.message}</div>
                            <div style={{ fontSize: '0.75em', color: '#94a3b8', opacity: 0.6 }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
