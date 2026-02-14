/**
 * Drip Campaigns Dashboard
 *
 * Main view for managing automated multi-step campaigns
 * - List all campaigns with status and stats
 * - Quick actions (start, pause, view)
 * - Create new campaigns
 * - Filter by status
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../axiosConfig';
import {
    Send,
    Plus,
    Play,
    Pause,
    Eye,
    Trash2,
    Users,
    CheckCircle,
    Clock,
    AlertCircle,
    Mail,
    MessageSquare,
    Phone
} from 'lucide-react';
import './DripCampaignsDashboard.css';

const DripCampaignsDashboard = () => {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        fetchCampaigns();
    }, [statusFilter]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const response = await axios.get('/api/drip-campaigns', { params });
            setCampaigns(response.data.campaigns || []);
        } catch (error) {
            console.error('Failed to fetch campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartCampaign = async (campaignId) => {
        try {
            await axios.post(`/api/drip-campaigns/${campaignId}/start`);
            fetchCampaigns();
        } catch (error) {
            alert('Failed to start campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePauseCampaign = async (campaignId) => {
        try {
            await axios.post(`/api/drip-campaigns/${campaignId}/pause`);
            fetchCampaigns();
        } catch (error) {
            alert('Failed to pause campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleResumeCampaign = async (campaignId) => {
        try {
            await axios.post(`/api/drip-campaigns/${campaignId}/resume`);
            fetchCampaigns();
        } catch (error) {
            alert('Failed to resume campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
            return;
        }

        try {
            await axios.delete(`/api/drip-campaigns/${campaignId}`);
            fetchCampaigns();
        } catch (error) {
            alert('Failed to delete campaign: ' + (error.response?.data?.error || error.message));
        }
    };

    const getChannelIcon = (channel) => {
        switch (channel) {
            case 'email':
                return <Mail size={18} />;
            case 'sms':
                return <MessageSquare size={18} />;
            case 'whatsapp':
                return <Phone size={18} />;
            case 'telegram':
                return <Send size={18} />;
            default:
                return <Mail size={18} />;
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            draft: { label: 'Draft', color: 'gray', icon: <Clock size={14} /> },
            active: { label: 'Active', color: 'green', icon: <Play size={14} /> },
            paused: { label: 'Paused', color: 'yellow', icon: <Pause size={14} /> },
            completed: { label: 'Completed', color: 'blue', icon: <CheckCircle size={14} /> }
        };

        const badge = badges[status] || badges.draft;

        return (
            <span className={`status-badge status-${badge.color}`}>
                {badge.icon}
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="drip-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading campaigns...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="drip-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <Send size={32} className="header-icon" />
                    <div>
                        <h1>Drip Campaigns</h1>
                        <p>Automated multi-step follow-up sequences</p>
                    </div>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => navigate('/drip-campaigns/new')}
                >
                    <Plus size={18} />
                    New Campaign
                </button>
            </div>

            {/* Status Filter */}
            <div className="status-filters">
                <button
                    className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                >
                    All Campaigns
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'draft' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('draft')}
                >
                    Draft
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('active')}
                >
                    Active
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'paused' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('paused')}
                >
                    Paused
                </button>
                <button
                    className={`filter-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('completed')}
                >
                    Completed
                </button>
            </div>

            {/* Campaigns Grid */}
            {campaigns.length === 0 ? (
                <div className="empty-state">
                    <Send size={64} className="empty-icon" />
                    <h3>No campaigns yet</h3>
                    <p>Create your first drip campaign to automate follow-up sequences</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/drip-campaigns/new')}
                    >
                        <Plus size={18} />
                        Create Campaign
                    </button>
                </div>
            ) : (
                <div className="campaigns-grid">
                    {campaigns.map(campaign => (
                        <div key={campaign.id} className="campaign-card">
                            <div className="card-header">
                                <div className="campaign-title">
                                    <h3>{campaign.name}</h3>
                                    {getStatusBadge(campaign.status)}
                                </div>
                                <div className="channel-badge">
                                    {getChannelIcon(campaign.channel)}
                                    <span>{campaign.channel.toUpperCase()}</span>
                                </div>
                            </div>

                            {campaign.description && (
                                <p className="campaign-description">{campaign.description}</p>
                            )}

                            {/* Stats */}
                            <div className="campaign-stats">
                                <div className="stat-item">
                                    <Users size={16} />
                                    <span>{campaign.enrollment_count || 0} enrolled</span>
                                </div>
                                <div className="stat-item">
                                    <CheckCircle size={16} />
                                    <span>{campaign.completed_count || 0} completed</span>
                                </div>
                                <div className="stat-item">
                                    <Send size={16} />
                                    <span>{campaign.response_rate || 0}% response</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="card-actions">
                                <button
                                    className="btn-secondary btn-sm"
                                    onClick={() => navigate(`/drip-campaigns/${campaign.id}`)}
                                    title="View Details"
                                >
                                    <Eye size={16} />
                                    View
                                </button>

                                {campaign.status === 'draft' && (
                                    <button
                                        className="btn-success btn-sm"
                                        onClick={() => handleStartCampaign(campaign.id)}
                                        title="Start Campaign"
                                    >
                                        <Play size={16} />
                                        Start
                                    </button>
                                )}

                                {campaign.status === 'active' && (
                                    <button
                                        className="btn-warning btn-sm"
                                        onClick={() => handlePauseCampaign(campaign.id)}
                                        title="Pause Campaign"
                                    >
                                        <Pause size={16} />
                                        Pause
                                    </button>
                                )}

                                {campaign.status === 'paused' && (
                                    <button
                                        className="btn-success btn-sm"
                                        onClick={() => handleResumeCampaign(campaign.id)}
                                        title="Resume Campaign"
                                    >
                                        <Play size={16} />
                                        Resume
                                    </button>
                                )}

                                <button
                                    className="btn-danger btn-sm"
                                    onClick={() => handleDeleteCampaign(campaign.id)}
                                    title="Delete Campaign"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DripCampaignsDashboard;
