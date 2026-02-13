import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useABTestStream } from '../../hooks/useABTestStream';
import { ChevronLeft, Trophy, TrendingUp, Users, Radio, CheckCircle, Play, Pause, Target, FastForward, TrendingDown } from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import axios from '../../axiosConfig';
import ABWinnerModal from './ABWinnerModal';
import './ABStatsComparison.css';

/**
 * A/B Stats Comparison View
 *
 * Displays experiment results with:
 * - Real-time metrics for each variant
 * - Side-by-side comparison charts
 * - Statistical analysis (p-value, confidence intervals, lift)
 * - Winner declaration
 * - Live activity feed
 */
export default function ABStatsComparison() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [experiment, setExperiment] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [liveActivity, setLiveActivity] = useState([]);
    const [showWinnerModal, setShowWinnerModal] = useState(false);
    const [winnerData, setWinnerData] = useState(null);
    const [advancedResults, setAdvancedResults] = useState(null);
    const [loadingAdvanced, setLoadingAdvanced] = useState(false);

    // Fetch experiment and results
    const fetchResults = useCallback(async () => {
        try {
            const [expResponse, resultsResponse] = await Promise.all([
                axios.get(`/api/ab-tests/${id}`),
                axios.get(`/api/ab-tests/${id}/results`)
            ]);

            setExperiment(expResponse.data);
            setResults(resultsResponse.data);
            setError(null);

            // Fetch advanced results if using advanced statistical method
            const statMethod = expResponse.data.statistical_method || expResponse.data.statisticalMethod;
            if (statMethod && statMethod !== 'frequentist') {
                fetchAdvancedResults(statMethod);
            }
        } catch (err) {
            console.error('Failed to fetch results:', err);
            setError('Failed to load experiment results. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    // Fetch advanced statistics results
    const fetchAdvancedResults = async (method) => {
        if (loadingAdvanced) return;

        setLoadingAdvanced(true);
        try {
            const response = await axios.get(`/api/ab-tests/${id}/advanced-results`);
            setAdvancedResults(response.data);
        } catch (err) {
            console.error('Failed to fetch advanced results:', err);
            // Don't set error - advanced results are optional
        } finally {
            setLoadingAdvanced(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    // Real-time updates via SSE
    const handleUpdate = useCallback((data) => {
        const timestamp = new Date().toLocaleTimeString();

        switch (data.type) {
            case 'ab_variant_assigned':
                fetchResults();
                setLiveActivity(prev => [
                    `${timestamp} - New assignment to ${data.variantName}`,
                    ...prev.slice(0, 9)
                ]);
                break;
            case 'ab_winner_declared':
                setWinnerData(data);
                setShowWinnerModal(true);
                fetchResults();
                setLiveActivity(prev => [
                    `${timestamp} - 🏆 Winner declared: ${data.winnerName}!`,
                    ...prev.slice(0, 9)
                ]);
                break;
            case 'ab_experiment_paused':
            case 'ab_experiment_completed':
                fetchResults();
                break;
        }
    }, [fetchResults]);

    const { connected } = useABTestStream(parseInt(id), handleUpdate);

    // Check for winner
    const handleCheckWinner = async () => {
        try {
            const response = await axios.post(`/api/ab-tests/${id}/check-winner`);
            if (response.data.shouldStop) {
                setWinnerData(response.data);
                setShowWinnerModal(true);
                fetchResults();
            } else {
                alert(response.data.reason || 'No statistically significant winner yet. Continue running the experiment.');
            }
        } catch (err) {
            console.error('Failed to check winner:', err);
            alert('Failed to check for winner. Please try again.');
        }
    };

    // Start/pause experiment
    const handleStart = async () => {
        try {
            await axios.post(`/api/ab-tests/${id}/start`);
            fetchResults();
        } catch (err) {
            console.error('Failed to start experiment:', err);
            alert('Failed to start experiment.');
        }
    };

    const handlePause = async () => {
        try {
            await axios.post(`/api/ab-tests/${id}/pause`);
            fetchResults();
        } catch (err) {
            console.error('Failed to pause experiment:', err);
            alert('Failed to pause experiment.');
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading results...</p>
            </div>
        );
    }

    if (error || !experiment || !results) {
        return (
            <div className="error-container">
                <p>{error || 'Experiment not found'}</p>
                <button onClick={() => navigate('/ab-tests')}>Back to Dashboard</button>
            </div>
        );
    }

    // Prepare chart data
    const chartData = results.variants.map(v => ({
        name: `Variant ${v.variantName}`,
        'Delivery Rate': v.deliveryRate,
        'Open Rate': v.openRate || 0,
        'Click Rate': v.clickRate || 0,
        'Response Rate': v.responseRate
    }));

    // Get status styling
    const getStatusStyle = (status) => {
        const styles = {
            draft: { bg: '#F3F4F6', color: '#6B7280' },
            running: { bg: '#DBEAFE', color: '#1D4ED8' },
            paused: { bg: '#FEF3C7', color: '#D97706' },
            completed: { bg: '#D1FAE5', color: '#065F46' }
        };
        return styles[status] || styles.draft;
    };

    const statusStyle = getStatusStyle(results.experiment.status);
    const winner = results.comparison.winner;

    return (
        <div className="ab-stats-comparison">
            {/* Header */}
            <div className="stats-header">
                <button className="back-link" onClick={() => navigate('/ab-tests')}>
                    <ChevronLeft size={20} />
                    Back to Dashboard
                </button>

                <div className="experiment-title-row">
                    <div className="title-left">
                        <h1>{results.experiment.name}</h1>
                        <span
                            className="status-badge"
                            style={{
                                background: statusStyle.bg,
                                color: statusStyle.color
                            }}
                        >
                            {results.experiment.status}
                        </span>
                    </div>
                    <div className="title-right">
                        {connected && (
                            <div className="live-indicator">
                                <Radio size={16} />
                                <span>Live</span>
                            </div>
                        )}
                        {results.experiment.status === 'draft' && (
                            <button className="btn-secondary" onClick={handleStart}>
                                <Play size={16} />
                                Start
                            </button>
                        )}
                        {results.experiment.status === 'running' && (
                            <>
                                <button className="btn-secondary" onClick={handlePause}>
                                    <Pause size={16} />
                                    Pause
                                </button>
                                <button className="btn-primary" onClick={handleCheckWinner}>
                                    <CheckCircle size={16} />
                                    Check for Winner
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Live activity feed */}
            {liveActivity.length > 0 && (
                <div className="live-activity">
                    <h3>📡 Live Activity</h3>
                    <div className="activity-list">
                        {liveActivity.map((msg, i) => (
                            <div key={i} className="activity-item">
                                {msg}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Metrics Cards */}
            <div className="metrics-cards">
                {results.variants.map(variant => {
                    const isWinner = variant.variantId === winner;

                    return (
                        <div
                            key={variant.variantId}
                            className={`metric-card ${isWinner ? 'winner' : ''}`}
                        >
                            {isWinner && (
                                <div className="winner-badge">
                                    <Trophy size={16} />
                                    Winner
                                </div>
                            )}

                            <div className="card-header">
                                <h3>Variant {variant.variantName}</h3>
                                <div className="assignments">
                                    <Users size={16} />
                                    <span>{variant.assignmentCount} assignments</span>
                                </div>
                            </div>

                            <div className="metrics-grid">
                                <div className="metric">
                                    <span className="metric-label">Delivery Rate</span>
                                    <span className="metric-value">{variant.deliveryRate}%</span>
                                    <span className="metric-detail">{variant.delivered} / {variant.sent}</span>
                                </div>

                                {results.experiment.channel === 'email' && (
                                    <>
                                        <div className="metric">
                                            <span className="metric-label">Open Rate</span>
                                            <span className="metric-value">{variant.openRate}%</span>
                                            <span className="metric-detail">{variant.opened} opens</span>
                                        </div>
                                        <div className="metric">
                                            <span className="metric-label">Click Rate</span>
                                            <span className="metric-value">{variant.clickRate}%</span>
                                            <span className="metric-detail">{variant.clicked} clicks</span>
                                        </div>
                                    </>
                                )}

                                <div className="metric highlight">
                                    <span className="metric-label">Response Rate</span>
                                    <span className="metric-value">{variant.responseRate}%</span>
                                    <span className="metric-detail">{variant.responses} responses</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Comparison Chart */}
            <div className="chart-section">
                <h2>Side-by-Side Comparison</h2>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft' }} />
                        <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <Bar dataKey="Delivery Rate" fill="#6366F1" />
                        {results.experiment.channel === 'email' && (
                            <>
                                <Bar dataKey="Open Rate" fill="#10B981" />
                                <Bar dataKey="Click Rate" fill="#F59E0B" />
                            </>
                        )}
                        <Bar dataKey="Response Rate" fill="#EF4444" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Statistical Analysis */}
            <div className="stats-section">
                <h2>Statistical Analysis</h2>

                {results.comparison.significant ? (
                    <div className="significance-box success">
                        <CheckCircle size={24} />
                        <div>
                            <h4>Statistically Significant Winner Found!</h4>
                            <p>{results.comparison.reason}</p>
                        </div>
                    </div>
                ) : (
                    <div className="significance-box info">
                        <TrendingUp size={24} />
                        <div>
                            <h4>No Significant Winner Yet</h4>
                            <p>{results.comparison.message || 'Continue running the experiment to gather more data.'}</p>
                        </div>
                    </div>
                )}

                {results.comparison.statistics && (
                    <div className="stats-grid">
                        <div className="stat-box">
                            <span className="stat-label">P-Value</span>
                            <span className="stat-value">
                                {results.comparison.statistics.pValue.toFixed(4)}
                            </span>
                            <span className="stat-hint">
                                {results.comparison.statistics.pValue < 0.05 ? '✓ Significant (< 0.05)' : 'Not significant (≥ 0.05)'}
                            </span>
                        </div>

                        <div className="stat-box">
                            <span className="stat-label">Chi-Square</span>
                            <span className="stat-value">
                                {results.comparison.statistics.chiSquare.toFixed(2)}
                            </span>
                        </div>

                        {results.comparison.details?.lift && (
                            <div className="stat-box">
                                <span className="stat-label">Lift</span>
                                <span className="stat-value">
                                    +{results.comparison.details.lift.toFixed(1)}%
                                </span>
                                <span className="stat-hint">Improvement over control</span>
                            </div>
                        )}
                    </div>
                )}

                {results.comparison.statistics?.confidenceIntervals && (
                    <div className="confidence-intervals">
                        <h4>95% Confidence Intervals</h4>
                        <div className="intervals-grid">
                            {Object.entries(results.comparison.statistics.confidenceIntervals).map(([name, ci]) => (
                                <div key={name} className="interval-box">
                                    <span className="interval-name">Variant {name}</span>
                                    <span className="interval-range">
                                        {ci.lower} - {ci.upper}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced Statistics Sections */}
            {advancedResults && results.experiment.statistical_method && (
                <>
                    {/* Bayesian Analysis */}
                    {results.experiment.statistical_method === 'bayesian' && advancedResults.bayesian && (
                        <div className="advanced-section bayesian-section">
                            <div className="section-header">
                                <Target size={24} />
                                <h2>Bayesian Analysis</h2>
                            </div>

                            <div className="bayesian-probabilities">
                                <h4>Probability Each Variant is Best</h4>
                                <div className="prob-grid">
                                    {advancedResults.bayesian.variants.map(variant => (
                                        <div key={variant.variantId} className="prob-card">
                                            <div className="variant-name">Variant {variant.variantName}</div>
                                            <div className="prob-value">
                                                {(variant.probabilityBest * 100).toFixed(1)}%
                                            </div>
                                            <div className="prob-bar">
                                                <div
                                                    className="prob-fill"
                                                    style={{
                                                        width: `${variant.probabilityBest * 100}%`,
                                                        background: variant.probabilityBest >= 0.95 ? '#10B981' : '#6366F1'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="credible-intervals">
                                <h4>95% Credible Intervals</h4>
                                <div className="intervals-grid">
                                    {advancedResults.bayesian.variants.map(variant => (
                                        <div key={variant.variantId} className="interval-box">
                                            <span className="interval-name">Variant {variant.variantName}</span>
                                            <span className="interval-range">
                                                {(variant.credibleInterval.lower * 100).toFixed(2)}% - {(variant.credibleInterval.upper * 100).toFixed(2)}%
                                            </span>
                                            <span className="interval-mean">
                                                Mean: {(variant.credibleInterval.mean * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {advancedResults.bayesian.recommendation && (
                                <div className={`recommendation-box ${advancedResults.bayesian.recommendation.decision}`}>
                                    <h4>{advancedResults.bayesian.recommendation.decision.replace(/_/g, ' ').toUpperCase()}</h4>
                                    <p>{advancedResults.bayesian.recommendation.message}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sequential Analysis */}
                    {results.experiment.statistical_method === 'sequential' && advancedResults.sequential && (
                        <div className="advanced-section sequential-section">
                            <div className="section-header">
                                <FastForward size={24} />
                                <h2>Sequential Analysis</h2>
                            </div>

                            <div className="sequential-status">
                                <div className="status-card">
                                    <div className="status-label">Current Check</div>
                                    <div className="status-value">
                                        {advancedResults.sequential.history.length} / {advancedResults.sequential.plan.numChecks}
                                    </div>
                                </div>
                                <div className="status-card">
                                    <div className="status-label">Status</div>
                                    <div className="status-value">{advancedResults.sequential.currentStatus.status}</div>
                                </div>
                                {advancedResults.sequential.nextCheckPoint?.hasNext && (
                                    <div className="status-card">
                                        <div className="status-label">Next Check At</div>
                                        <div className="status-value">
                                            {advancedResults.sequential.nextCheckPoint.nextSampleSize} assignments
                                        </div>
                                    </div>
                                )}
                            </div>

                            {advancedResults.sequential.history.length > 0 && (
                                <div className="sequential-history">
                                    <h4>Interim Analyses</h4>
                                    <div className="history-table">
                                        <div className="history-header">
                                            <span>Check</span>
                                            <span>Sample Size</span>
                                            <span>Z-Statistic</span>
                                            <span>Decision</span>
                                        </div>
                                        {advancedResults.sequential.history.map((check, idx) => (
                                            <div key={idx} className="history-row">
                                                <span>#{check.checkNumber}</span>
                                                <span>{check.totalAssignments}</span>
                                                <span>{check.zStatistic.toFixed(3)}</span>
                                                <span className={`decision-${check.decision}`}>
                                                    {check.decision}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {advancedResults.sequential.boundaryData && (
                                <div className="boundary-chart">
                                    <h4>O'Brien-Fleming Stopping Boundaries</h4>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={advancedResults.sequential.boundaryData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="checkNumber"
                                                label={{ value: 'Analysis Number', position: 'insideBottom', offset: -5 }}
                                            />
                                            <YAxis label={{ value: 'Z-Statistic', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip />
                                            <Legend />
                                            <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />
                                            <Line
                                                type="monotone"
                                                dataKey="upper"
                                                stroke="#EF4444"
                                                strokeWidth={2}
                                                name="Upper Boundary (Stop for Efficacy)"
                                            />
                                            <Line
                                                type="monotone"
                                                dataKey="lower"
                                                stroke="#F59E0B"
                                                strokeWidth={2}
                                                name="Lower Boundary (Stop for Futility)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                    <p className="chart-note">
                                        If Z-statistic crosses upper boundary: declare winner. If crosses lower boundary: stop for futility.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Multi-Armed Bandit */}
                    {results.experiment.statistical_method === 'bandit' && advancedResults.bandit && (
                        <div className="advanced-section bandit-section">
                            <div className="section-header">
                                <TrendingDown size={24} />
                                <h2>Multi-Armed Bandit Results</h2>
                            </div>

                            <div className="bandit-summary">
                                <div className="summary-card">
                                    <div className="summary-label">Algorithm</div>
                                    <div className="summary-value">{advancedResults.bandit.algorithm}</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-label">Total Pulls</div>
                                    <div className="summary-value">{advancedResults.bandit.summary.totalPulls}</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-label">Cumulative Regret</div>
                                    <div className="summary-value">{advancedResults.bandit.summary.totalRegret}</div>
                                </div>
                                <div className="summary-card">
                                    <div className="summary-label">Best Performer</div>
                                    <div className="summary-value">{advancedResults.bandit.bestPerformer.variantName}</div>
                                </div>
                            </div>

                            <div className="allocation-evolution">
                                <h4>Traffic Allocation Evolution</h4>
                                <div className="allocation-cards">
                                    {advancedResults.bandit.allocations.map(alloc => (
                                        <div key={alloc.variantId} className="alloc-card">
                                            <div className="alloc-header">
                                                <span className="alloc-name">Variant {alloc.variantName}</span>
                                                <span className="alloc-shift">
                                                    {alloc.currentAllocation > alloc.initialAllocation ? '↑' : '↓'}
                                                    {Math.abs(alloc.currentAllocation - alloc.initialAllocation).toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="alloc-bar">
                                                <div
                                                    className="alloc-fill"
                                                    style={{ width: `${alloc.currentAllocation}%` }}
                                                />
                                            </div>
                                            <div className="alloc-stats">
                                                <span>Current: {alloc.currentAllocation.toFixed(1)}%</span>
                                                <span>Initial: {alloc.initialAllocation.toFixed(1)}%</span>
                                            </div>
                                            <div className="alloc-performance">
                                                <span>Mean Reward: {alloc.meanReward.toFixed(3)}</span>
                                                <span>Pulls: {alloc.pulls}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {advancedResults.bandit.regretHistory && advancedResults.bandit.regretHistory.length > 0 && (
                                <div className="regret-chart">
                                    <h4>Cumulative Regret Over Time</h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <AreaChart data={advancedResults.bandit.regretHistory}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="totalPulls"
                                                label={{ value: 'Total Assignments', position: 'insideBottom', offset: -5 }}
                                            />
                                            <YAxis label={{ value: 'Cumulative Regret', angle: -90, position: 'insideLeft' }} />
                                            <Tooltip />
                                            <Area
                                                type="monotone"
                                                dataKey="cumulativeRegret"
                                                stroke="#6366F1"
                                                fill="#6366F1"
                                                fillOpacity={0.3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                    <p className="chart-note">
                                        Lower regret indicates better performance. The algorithm is learning which variant performs best.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Winner Modal */}
            {showWinnerModal && winnerData && (
                <ABWinnerModal
                    winnerData={winnerData}
                    experiment={experiment}
                    onClose={() => setShowWinnerModal(false)}
                />
            )}
        </div>
    );
}
