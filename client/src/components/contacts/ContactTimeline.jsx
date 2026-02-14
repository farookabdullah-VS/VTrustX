/**
 * Contact Timeline Component
 *
 * Displays chronological activity history for a contact
 * - Email sent/received
 * - SMS sent/received
 * - WhatsApp messages
 * - Form submissions
 * - Distribution assignments
 * - Manual notes
 * - Custom events
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import {
    Clock,
    Mail,
    MessageSquare,
    Send,
    FileText,
    UserPlus,
    Tag,
    Edit3,
    CheckCircle,
    AlertCircle,
    Phone,
    Globe,
    Calendar,
    X
} from 'lucide-react';
import './ContactTimeline.css';

const ContactTimeline = ({ contactId, onClose }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddActivity, setShowAddActivity] = useState(false);
    const [newActivity, setNewActivity] = useState({
        activity_type: 'note',
        activity_data: {
            subject: '',
            description: ''
        }
    });

    useEffect(() => {
        if (contactId) {
            fetchTimeline();
        }
    }, [contactId]);

    const fetchTimeline = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/advanced-contacts/${contactId}/timeline`);
            setActivities(response.data.activities || []);
        } catch (error) {
            console.error('Failed to fetch timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddActivity = async () => {
        try {
            await axios.post(`/api/advanced-contacts/${contactId}/activity`, newActivity);

            setShowAddActivity(false);
            setNewActivity({
                activity_type: 'note',
                activity_data: {
                    subject: '',
                    description: ''
                }
            });
            fetchTimeline();
        } catch (error) {
            alert('Failed to add activity: ' + (error.response?.data?.error || error.message));
        }
    };

    const getActivityIcon = (type) => {
        const iconMap = {
            email_sent: <Mail size={18} />,
            email_received: <Mail size={18} />,
            sms_sent: <MessageSquare size={18} />,
            sms_received: <MessageSquare size={18} />,
            whatsapp_sent: <Send size={18} />,
            whatsapp_received: <Send size={18} />,
            form_submitted: <FileText size={18} />,
            distribution_added: <UserPlus size={18} />,
            tag_added: <Tag size={18} />,
            tag_removed: <Tag size={18} />,
            field_updated: <Edit3 size={18} />,
            note: <FileText size={18} />,
            phone_call: <Phone size={18} />,
            meeting: <Calendar size={18} />,
            website_visit: <Globe size={18} />,
        };
        return iconMap[type] || <Clock size={18} />;
    };

    const getActivityColor = (type) => {
        const colorMap = {
            email_sent: '#3B82F6',
            email_received: '#10B981',
            sms_sent: '#8B5CF6',
            sms_received: '#10B981',
            whatsapp_sent: '#059669',
            whatsapp_received: '#10B981',
            form_submitted: '#F59E0B',
            distribution_added: '#6366F1',
            tag_added: '#EC4899',
            tag_removed: '#EF4444',
            field_updated: '#06B6D4',
            note: '#6B7280',
            phone_call: '#8B5CF6',
            meeting: '#F59E0B',
            website_visit: '#3B82F6',
        };
        return colorMap[type] || '#9CA3AF';
    };

    const formatActivityTitle = (activity) => {
        const { activity_type, activity_data } = activity;

        switch (activity_type) {
            case 'email_sent':
                return `Email sent: ${activity_data.subject || 'No subject'}`;
            case 'email_received':
                return `Email received: ${activity_data.subject || 'No subject'}`;
            case 'sms_sent':
                return `SMS sent`;
            case 'sms_received':
                return `SMS received`;
            case 'whatsapp_sent':
                return `WhatsApp message sent`;
            case 'whatsapp_received':
                return `WhatsApp message received`;
            case 'form_submitted':
                return `Form submitted: ${activity_data.form_name || 'Unknown form'}`;
            case 'distribution_added':
                return `Added to distribution: ${activity_data.distribution_name || 'Unknown'}`;
            case 'tag_added':
                return `Tag added: ${activity_data.tag || 'Unknown'}`;
            case 'tag_removed':
                return `Tag removed: ${activity_data.tag || 'Unknown'}`;
            case 'field_updated':
                return `Field updated: ${activity_data.field_name || 'Unknown'}`;
            case 'note':
                return activity_data.subject || 'Note added';
            case 'phone_call':
                return `Phone call: ${activity_data.duration || 'Unknown duration'}`;
            case 'meeting':
                return `Meeting: ${activity_data.subject || 'No subject'}`;
            case 'website_visit':
                return `Website visit: ${activity_data.page || 'Unknown page'}`;
            default:
                return activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
    };

    const formatActivityDescription = (activity) => {
        const { activity_type, activity_data } = activity;

        if (activity_data.description) {
            return activity_data.description;
        }

        if (activity_data.body) {
            return activity_data.body.substring(0, 150) + (activity_data.body.length > 150 ? '...' : '');
        }

        if (activity_data.message) {
            return activity_data.message.substring(0, 150) + (activity_data.message.length > 150 ? '...' : '');
        }

        return null;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    };

    if (loading) {
        return (
            <div className="contact-timeline-modal">
                <div className="timeline-content">
                    <div className="timeline-header">
                        <h2>Contact Timeline</h2>
                        {onClose && (
                            <button className="close-btn" onClick={onClose}>
                                <X size={24} />
                            </button>
                        )}
                    </div>
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Loading timeline...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="contact-timeline-modal">
            <div className="timeline-content">
                {/* Header */}
                <div className="timeline-header">
                    <div>
                        <h2><Clock size={24} /> Contact Timeline</h2>
                        <p>{activities.length} activities</p>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn-primary btn-sm"
                            onClick={() => setShowAddActivity(true)}
                        >
                            <FileText size={16} />
                            Add Note
                        </button>
                        {onClose && (
                            <button className="close-btn" onClick={onClose}>
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                {activities.length === 0 ? (
                    <div className="empty-state">
                        <Clock size={64} />
                        <h3>No activity yet</h3>
                        <p>This contact has no recorded activities</p>
                    </div>
                ) : (
                    <div className="timeline-list">
                        {activities.map((activity, index) => (
                            <div key={activity.id || index} className="timeline-item">
                                <div
                                    className="timeline-marker"
                                    style={{ backgroundColor: getActivityColor(activity.activity_type) }}
                                >
                                    {getActivityIcon(activity.activity_type)}
                                </div>
                                <div className="timeline-item-content">
                                    <div className="timeline-item-header">
                                        <h4>{formatActivityTitle(activity)}</h4>
                                        <span className="timeline-date">
                                            {formatDate(activity.performed_at)}
                                        </span>
                                    </div>
                                    {formatActivityDescription(activity) && (
                                        <p className="timeline-description">
                                            {formatActivityDescription(activity)}
                                        </p>
                                    )}
                                    {activity.related_entity_type && (
                                        <div className="timeline-metadata">
                                            <span className="metadata-badge">
                                                {activity.related_entity_type}: #{activity.related_entity_id}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Activity Modal */}
                {showAddActivity && (
                    <div className="modal-overlay" onClick={() => setShowAddActivity(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Add Note</h3>
                                <button onClick={() => setShowAddActivity(false)}>&times;</button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Activity Type</label>
                                    <select
                                        value={newActivity.activity_type}
                                        onChange={(e) => setNewActivity({
                                            ...newActivity,
                                            activity_type: e.target.value
                                        })}
                                    >
                                        <option value="note">Note</option>
                                        <option value="phone_call">Phone Call</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="email_sent">Email Sent</option>
                                        <option value="email_received">Email Received</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Subject</label>
                                    <input
                                        type="text"
                                        value={newActivity.activity_data.subject}
                                        onChange={(e) => setNewActivity({
                                            ...newActivity,
                                            activity_data: {
                                                ...newActivity.activity_data,
                                                subject: e.target.value
                                            }
                                        })}
                                        placeholder="Brief summary"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        value={newActivity.activity_data.description}
                                        onChange={(e) => setNewActivity({
                                            ...newActivity,
                                            activity_data: {
                                                ...newActivity.activity_data,
                                                description: e.target.value
                                            }
                                        })}
                                        rows={4}
                                        placeholder="Detailed notes..."
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    className="btn-secondary"
                                    onClick={() => setShowAddActivity(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn-primary"
                                    onClick={handleAddActivity}
                                    disabled={!newActivity.activity_data.subject}
                                >
                                    Add Activity
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactTimeline;
