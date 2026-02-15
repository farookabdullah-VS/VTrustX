/**
 * Response Quality Dashboard
 *
 * View and manage response quality metrics:
 * - Quality score distribution
 * - Suspicious response detection
 * - Quality threshold configuration
 * - Low quality response review
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import './QualityDashboard.css';
import { Shield, AlertTriangle, CheckCircle, XCircle, Settings, TrendingUp, Filter } from 'lucide-react';

const QualityDashboard = ({ formId }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [distribution, setDistribution] = useState(null);
    const [lowQualityResponses, setLowQualityResponses] = useState([]);
    const [thresholds, setThresholds] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [updatingThresholds, setUpdatingThresholds] = useState(false);

    useEffect(() => {
        if (formId) {
            fetchQualityData();
        }
    }, [formId]);

    const fetchQualityData = async () => {
        try {
            setLoading(true);

            const [statsRes, distributionRes, responsesRes, thresholdsRes] = await Promise.all([
                axios.get(`/api/quality/stats/${formId}`),
                axios.get(`/api/quality/distribution/${formId}`),
                axios.get(`/api/quality/low-quality/${formId}?limit=20`),
                axios.get('/api/quality/thresholds')
            ]);

            setStats(statsRes.data.stats);
            setDistribution(distributionRes.data.distribution);
            setLowQualityResponses(responsesRes.data.responses);
            setThresholds(thresholdsRes.data.thresholds);
        } catch (error) {
            console.error('Failed to fetch quality data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateThresholds = async () => {
        try {
            setUpdatingThresholds(true);

            await axios.put('/api/quality/thresholds', thresholds);

            alert('Quality thresholds updated successfully!');
            setShowSettings(false);
        } catch (error) {
            alert('Failed to update thresholds: ' + (error.response?.data?.error || error.message));
        } finally {
            setUpdatingThresholds(false);
        }
    };

    const getQualityColor = (score) => {
        if (score >= 90) return '#10b981'; // green
        if (score >= 70) return '#3b82f6'; // blue
        if (score >= 50) return '#f59e0b'; // orange
        if (score >= 30) return '#ef4444'; // red
        return '#991b1b'; // dark red
    };

    const getQualityLabel = (score) => {
        if (score >= 90) return 'Excellent';
        if (score >= 70) return 'Good';
        if (score >= 50) return 'Medium';
        if (score >= 30) return 'Low';
        return 'Suspicious';
    };

    if (loading) {
        return (
            <div className="quality-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading quality data...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="quality-dashboard">
                <div className="empty-state">
                    <Shield size={48} color="#cbd5e1" />
                    <p>No quality data available yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="quality-dashboard">
            {/* Header */}
            <div className="quality-header">
                <div>
                    <h2>Response Quality</h2>
                    <p>Monitor and manage response quality metrics</p>
                </div>
                <button
                    className="btn-settings"
                    onClick={() => setShowSettings(!showSettings)}
                >
                    <Settings size={16} />
                    Quality Settings
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && thresholds && (
                <div className="settings-panel">
                    <h3>Quality Thresholds</h3>

                    <div className="settings-grid">
                        <div className="setting-item">
                            <label>Minimum Quality Score (0-100)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={thresholds.min_quality_score}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, min_quality_score: parseFloat(e.target.value) })
                                }
                            />
                            <span className="help-text">Responses below this score are flagged as low quality</span>
                        </div>

                        <div className="setting-item">
                            <label>Suspicious Threshold (0-100)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={thresholds.suspicious_threshold}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, suspicious_threshold: parseFloat(e.target.value) })
                                }
                            />
                            <span className="help-text">Responses below this are marked as suspicious</span>
                        </div>

                        <div className="setting-item">
                            <label>Min Completion Time (seconds)</label>
                            <input
                                type="number"
                                min="1"
                                value={thresholds.min_completion_time_seconds}
                                onChange={(e) =>
                                    setThresholds({
                                        ...thresholds,
                                        min_completion_time_seconds: parseInt(e.target.value)
                                    })
                                }
                            />
                            <span className="help-text">Responses faster than this are flagged</span>
                        </div>

                        <div className="setting-item">
                            <label>Min Average Text Length</label>
                            <input
                                type="number"
                                min="1"
                                value={thresholds.min_avg_text_length}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, min_avg_text_length: parseInt(e.target.value) })
                                }
                            />
                            <span className="help-text">Average characters per text response</span>
                        </div>
                    </div>

                    <div className="checkbox-settings">
                        <label>
                            <input
                                type="checkbox"
                                checked={thresholds.enable_straight_lining_detection}
                                onChange={(e) =>
                                    setThresholds({
                                        ...thresholds,
                                        enable_straight_lining_detection: e.target.checked
                                    })
                                }
                            />
                            Enable Straight-Lining Detection
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={thresholds.enable_gibberish_detection}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, enable_gibberish_detection: e.target.checked })
                                }
                            />
                            Enable Gibberish Detection
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={thresholds.auto_flag_suspicious}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, auto_flag_suspicious: e.target.checked })
                                }
                            />
                            Auto-Flag Suspicious Responses
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                checked={thresholds.auto_exclude_from_analytics}
                                onChange={(e) =>
                                    setThresholds({ ...thresholds, auto_exclude_from_analytics: e.target.checked })
                                }
                            />
                            Auto-Exclude Low Quality from Analytics
                        </label>
                    </div>

                    <div className="settings-actions">
                        <button className="btn-cancel" onClick={() => setShowSettings(false)}>
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleUpdateThresholds}
                            disabled={updatingThresholds}
                        >
                            {updatingThresholds ? 'Saving...' : 'Save Settings'}
                        </button>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe' }}>
                        <TrendingUp size={24} color="#3b82f6" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Average Quality</div>
                        <div className="stat-value">{stats.avg_quality_score.toFixed(1)}</div>
                        <div className="stat-description">
                            {getQualityLabel(stats.avg_quality_score)}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#dcfce7' }}>
                        <CheckCircle size={24} color="#10b981" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Total Responses</div>
                        <div className="stat-value">{stats.total_responses}</div>
                        <div className="stat-description">Analyzed</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fee2e2' }}>
                        <AlertTriangle size={24} color="#ef4444" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Suspicious</div>
                        <div className="stat-value">{stats.suspicious_count}</div>
                        <div className="stat-description">
                            {((stats.suspicious_count / stats.total_responses) * 100).toFixed(1)}% of total
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon" style={{ background: '#fef3c7' }}>
                        <XCircle size={24} color="#f59e0b" />
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Issues Detected</div>
                        <div className="stat-value">
                            {stats.spam_count + stats.bot_count + stats.gibberish_count}
                        </div>
                        <div className="stat-description">
                            {stats.spam_count} spam, {stats.bot_count} bot, {stats.gibberish_count} gibberish
                        </div>
                    </div>
                </div>
            </div>

            {/* Quality Distribution */}
            {distribution && (
                <div className="quality-distribution">
                    <h3>
                        <Filter size={20} />
                        Quality Score Distribution
                    </h3>

                    <div className="distribution-bars">
                        {Object.entries(distribution).map(([category, count]) => {
                            const percentage =
                                stats.total_responses > 0 ? (count / stats.total_responses) * 100 : 0;
                            const colors = {
                                excellent: '#10b981',
                                good: '#3b82f6',
                                medium: '#f59e0b',
                                low: '#ef4444',
                                suspicious: '#991b1b'
                            };

                            return (
                                <div key={category} className="distribution-item">
                                    <div className="distribution-label">
                                        <span style={{ textTransform: 'capitalize' }}>{category}</span>
                                        <span className="distribution-count">
                                            {count} ({percentage.toFixed(1)}%)
                                        </span>
                                    </div>
                                    <div className="distribution-bar-container">
                                        <div
                                            className="distribution-bar"
                                            style={{
                                                width: `${percentage}%`,
                                                background: colors[category]
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Low Quality Responses */}
            {lowQualityResponses.length > 0 && (
                <div className="low-quality-section">
                    <h3>
                        <AlertTriangle size={20} />
                        Low Quality Responses
                    </h3>

                    <div className="responses-table">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Submission ID</th>
                                    <th scope="col">Quality Score</th>
                                    <th scope="col">Flags</th>
                                    <th scope="col">Completion Time</th>
                                    <th scope="col">Submitted</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowQualityResponses.map((response) => (
                                    <tr key={response.submission_id}>
                                        <td>#{response.submission_id}</td>
                                        <td>
                                            <span
                                                className="quality-badge"
                                                style={{
                                                    background: getQualityColor(response.quality_score),
                                                    color: 'white'
                                                }}
                                            >
                                                {response.quality_score.toFixed(1)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flags-list">
                                                {response.flagged_reasons.map((flag, i) => (
                                                    <span key={i} className="flag-badge">
                                                        {flag.replace('_', ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>{response.completion_time_seconds}s</td>
                                        <td>{new Date(response.submitted_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QualityDashboard;
