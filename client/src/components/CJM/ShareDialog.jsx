import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Link, Copy, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '../common/Toast';

export function ShareDialog({ mapId, onClose }) {
    const toast = useToast();
    const [shares, setShares] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [permission, setPermission] = useState('view');
    const [publicLink, setPublicLink] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadShares();
        axios.get('/api/users?limit=100').then(res => {
            if (res.data.users && Array.isArray(res.data.users)) setUsers(res.data.users);
            else if (Array.isArray(res.data)) setUsers(res.data);
            else setUsers([]);
        }).catch(() => { });
    }, []);

    const loadShares = async () => {
        try {
            const res = await axios.get(`/api/cjm/${mapId}/shares`);
            setShares(res.data);
        } catch (e) {
            console.error("Failed to load shares:", e);
        }
    };

    const shareWithUser = async () => {
        try {
            const res = await axios.post(`/api/cjm/${mapId}/share`, {
                user_id: selectedUserId || null,
                permission
            });
            setShares([res.data, ...shares]);
            setSelectedUserId('');
        } catch (e) {
            toast.error("Share failed: " + e.message);
        }
    };

    const generatePublicLink = async () => {
        try {
            const res = await axios.post(`/api/cjm/${mapId}/share`, {
                permission: 'view'
            });
            const link = `${window.location.origin}/api/cjm/shared/${res.data.share_token}`;
            setPublicLink(link);
            setShares([res.data, ...shares]);
        } catch (e) {
            toast.error("Failed to generate link: " + e.message);
        }
    };

    const deleteShare = async (shareId) => {
        try {
            await axios.delete(`/api/cjm/${mapId}/shares/${shareId}`);
            setShares(shares.filter(s => s.id !== shareId));
        } catch (e) {
            console.error("Failed to delete share:", e);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const PERM_LABELS = { view: 'View', comment: 'Comment', edit: 'Edit' };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '480px', maxHeight: '70vh',
                overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Share Journey Map</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                </div>

                {/* Share with user */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Share with user</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select
                            value={selectedUserId}
                            onChange={e => setSelectedUserId(e.target.value)}
                            style={{ flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                            <option value="">Select user...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                        <select
                            value={permission}
                            onChange={e => setPermission(e.target.value)}
                            style={{ padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                            <option value="view">View</option>
                            <option value="comment">Comment</option>
                            <option value="edit">Edit</option>
                        </select>
                        <button
                            onClick={shareWithUser}
                            style={{
                                border: 'none', background: 'var(--primary-color, #3b82f6)', color: 'white',
                                borderRadius: '6px', padding: '8px 12px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <UserPlus size={16} />
                        </button>
                    </div>
                </div>

                {/* Public link */}
                <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>Public link</label>
                    {publicLink ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                value={publicLink}
                                readOnly
                                style={{
                                    flex: 1, padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px',
                                    fontSize: '0.8rem', color: '#64748b', background: '#f8fafc'
                                }}
                            />
                            <button
                                onClick={() => copyToClipboard(publicLink)}
                                style={{
                                    border: '1px solid #e2e8f0', background: 'white', borderRadius: '6px',
                                    padding: '8px', cursor: 'pointer', color: copied ? '#10b981' : '#64748b'
                                }}
                            >
                                <Copy size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={generatePublicLink}
                            style={{
                                border: '1px dashed #e2e8f0', background: 'white', borderRadius: '6px',
                                padding: '10px 16px', cursor: 'pointer', color: '#64748b', fontSize: '0.85rem',
                                display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center'
                            }}
                        >
                            <Link size={16} /> Generate Public Link
                        </button>
                    )}
                </div>

                {/* Existing shares */}
                <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '6px' }}>
                        Shared with ({shares.length})
                    </label>
                    {shares.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '0.85rem' }}>
                            Not shared with anyone yet
                        </div>
                    ) : (
                        shares.map(share => (
                            <div key={share.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '8px 10px', borderRadius: '6px', border: '1px solid #f1f5f9', marginBottom: '6px'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.85rem', color: '#334155' }}>
                                        {share.shared_with_user_id ? `User #${share.shared_with_user_id}` : 'Public Link'}
                                    </span>
                                    <span style={{
                                        marginLeft: '8px', padding: '2px 6px', borderRadius: '8px',
                                        fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b'
                                    }}>
                                        {PERM_LABELS[share.permission] || share.permission}
                                    </span>
                                </div>
                                <button
                                    onClick={() => deleteShare(share.id)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
