/**
 * Drip Campaign Details
 *
 * Detailed view of a single campaign
 * - Campaign information and stats
 * - Enrollment list
 * - Execution history
 * - Enroll contacts
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../axiosConfig';
import {
    ArrowLeft,
    Users,
    CheckCircle,
    Clock,
    Send,
    Play,
    Pause,
    Plus,
    Mail,
    MessageSquare,
    Phone,
    TrendingUp
} from 'lucide-react';
import './DripCampaignDetails.css';

const DripCampaignDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [executions, setExecutions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollContacts, setEnrollContacts] = useState('');

    useEffect(() => {
        fetchCampaign();
        fetchEnrollments();
        fetchExecutions();
    }, [id]);

    const fetchCampaign = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/drip-campaigns/${id}`);
            setCampaign(response.data.campaign);
        } catch (error) {
            console.error('Failed to fetch campaign:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const response = await axios.get(`/api/drip-campaigns/${id}/enrollments`, {
                params: { limit: 100 }
            });
            setEnrollments(response.data.enrollments || []);
        } catch (error) {
            console.error('Failed to fetch enrollments:', error);
        }
    };

    const fetchExecutions = async () => {
        try {
            const response = await axios.get(`/api/drip-campaigns/${id}/executions`, {
                params: { limit: 100 }
            });
            setExecutions(response.data.executions || []);
        } catch (error) {
            console.error('Failed to fetch executions:', error);
        }
    };

    const handleEnrollContacts = async () => {
        try {
            const contacts = enrollContacts.split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .map(line => {
                    const parts = line.split(',').map(p => p.trim());
                    return {
                        email: parts[0] || null,
                        phone: parts[1] || null,
                        name: parts[2] || null
                    };
                });

            if (contacts.length === 0) {
                alert('Please enter at least one contact');
                return;
            }

            await axios.post(`/api/drip-campaigns/${id}/enroll`, { contacts });
            alert('Contacts enrolled successfully!');
            setShowEnrollModal(false);
            setEnrollContacts('');
            fetchCampaign();
            fetchEnrollments();
        } catch (error) {
            alert('Failed to enroll contacts: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleStartCampaign = async () => {
        try {
            await axios.post(`/api/drip-campaigns/${id}/start`);
            fetchCampaign();
        } catch (error) {
            alert('Failed to start campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePauseCampaign = async () => {
        try {
            await axios.post(`/api/drip-campaigns/${id}/pause`);
            fetchCampaign();
        } catch (error) {
            alert('Failed to pause campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { label: 'Draft', color: 'gray' },
            active: { label: 'Active', color: 'green' },
            paused: { label: 'Paused', color: 'yellow' },
            completed: { label: 'Completed', color: 'blue' },
            stopped: { label: 'Stopped', color: 'red' },
            enrolled: { label: 'Enrolled', color: 'blue' }
        };

        const badge = badges[status] || badges.draft;

        return (
            <span className={`status-badge status-${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="campaign-details">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading campaign...</p>
                </div>
            </div>
        );
    }

    if (!campaign) {
        return (
            <div className="campaign-details">
                <div className="empty-state">
                    <p>Campaign not found</p>
                </div>
            </div>
        );
    }

    const stats = campaign.stats || {};

    return (
        <div className="campaign-details">
            {/* Header */}
            <div className="details-header">
                <button className="btn-back" onClick={() => navigate('/drip-campaigns')}>
                    <ArrowLeft size={20} />
                    Back to Campaigns
                </button>

                <div className="header-content">
                    <div className="header-left">
                        <Send size={32} className="header-icon" />
                        <div>
                            <h1>{campaign.name}</h1>
                            <p>{campaign.description || 'No description'}</p>
                        </div>
                    </div>
                    <div className="header-actions">
                        {getStatusBadge(campaign.status)}
                        {campaign.status === 'draft' && (
                            <button className="btn-success" onClick={handleStartCampaign}>
                                <Play size={18} />
                                Start Campaign
                            </button>
                        )}
                        {campaign.status === 'active' && (
                            <>
                                <button className="btn-primary" onClick={() => setShowEnrollModal(true)}>
                                    <Plus size={18} />
                                    Enroll Contacts
                                </button>
                                <button className="btn-warning" onClick={handlePauseCampaign}>
                                    <Pause size={18} />
                                    Pause
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">
                        <Users size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Enrollments</span>
                        <span className="stat-value">{stats.total_enrollments || 0}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">
                        <CheckCircle size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{stats.completed || 0}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon yellow">
                        <Clock size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Active</span>
                        <span className="stat-value">{stats.active || 0}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">
                        <TrendingUp size={24} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Response Rate</span>
                        <span className="stat-value">{stats.response_rate || 0}%</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab ${activeTab === 'enrollments' ? 'active' : ''}`}
                    onClick={() => setActiveTab('enrollments')}
                >
                    Enrollments ({enrollments.length})
                </button>
                <button
                    className={`tab ${activeTab === 'executions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('executions')}
                >
                    Execution History ({executions.length})
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {activeTab === 'overview' && (
                    <div className="overview-tab">
                        <div className="info-section">
                            <h3>Campaign Steps</h3>
                            <div className="steps-timeline">
                                {campaign.steps && campaign.steps.map((step, index) => (
                                    <div key={step.id} className="timeline-step">
                                        <div className="step-marker">{index + 1}</div>
                                        <div className="step-content">
                                            <h4>
                                                {index === 0 ? 'Initial Message' : `Reminder ${index}`}
                                            </h4>
                                            {index > 0 && (
                                                <p className="step-delay">
                                                    Send after {step.delay_value} {step.delay_unit}
                                                </p>
                                            )}
                                            {step.subject && <p><strong>Subject:</strong> {step.subject}</p>}
                                            <p>{step.body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="info-section">
                            <h3>Settings</h3>
                            <div className="settings-list">
                                <div className="setting-row">
                                    <span className="label">Channel:</span>
                                    <span className="value">{campaign.channel.toUpperCase()}</span>
                                </div>
                                <div className="setting-row">
                                    <span className="label">Stop on Response:</span>
                                    <span className="value">{campaign.stop_on_response ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="setting-row">
                                    <span className="label">Max Reminders:</span>
                                    <span className="value">{campaign.max_reminders}</span>
                                </div>
                                <div className="setting-row">
                                    <span className="label">Timezone:</span>
                                    <span className="value">{campaign.timezone}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'enrollments' && (
                    <div className="enrollments-tab">
                        {enrollments.length === 0 ? (
                            <div className="empty-state">
                                <Users size={48} />
                                <p>No enrollments yet</p>
                            </div>
                        ) : (
                            <div className="enrollments-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Recipient</th>
                                            <th>Status</th>
                                            <th>Current Step</th>
                                            <th>Responded</th>
                                            <th>Enrolled At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {enrollments.map(enrollment => (
                                            <tr key={enrollment.id}>
                                                <td>
                                                    <div className="recipient-info">
                                                        <strong>{enrollment.recipient_name || 'Unknown'}</strong>
                                                        <small>{enrollment.recipient_email || enrollment.recipient_phone}</small>
                                                    </div>
                                                </td>
                                                <td>{getStatusBadge(enrollment.status)}</td>
                                                <td>Step {enrollment.current_step + 1}</td>
                                                <td>{enrollment.response_received ? 'Yes' : 'No'}</td>
                                                <td>{new Date(enrollment.enrolled_at).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'executions' && (
                    <div className="executions-tab">
                        {executions.length === 0 ? (
                            <div className="empty-state">
                                <Send size={48} />
                                <p>No executions yet</p>
                            </div>
                        ) : (
                            <div className="executions-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Recipient</th>
                                            <th>Step</th>
                                            <th>Status</th>
                                            <th>Sent At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {executions.map(execution => (
                                            <tr key={execution.id}>
                                                <td>
                                                    <div className="recipient-info">
                                                        <strong>{execution.recipient_name || 'Unknown'}</strong>
                                                        <small>{execution.recipient_email || execution.recipient_phone}</small>
                                                    </div>
                                                </td>
                                                <td>Step {execution.step_number}</td>
                                                <td>{getStatusBadge(execution.status)}</td>
                                                <td>{execution.sent_at ? new Date(execution.sent_at).toLocaleString() : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Enroll Modal */}
            {showEnrollModal && (
                <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Enroll Contacts</h3>
                            <button onClick={() => setShowEnrollModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>Enter contacts (one per line, format: email, phone, name)</p>
                            <textarea
                                value={enrollContacts}
                                onChange={(e) => setEnrollContacts(e.target.value)}
                                rows={10}
                                placeholder="john@example.com, +1234567890, John Doe&#10;jane@example.com, , Jane Smith"
                            />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowEnrollModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleEnrollContacts}>
                                Enroll Contacts
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DripCampaignDetails;
