import React, { useState } from 'react';
import axios from 'axios';
import { X, Send, CheckCircle, Circle, MessageCircle } from 'lucide-react';

export function CJMComments({ mapId, comments, onCommentsChange, onClose }) {
    const [newComment, setNewComment] = useState('');
    const [filter, setFilter] = useState('all'); // all, unresolved, resolved

    const addComment = async () => {
        if (!newComment.trim()) return;
        try {
            const res = await axios.post(`/api/cjm/${mapId}/comments`, {
                content: newComment.trim()
            });
            onCommentsChange([res.data, ...comments]);
            setNewComment('');
        } catch (e) {
            alert("Failed to add comment: " + e.message);
        }
    };

    const toggleResolved = async (comment) => {
        try {
            await axios.put(`/api/cjm/${mapId}/comments/${comment.id}`, {
                resolved: !comment.resolved
            });
            onCommentsChange(comments.map(c =>
                c.id === comment.id ? { ...c, resolved: !c.resolved } : c
            ));
        } catch (e) {
            console.error("Failed to update comment:", e);
        }
    };

    const deleteComment = async (id) => {
        try {
            await axios.delete(`/api/cjm/${mapId}/comments/${id}`);
            onCommentsChange(comments.filter(c => c.id !== id));
        } catch (e) {
            console.error("Failed to delete comment:", e);
        }
    };

    const filtered = comments.filter(c => {
        if (filter === 'unresolved') return !c.resolved;
        if (filter === 'resolved') return c.resolved;
        return true;
    });

    return (
        <div className="cjm-panel" style={{ width: '320px', borderLeft: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    <MessageCircle size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Comments ({comments.filter(c => !c.resolved).length})
                </h3>
                <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>

            <div style={{ padding: '8px 16px', display: 'flex', gap: '6px', borderBottom: '1px solid #f1f5f9' }}>
                {['all', 'unresolved', 'resolved'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer',
                            border: filter === f ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                            background: filter === f ? '#eff6ff' : 'white',
                            color: filter === f ? '#1d4ed8' : '#64748b',
                            fontWeight: filter === f ? 600 : 400
                        }}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '0.9rem' }}>
                        No comments yet
                    </div>
                ) : (
                    filtered.map(comment => (
                        <div key={comment.id} style={{
                            padding: '10px',
                            marginBottom: '8px',
                            background: comment.resolved ? '#f8fafc' : 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            opacity: comment.resolved ? 0.7 : 1
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                                    {comment.user_name || 'User'}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {new Date(comment.created_at).toLocaleDateString()}
                                </span>
                            </div>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
                                {comment.content}
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => toggleResolved(comment)}
                                    style={{
                                        border: 'none', background: 'none', cursor: 'pointer',
                                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px',
                                        color: comment.resolved ? '#10b981' : '#94a3b8'
                                    }}
                                >
                                    {comment.resolved ? <CheckCircle size={12} /> : <Circle size={12} />}
                                    {comment.resolved ? 'Resolved' : 'Resolve'}
                                </button>
                                <button
                                    onClick={() => deleteComment(comment.id)}
                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#ef4444' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
                <input
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addComment()}
                    placeholder="Add a comment..."
                    style={{
                        flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px',
                        fontSize: '0.85rem', outline: 'none'
                    }}
                />
                <button
                    onClick={addComment}
                    style={{
                        border: 'none', background: 'var(--primary-color, #3b82f6)', color: 'white',
                        borderRadius: '8px', padding: '8px 12px', cursor: 'pointer'
                    }}
                >
                    <Send size={16} />
                </button>
            </div>
        </div>
    );
}
