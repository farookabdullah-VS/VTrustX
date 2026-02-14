/**
 * Tags Manager
 *
 * Manage predefined contact tags
 * - Create tags with colors
 * - View tag usage statistics
 * - Edit tag properties
 * - Delete unused tags
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Tag,
    Plus,
    Edit3,
    Trash2,
    Users,
    TrendingUp
} from 'lucide-react';
import './TagsManager.css';

const TagsManager = () => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingTag, setEditingTag] = useState(null);

    const [newTag, setNewTag] = useState({
        name: '',
        color: 'blue',
        description: ''
    });

    const colorOptions = [
        { value: 'blue', label: 'Blue', hex: '#3B82F6' },
        { value: 'green', label: 'Green', hex: '#10B981' },
        { value: 'red', label: 'Red', hex: '#EF4444' },
        { value: 'yellow', label: 'Yellow', hex: '#F59E0B' },
        { value: 'purple', label: 'Purple', hex: '#8B5CF6' },
        { value: 'pink', label: 'Pink', hex: '#EC4899' },
        { value: 'indigo', label: 'Indigo', hex: '#6366F1' },
        { value: 'gray', label: 'Gray', hex: '#6B7280' },
        { value: 'orange', label: 'Orange', hex: '#F97316' },
        { value: 'teal', label: 'Teal', hex: '#14B8A6' }
    ];

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/advanced-contacts/tags');
            setTags(response.data.tags || []);
        } catch (error) {
            console.error('Failed to fetch tags:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTag = async () => {
        try {
            // For creating tags, we need to use the tags endpoint
            // Since there's no direct "create tag" endpoint, tags are created
            // automatically when added to contacts. This component is for
            // viewing and managing existing tags.

            alert('Tags are created automatically when added to contacts. Use Contact Segments or Contact Master to create tags.');
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            alert('Failed to create tag: ' + (error.response?.data?.error || error.message));
        }
    };

    const resetForm = () => {
        setNewTag({
            name: '',
            color: 'blue',
            description: ''
        });
        setEditingTag(null);
    };

    const getColorHex = (colorName) => {
        const color = colorOptions.find(c => c.value === colorName);
        return color ? color.hex : '#3B82F6';
    };

    if (loading) {
        return (
            <div className="tags-manager">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading tags...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tags-manager">
            {/* Header */}
            <div className="tags-header">
                <div>
                    <h1><Tag size={28} /> Contact Tags</h1>
                    <p>Manage tags for organizing contacts</p>
                </div>
                <button className="btn-secondary" disabled title="Tags are created when assigned to contacts">
                    <Plus size={18} />
                    Auto-created
                </button>
            </div>

            {/* Info Banner */}
            <div className="info-banner">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p>Tags are automatically created when you add them to contacts via Contact Segments or Contact Master.</p>
            </div>

            {/* Tags Grid */}
            {tags.length === 0 ? (
                <div className="empty-state">
                    <Tag size={64} />
                    <h3>No tags yet</h3>
                    <p>Tags will appear here when you add them to contacts</p>
                </div>
            ) : (
                <div className="tags-grid">
                    {tags
                        .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                        .map(tag => (
                            <div key={tag.id} className="tag-card">
                                <div className="tag-header">
                                    <div className="tag-icon" style={{ backgroundColor: getColorHex(tag.color) }}>
                                        <Tag size={20} />
                                    </div>
                                    <div className="tag-info">
                                        <h3>{tag.name}</h3>
                                        {tag.description && (
                                            <p className="tag-description">{tag.description}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="tag-stats">
                                    <div className="stat">
                                        <Users size={18} />
                                        <span>{tag.usage_count || 0} contacts</span>
                                    </div>
                                    <div className="stat">
                                        <TrendingUp size={18} />
                                        <span className="stat-badge" style={{ backgroundColor: getColorHex(tag.color) }}>
                                            {tag.color}
                                        </span>
                                    </div>
                                </div>

                                <div className="tag-preview">
                                    <span
                                        className="preview-tag"
                                        style={{
                                            backgroundColor: `${getColorHex(tag.color)}15`,
                                            color: getColorHex(tag.color),
                                            border: `1px solid ${getColorHex(tag.color)}40`
                                        }}
                                    >
                                        {tag.name}
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Usage Statistics */}
            {tags.length > 0 && (
                <div className="tags-stats-section">
                    <h2>Tag Usage Statistics</h2>
                    <div className="stats-cards">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Tag size={24} />
                            </div>
                            <div className="stat-content">
                                <h3>{tags.length}</h3>
                                <p>Total Tags</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <Users size={24} />
                            </div>
                            <div className="stat-content">
                                <h3>{tags.reduce((sum, tag) => sum + (tag.usage_count || 0), 0)}</h3>
                                <p>Total Assignments</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <TrendingUp size={24} />
                            </div>
                            <div className="stat-content">
                                <h3>{tags[0]?.name || 'N/A'}</h3>
                                <p>Most Used Tag</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal (disabled, kept for consistency) */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Tag</h3>
                            <button onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Tag Name *</label>
                                <input
                                    type="text"
                                    value={newTag.name}
                                    onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
                                    placeholder="e.g., VIP Customer"
                                />
                            </div>

                            <div className="form-group">
                                <label>Color</label>
                                <div className="color-picker">
                                    {colorOptions.map(color => (
                                        <button
                                            key={color.value}
                                            className={`color-option ${newTag.color === color.value ? 'selected' : ''}`}
                                            style={{ backgroundColor: color.hex }}
                                            onClick={() => setNewTag({ ...newTag, color: color.value })}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    value={newTag.description}
                                    onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                                    rows={2}
                                    placeholder="Brief description of this tag"
                                />
                            </div>

                            <div className="tag-preview-section">
                                <label>Preview:</label>
                                <span
                                    className="preview-tag"
                                    style={{
                                        backgroundColor: `${getColorHex(newTag.color)}15`,
                                        color: getColorHex(newTag.color),
                                        border: `1px solid ${getColorHex(newTag.color)}40`
                                    }}
                                >
                                    {newTag.name || 'Tag Name'}
                                </span>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateTag}
                                disabled={!newTag.name}
                            >
                                Create Tag
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagsManager;
