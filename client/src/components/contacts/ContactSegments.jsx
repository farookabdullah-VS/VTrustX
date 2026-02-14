/**
 * Contact Segments Manager
 *
 * Manage contact segments for targeted campaigns
 * - List all segments with member counts
 * - Create dynamic segments with conditions
 * - Refresh segment membership
 * - View segment members
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Users,
    Plus,
    RefreshCw,
    Eye,
    Filter,
    Trash2,
    Tag,
    TrendingUp
} from 'lucide-react';
import './ContactSegments.css';

const ContactSegments = () => {
    const [segments, setSegments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshing, setRefreshing] = useState(null);

    const [newSegment, setNewSegment] = useState({
        name: '',
        description: '',
        is_dynamic: true,
        conditions: {
            tags: [],
            lifecycle_stage: '',
            source: '',
            engagement_score_min: 0,
            engagement_score_max: 100,
            is_suppressed: false
        }
    });

    useEffect(() => {
        fetchSegments();
    }, []);

    const fetchSegments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/advanced-contacts/segments');
            setSegments(response.data.segments || []);
        } catch (error) {
            console.error('Failed to fetch segments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSegment = async () => {
        try {
            // Clean up conditions - remove empty values
            const cleanConditions = {};
            if (newSegment.conditions.tags && newSegment.conditions.tags.length > 0) {
                cleanConditions.tags = newSegment.conditions.tags;
            }
            if (newSegment.conditions.lifecycle_stage) {
                cleanConditions.lifecycle_stage = newSegment.conditions.lifecycle_stage;
            }
            if (newSegment.conditions.source) {
                cleanConditions.source = newSegment.conditions.source;
            }
            if (newSegment.conditions.engagement_score_min > 0) {
                cleanConditions.engagement_score_min = newSegment.conditions.engagement_score_min;
            }
            if (newSegment.conditions.engagement_score_max < 100) {
                cleanConditions.engagement_score_max = newSegment.conditions.engagement_score_max;
            }
            if (newSegment.conditions.is_suppressed) {
                cleanConditions.is_suppressed = newSegment.conditions.is_suppressed;
            }

            await axios.post('/api/advanced-contacts/segments', {
                ...newSegment,
                conditions: cleanConditions
            });

            alert('Segment created successfully!');
            setShowCreateModal(false);
            resetForm();
            fetchSegments();
        } catch (error) {
            alert('Failed to create segment: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleRefreshSegment = async (segmentId) => {
        try {
            setRefreshing(segmentId);
            await axios.post(`/api/advanced-contacts/segments/${segmentId}/refresh`);
            fetchSegments();
        } catch (error) {
            alert('Failed to refresh segment: ' + (error.response?.data?.error || error.message));
        } finally {
            setRefreshing(null);
        }
    };

    const resetForm = () => {
        setNewSegment({
            name: '',
            description: '',
            is_dynamic: true,
            conditions: {
                tags: [],
                lifecycle_stage: '',
                source: '',
                engagement_score_min: 0,
                engagement_score_max: 100,
                is_suppressed: false
            }
        });
    };

    const handleConditionChange = (field, value) => {
        setNewSegment(prev => ({
            ...prev,
            conditions: {
                ...prev.conditions,
                [field]: value
            }
        }));
    };

    const addTag = () => {
        const tag = prompt('Enter tag name:');
        if (tag) {
            setNewSegment(prev => ({
                ...prev,
                conditions: {
                    ...prev.conditions,
                    tags: [...(prev.conditions.tags || []), tag]
                }
            }));
        }
    };

    const removeTag = (index) => {
        setNewSegment(prev => ({
            ...prev,
            conditions: {
                ...prev.conditions,
                tags: prev.conditions.tags.filter((_, i) => i !== index)
            }
        }));
    };

    if (loading) {
        return (
            <div className="contact-segments">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading segments...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="contact-segments">
            {/* Header */}
            <div className="segments-header">
                <div>
                    <h1><Users size={28} /> Contact Segments</h1>
                    <p>Organize contacts into targeted groups</p>
                </div>
                <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={18} />
                    Create Segment
                </button>
            </div>

            {/* Segments Grid */}
            {segments.length === 0 ? (
                <div className="empty-state">
                    <Filter size={64} />
                    <h3>No segments yet</h3>
                    <p>Create your first segment to organize contacts</p>
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        Create Segment
                    </button>
                </div>
            ) : (
                <div className="segments-grid">
                    {segments.map(segment => (
                        <div key={segment.id} className="segment-card">
                            <div className="segment-header">
                                <h3>{segment.name}</h3>
                                <span className={`badge ${segment.is_dynamic ? 'dynamic' : 'static'}`}>
                                    {segment.is_dynamic ? 'Dynamic' : 'Static'}
                                </span>
                            </div>

                            {segment.description && (
                                <p className="segment-description">{segment.description}</p>
                            )}

                            <div className="segment-stats">
                                <div className="stat">
                                    <Users size={20} />
                                    <span>{segment.contact_count || 0} contacts</span>
                                </div>
                                {segment.last_calculated_at && (
                                    <small>
                                        Updated: {new Date(segment.last_calculated_at).toLocaleDateString()}
                                    </small>
                                )}
                            </div>

                            <div className="segment-actions">
                                <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => window.location.href = `/contact-master?segment=${segment.id}`}
                                    title="View Contacts"
                                >
                                    <Eye size={16} />
                                    View
                                </button>
                                {segment.is_dynamic && (
                                    <button
                                        className="btn-secondary btn-sm"
                                        onClick={() => handleRefreshSegment(segment.id)}
                                        disabled={refreshing === segment.id}
                                        title="Refresh Segment"
                                    >
                                        <RefreshCw size={16} className={refreshing === segment.id ? 'spinning' : ''} />
                                        Refresh
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Segment</h3>
                            <button onClick={() => setShowCreateModal(false)}>&times;</button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group">
                                <label>Segment Name *</label>
                                <input
                                    type="text"
                                    value={newSegment.name}
                                    onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                                    placeholder="e.g., High-Value Customers"
                                />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={newSegment.description}
                                    onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                                    rows={2}
                                    placeholder="Brief description of this segment"
                                />
                            </div>

                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={newSegment.is_dynamic}
                                        onChange={(e) => setNewSegment({ ...newSegment, is_dynamic: e.target.checked })}
                                    />
                                    <span>Dynamic (auto-update based on conditions)</span>
                                </label>
                            </div>

                            <h4>Conditions</h4>

                            <div className="form-group">
                                <label>Tags</label>
                                <div className="tags-input">
                                    {newSegment.conditions.tags.map((tag, index) => (
                                        <span key={index} className="tag">
                                            {tag}
                                            <button onClick={() => removeTag(index)}>&times;</button>
                                        </span>
                                    ))}
                                    <button className="btn-add-tag" onClick={addTag}>
                                        <Plus size={14} /> Add Tag
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Lifecycle Stage</label>
                                <select
                                    value={newSegment.conditions.lifecycle_stage}
                                    onChange={(e) => handleConditionChange('lifecycle_stage', e.target.value)}
                                >
                                    <option value="">Any</option>
                                    <option value="lead">Lead</option>
                                    <option value="prospect">Prospect</option>
                                    <option value="customer">Customer</option>
                                    <option value="churned">Churned</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Source</label>
                                <select
                                    value={newSegment.conditions.source}
                                    onChange={(e) => handleConditionChange('source', e.target.value)}
                                >
                                    <option value="">Any</option>
                                    <option value="manual">Manual</option>
                                    <option value="import">Import</option>
                                    <option value="api">API</option>
                                    <option value="crm">CRM</option>
                                    <option value="form_submission">Form Submission</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Engagement Score Range</label>
                                <div className="range-inputs">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newSegment.conditions.engagement_score_min}
                                        onChange={(e) => handleConditionChange('engagement_score_min', parseInt(e.target.value))}
                                        placeholder="Min"
                                    />
                                    <span>to</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={newSegment.conditions.engagement_score_max}
                                        onChange={(e) => handleConditionChange('engagement_score_max', parseInt(e.target.value))}
                                        placeholder="Max"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateSegment}
                                disabled={!newSegment.name}
                            >
                                Create Segment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactSegments;
