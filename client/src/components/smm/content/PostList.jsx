import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Search, Filter, Plus, MoreHorizontal, Calendar,
    Facebook, Twitter, Instagram, Linkedin, Youtube,
    Image as ImageIcon, Video, FileText, CheckCircle, Clock
} from 'lucide-react';

/**
 * 3.3.2 Posts List
 * View all posts with status, campaign, and channel indicators.
 */
export function PostList() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/v1/smm/posts');
            setPosts(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch posts:", err);
            setPosts([]);
        }
        setLoading(false);
    };

    const platformIcons = {
        facebook: Facebook,
        twitter: Twitter,
        instagram: Instagram,
        linkedin: Linkedin,
        youtube: Youtube
    };

    const StatusBadge = ({ status }) => {
        const styles = {
            draft: { bg: '#f1f5f9', color: '#64748b' },
            active: { bg: '#dcfce7', color: '#166534' }, // Approximating 'active' to published or similar
            published: { bg: '#dcfce7', color: '#166534' },
            scheduled: { bg: '#dbeafe', color: '#1e40af' },
            review: { bg: '#ffedd5', color: '#9a3412' }
        };
        const style = styles[status?.toLowerCase()] || styles.draft;
        return (
            <span style={{
                padding: '4px 8px', borderRadius: '4px', fontSize: '0.75em', fontWeight: '600',
                background: style.bg, color: style.color, textTransform: 'uppercase'
            }}>
                {status || 'DRAFT'}
            </span>
        );
    };

    return (
        <div className="smm-post-list">
            {/* Header / Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.5em', fontWeight: 'bold', margin: '0 0 10px 0', color: '#1e293b' }}>Posts</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder="Search posts..."
                            style={{ padding: '8px 8px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '250px' }}
                        />
                    </div>
                    <button style={{ padding: '8px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={16} /> Filters
                    </button>
                    <button style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Plus size={16} /> Create Post
                    </button>
                </div>
            </div>

            {/* List Table */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading posts...</div>
            ) : (
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>CONTENT</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>STATUS</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>CHANNELS</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>CAMPAIGN</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600' }}>SCHEDULED</th>
                                <th style={{ padding: '16px', fontSize: '0.8em', color: '#64748b', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                        No posts found.
                                    </td>
                                </tr>
                            ) : posts.map(post => (
                                <tr key={post.post_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: '500', color: '#1e293b', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {post.title || post.content_json?.text || 'Untitled Post'}
                                        </div>
                                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                                            ID: {post.post_id.substring(0, 8)}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <StatusBadge status="draft" /> {/* TODO: Map lookup ID to name */}
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {/* Mock channels for now until map is fully joined */}
                                            <div style={{ padding: '4px', background: '#f1f5f9', borderRadius: '4px' }}><Facebook size={14} color="#64748b" /></div>
                                            <div style={{ padding: '4px', background: '#f1f5f9', borderRadius: '4px' }}><Linkedin size={14} color="#64748b" /></div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontSize: '0.9em', color: '#334155' }}>{post.campaign_name || '-'}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9em', color: '#64748b' }}>
                                            <Calendar size={14} />
                                            {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString() : 'Unscheduled'}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                                            <MoreHorizontal size={18} color="#94a3b8" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
