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
                    border: '1px solid rgba(6, 78, 59, 0.2)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#064e3b', // Dark Green Icon
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#064e3b'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(6, 78, 59, 0.2)'}
            >
                <Bell size={20} color="#064e3b" fill="#064e3b" />
                {unread > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', color: 'white', fontSize: '0.7em', padding: '2px 6px', borderRadius: '10px', border: '2px solid white' }}>
                        {unread}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{ position: 'absolute', top: '45px', insetInlineEnd: '0', width: '320px', background: '#ecfdf5', border: '1px solid rgba(6, 78, 59, 0.2)', borderRadius: '12px', boxShadow: '0 10px 25px -3px rgba(6, 78, 59, 0.15)', zIndex: 9999, maxHeight: '400px', overflowY: 'auto' }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid rgba(6, 78, 59, 0.1)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#064e3b' }}>
                        <span>Notifications</span>
                        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8em', color: '#059669' }}>Refresh</button>
                    </div>
                    {list.length === 0 && <div style={{ padding: '30px', textAlign: 'center', color: '#064e3b' }}>No notifications</div>}
                    {list.map(n => (
                        <div key={n.id} onClick={() => n.is_read ? null : markRead(n.id)} style={{ padding: '12px', borderBottom: '1px solid rgba(6, 78, 59, 0.05)', background: n.is_read ? 'transparent' : 'rgba(255,255,255,0.5)', cursor: n.is_read ? 'default' : 'pointer', transition: 'background 0.2s' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9em', color: '#064e3b' }}>{n.title}</div>
                            <div style={{ fontSize: '0.85em', color: '#064e3b', margin: '4px 0', opacity: 0.8 }}>{n.message}</div>
                            <div style={{ fontSize: '0.75em', color: '#064e3b', opacity: 0.6 }}>{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
