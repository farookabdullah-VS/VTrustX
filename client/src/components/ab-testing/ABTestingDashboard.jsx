import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalyticsStream } from '../../hooks/useAnalyticsStream';
import { FlaskConical, Play, Pause, BarChart3, Radio, Plus, Users } from 'lucide-react';
import axios from '../../axiosConfig';
import './ABTestingDashboard.css';

/**
 * A/B Testing Dashboard
 *
 * Main dashboard for viewing and managing A/B test experiments.
 * Features:
 * - List all experiments with status filtering
 * - Real-time updates via SSE
 * - Quick actions (start, pause, view results)
 * - Live connection indicator
 */
export default function ABTestingDashboard() {
    const navigate = useNavigate();
    const [experiments, setExperiments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [error, setError] = useState(null);

    // Fetch experiments from API
    const fetchExperiments = useCallback(async () => {
        try {
            setLoading(true);
            const params = statusFilter !== 'all' ? { status: statusFilter } : {};
            const response = await axios.get('/api/ab-tests', { params });
            setExperiments(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch experiments:', err);
            setError('Failed to load experiments. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    // Initial fetch
    useEffect(() => {
        fetchExperiments();
    }, [fetchExperiments]);

    // Real-time updates via SSE
    const handleUpdate = useCallback((data) => {
        if (data.type === 'ab_experiment_started' ||
            data.type === 'ab_winner_declared' ||
            data.type === 'ab_experiment_completed' ||
            data.type === 'ab_experiment_created' ||
            data.type === 'ab_experiment_paused') {
            // Refresh list when experiment status changes
            fetchExperiments();
        }
    }, [fetchExperiments]);

    const { connected, error: sseError, reconnect } = useAnalyticsStream(handleUpdate);

    // Handle start experiment
    const handleStart = async (experimentId, e) => {
        e.stopPropagation();
        try {
            await axios.post(`/api/ab-tests/${experimentId}/start`);
            fetchExperiments();
        } catch (err) {
            console.error('Failed to start experiment:', err);
            alert('Failed to start experiment. Please try again.');
        }
    };

    // Handle pause experiment
    const handlePause = async (experimentId, e) => {
        e.stopPropagation();
        try {
            await axios.post(`/api/ab-tests/${experimentId}/pause`);
            fetchExperiments();
        } catch (err) {
            console.error('Failed to pause experiment:', err);
            alert('Failed to pause experiment. Please try again.');
        }
    };

    // Get status badge styling
    const getStatusBadge = (status) => {
        const styles = {
            draft: { bg: '#F3F4F6', color: '#6B7280', label: 'Draft' },
            running: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Running' },
            paused: { bg: '#FEF3C7', color: '#D97706', label: 'Paused' },
            completed: { bg: '#D1FAE5', color: '#065F46', label: 'Completed' }
        };
        return styles[status] || styles.draft;
    };

    // Get channel icon
    const getChannelIcon = (channel) => {
        const icons = {
            email: '📧',
            sms: '💬',
            whatsapp: '📱'
        };
        return icons[channel] || '📨';
    };

    return (
        <div className="ab-testing-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className="header-left">
                    <FlaskConical size={32} color="#6366F1" />
                    <h1>A/B Testing</h1>
                </div>
                <div className="header-right">
                    {/* Live indicator */}
                    {connected && (
                        <div className="live-indicator">
                            <Radio size={16} />
                            <span>Live</span>
                        </div>
                    )}
                    {sseError && (
                        <button onClick={reconnect} className="reconnect-btn">
                            Reconnect
                        </button>
                    )}
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/ab-tests/new')}
                    >
                        <Plus size={18} />
                        New Experiment
                    </button>
                </div>
            </div>

            {/* Status filter tabs */}
            <div className="status-tabs">
                {['all', 'draft', 'running', 'completed'].map(status => (
                    <button
                        key={status}
                        className={`tab ${statusFilter === status ? 'active' : ''}`}
                        onClick={() => setStatusFilter(status)}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Error message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading experiments...</p>
                </div>
            )}

            {/* Experiments grid */}
            {!loading && experiments.length === 0 && (
                <div className="empty-state">
                    <FlaskConical size={64} color="#D1D5DB" />
                    <h3>No experiments yet</h3>
                    <p>Create your first A/B test to start optimizing campaigns</p>
                    <button
                        className="btn-primary"
                        onClick={() => navigate('/ab-tests/new')}
                    >
                        <Plus size={18} />
                        Create Experiment
                    </button>
                </div>
            )}

            {!loading && experiments.length > 0 && (
                <div className="experiments-grid">
                    {experiments.map(exp => {
                        const statusBadge = getStatusBadge(exp.status);
                        const assignmentCount = parseInt(exp.total_assignments) || 0;

                        return (
                            <div
                                key={exp.id}
                                className="experiment-card"
                                onClick={() => navigate(`/ab-tests/${exp.id}`)}
                            >
                                {/* Header */}
                                <div className="card-header">
                                    <div className="experiment-name">
                                        <span className="channel-icon">
                                            {getChannelIcon(exp.channel)}
                                        </span>
                                        <h3>{exp.name}</h3>
                                    </div>
                                    <span
                                        className="status-badge"
                                        style={{
                                            background: statusBadge.bg,
                                            color: statusBadge.color
                                        }}
                                    >
                                        {statusBadge.label}
                                    </span>
                                </div>

                                {/* Description */}
                                {exp.description && (
                                    <p className="experiment-description">
                                        {exp.description}
                                    </p>
                                )}

                                {/* Stats */}
                                <div className="experiment-stats">
                                    <div className="stat">
                                        <Users size={16} />
                                        <span>{assignmentCount} assignments</span>
                                    </div>
                                    <div className="stat">
                                        <span className="metric-label">Metric:</span>
                                        <span>{exp.success_metric?.replace('_', ' ')}</span>
                                    </div>
                                </div>

                                {/* Winner badge */}
                                {exp.winning_variant_id && (
                                    <div className="winner-banner">
                                        🏆 Winner Declared
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="card-actions">
                                    {exp.status === 'draft' && (
                                        <button
                                            className="btn-secondary"
                                            onClick={(e) => handleStart(exp.id, e)}
                                        >
                                            <Play size={16} />
                                            Start
                                        </button>
                                    )}
                                    {exp.status === 'running' && (
                                        <button
                                            className="btn-secondary"
                                            onClick={(e) => handlePause(exp.id, e)}
                                        >
                                            <Pause size={16} />
                                            Pause
                                        </button>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/ab-tests/${exp.id}`);
                                        }}
                                    >
                                        <BarChart3 size={16} />
                                        View Results
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
