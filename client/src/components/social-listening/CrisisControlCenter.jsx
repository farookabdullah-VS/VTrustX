/**
 * Crisis Control Center Dashboard
 *
 * Real-time AI-powered crisis detection and monitoring
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  Shield,
  RefreshCw
} from 'lucide-react';
import './CrisisControlCenter.css';

const CrisisControlCenter = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await axios.get('/api/v1/social-listening/crisis/dashboard');

      if (response.data.success) {
        setDashboardData(response.data.dashboard);
      }
    } catch (err) {
      console.error('Failed to load crisis dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load crisis dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchDashboard();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboard(true);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get crisis level color
  const getCrisisLevelColor = (level) => {
    const colors = {
      critical: '#DC2626',
      high: '#F59E0B',
      elevated: '#F97316',
      watch: '#3B82F6',
      normal: '#10B981'
    };
    return colors[level] || colors.normal;
  };

  // Get crisis level icon
  const getCrisisLevelIcon = (level) => {
    switch (level) {
      case 'critical':
        return <AlertTriangle size={24} />;
      case 'high':
        return <AlertCircle size={24} />;
      case 'elevated':
        return <TrendingUp size={24} />;
      case 'watch':
        return <Activity size={24} />;
      default:
        return <Shield size={24} />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="crisis-control-center">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading Crisis Control Center...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="crisis-control-center">
        <div className="error-container">
          <XCircle size={48} />
          <h3>Failed to Load Dashboard</h3>
          <p>{error}</p>
          <button onClick={() => fetchDashboard()} className="btn-retry">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { currentRisk, summary, recentEvents, trends } = dashboardData || {};

  return (
    <div className="crisis-control-center">
      {/* Header */}
      <div className="crisis-header">
        <div className="crisis-header-left">
          <AlertTriangle size={32} className="crisis-icon" />
          <div>
            <h1>Crisis Control Center</h1>
            <p className="crisis-subtitle">AI-Powered Real-Time Crisis Detection & Monitoring</p>
          </div>
        </div>
        <div className="crisis-header-right">
          <label className="auto-refresh-toggle">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="btn-refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Current Risk Status - Big Hero Section */}
      <div
        className="crisis-status-hero"
        style={{ borderColor: getCrisisLevelColor(currentRisk?.crisisLevel) }}
      >
        <div className="status-hero-left">
          <div
            className="status-icon-large"
            style={{ color: getCrisisLevelColor(currentRisk?.crisisLevel) }}
          >
            {getCrisisLevelIcon(currentRisk?.crisisLevel)}
          </div>
          <div className="status-info">
            <h2>Current Crisis Level</h2>
            <div
              className="crisis-level-badge large"
              style={{
                background: getCrisisLevelColor(currentRisk?.crisisLevel) + '20',
                color: getCrisisLevelColor(currentRisk?.crisisLevel),
                borderColor: getCrisisLevelColor(currentRisk?.crisisLevel)
              }}
            >
              {currentRisk?.crisisLevel?.toUpperCase() || 'NORMAL'}
            </div>
            <p className="crisis-type">
              Crisis Type: <strong>{currentRisk?.crisisType?.replace(/_/g, ' ')}</strong>
            </p>
          </div>
        </div>
        <div className="status-hero-right">
          <div className="crisis-score-circle">
            <svg viewBox="0 0 200 200" className="score-ring">
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="12"
              />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={getCrisisLevelColor(currentRisk?.crisisLevel)}
                strokeWidth="12"
                strokeDasharray={`${(currentRisk?.crisisScore || 0) * 5.65} 565`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
            </svg>
            <div className="score-value">
              <span className="score-number">{currentRisk?.crisisScore || 0}</span>
              <span className="score-label">Risk Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {currentRisk?.shouldAlert && (
        <div
          className="crisis-alert-banner"
          style={{ background: getCrisisLevelColor(currentRisk?.crisisLevel) + '15' }}
        >
          <AlertTriangle
            size={20}
            style={{ color: getCrisisLevelColor(currentRisk?.crisisLevel) }}
          />
          <span>
            <strong>Crisis Alert Active:</strong> Immediate attention required. Review recommended actions below.
          </span>
        </div>
      )}

      {/* Summary Stats */}
      <div className="crisis-stats-grid">
        <div className="stat-card">
          <div className="stat-icon critical">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{summary?.criticalEventsLast7Days || 0}</div>
            <div className="stat-label">Critical Events (7d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon high">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{summary?.highEventsLast7Days || 0}</div>
            <div className="stat-label">High Events (7d)</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <Activity size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{summary?.avgSeverityScore || 0}</div>
            <div className="stat-label">Avg Severity Score</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{trends?.riskTrend || 'stable'}</div>
            <div className="stat-label">Risk Trend</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="crisis-content-grid">
        {/* Left Column - Indicators & Actions */}
        <div className="crisis-left-column">
          {/* Crisis Indicators */}
          <div className="crisis-card">
            <div className="card-header">
              <Activity size={20} />
              <h3>Crisis Indicators</h3>
            </div>
            <div className="indicators-list">
              {/* Volume Anomaly */}
              <div className="indicator-item">
                <div className="indicator-header">
                  <span className="indicator-label">Volume Anomaly</span>
                  <span className="indicator-score">
                    {Math.round(currentRisk?.indicators?.volumeAnomaly?.score || 0)}
                  </span>
                </div>
                <div className="indicator-bar">
                  <div
                    className="indicator-fill"
                    style={{
                      width: `${currentRisk?.indicators?.volumeAnomaly?.score || 0}%`,
                      background: currentRisk?.indicators?.volumeAnomaly?.score > 70
                        ? '#DC2626'
                        : currentRisk?.indicators?.volumeAnomaly?.score > 40
                        ? '#F59E0B'
                        : '#10B981'
                    }}
                  ></div>
                </div>
                <div className="indicator-details">
                  <span>Current: {currentRisk?.indicators?.volumeAnomaly?.current}</span>
                  <span>
                    Change: {currentRisk?.indicators?.volumeAnomaly?.percentageChange}%
                  </span>
                </div>
              </div>

              {/* Sentiment Anomaly */}
              <div className="indicator-item">
                <div className="indicator-header">
                  <span className="indicator-label">Sentiment Anomaly</span>
                  <span className="indicator-score">
                    {Math.round(currentRisk?.indicators?.sentimentAnomaly?.score || 0)}
                  </span>
                </div>
                <div className="indicator-bar">
                  <div
                    className="indicator-fill"
                    style={{
                      width: `${currentRisk?.indicators?.sentimentAnomaly?.score || 0}%`,
                      background: currentRisk?.indicators?.sentimentAnomaly?.score > 70
                        ? '#DC2626'
                        : currentRisk?.indicators?.sentimentAnomaly?.score > 40
                        ? '#F59E0B'
                        : '#10B981'
                    }}
                  ></div>
                </div>
                <div className="indicator-details">
                  <span>
                    Sentiment: {currentRisk?.indicators?.sentimentAnomaly?.current?.toFixed(2)}
                  </span>
                  <span>Trend: {currentRisk?.indicators?.sentimentAnomaly?.trend}</span>
                </div>
              </div>

              {/* Influencer Risk */}
              <div className="indicator-item">
                <div className="indicator-header">
                  <span className="indicator-label">Influencer Risk</span>
                  <span className="indicator-score">
                    {Math.round(currentRisk?.indicators?.influencerRisk?.score || 0)}
                  </span>
                </div>
                <div className="indicator-bar">
                  <div
                    className="indicator-fill"
                    style={{
                      width: `${currentRisk?.indicators?.influencerRisk?.score || 0}%`,
                      background: currentRisk?.indicators?.influencerRisk?.score > 70
                        ? '#DC2626'
                        : currentRisk?.indicators?.influencerRisk?.score > 40
                        ? '#F59E0B'
                        : '#10B981'
                    }}
                  ></div>
                </div>
                <div className="indicator-details">
                  <span>
                    Influencers: {currentRisk?.indicators?.influencerRisk?.influencerCount}
                  </span>
                </div>
              </div>

              {/* Velocity Score */}
              <div className="indicator-item">
                <div className="indicator-header">
                  <span className="indicator-label">Velocity Score</span>
                  <span className="indicator-score">
                    {Math.round(currentRisk?.indicators?.velocityScore?.score || 0)}
                  </span>
                </div>
                <div className="indicator-bar">
                  <div
                    className="indicator-fill"
                    style={{
                      width: `${currentRisk?.indicators?.velocityScore?.score || 0}%`,
                      background: currentRisk?.indicators?.velocityScore?.score > 70
                        ? '#DC2626'
                        : currentRisk?.indicators?.velocityScore?.score > 40
                        ? '#F59E0B'
                        : '#10B981'
                    }}
                  ></div>
                </div>
                <div className="indicator-details">
                  <span>{currentRisk?.indicators?.velocityScore?.description}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommended Actions */}
          <div className="crisis-card">
            <div className="card-header">
              <CheckCircle size={20} />
              <h3>Recommended Actions</h3>
            </div>
            <div className="actions-list">
              {currentRisk?.recommendedActions?.length > 0 ? (
                currentRisk.recommendedActions.map((action, index) => (
                  <div key={index} className="action-item">
                    <div className="action-priority">
                      <span className={`priority-badge priority-${action.priority}`}>
                        P{action.priority}
                      </span>
                    </div>
                    <div className="action-content">
                      <p className="action-text">{action.action}</p>
                      <span className="action-type">{action.type}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-actions">
                  <CheckCircle size={32} />
                  <p>No immediate actions required</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Recent Events & Mentions */}
        <div className="crisis-right-column">
          {/* Recent Crisis Events */}
          <div className="crisis-card">
            <div className="card-header">
              <Clock size={20} />
              <h3>Recent Crisis Events</h3>
            </div>
            <div className="events-timeline">
              {recentEvents?.length > 0 ? (
                recentEvents.map((event, index) => (
                  <div key={event.id} className="timeline-item">
                    <div
                      className="timeline-marker"
                      style={{ background: getCrisisLevelColor(event.crisis_level) }}
                    ></div>
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span
                          className="crisis-level-badge"
                          style={{
                            background: getCrisisLevelColor(event.crisis_level) + '20',
                            color: getCrisisLevelColor(event.crisis_level)
                          }}
                        >
                          {event.crisis_level}
                        </span>
                        <span className="timeline-time">
                          {new Date(event.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="timeline-type">
                        {event.crisis_type?.replace(/_/g, ' ')}
                      </p>
                      <p className="timeline-score">Score: {event.severity_score}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-events">
                  <Shield size={32} />
                  <p>No recent crisis events</p>
                </div>
              )}
            </div>
          </div>

          {/* Concerning Mentions */}
          <div className="crisis-card">
            <div className="card-header">
              <Users size={20} />
              <h3>Concerning Mentions</h3>
            </div>
            <div className="mentions-list">
              {currentRisk?.concerningMentions?.length > 0 ? (
                currentRisk.concerningMentions.map((mention, index) => (
                  <div key={mention.id} className="mention-item">
                    <div className="mention-header">
                      <span className="mention-author">{mention.author_name}</span>
                      <span className="mention-platform">{mention.platform}</span>
                    </div>
                    <p className="mention-content">{mention.content}</p>
                    <div className="mention-footer">
                      <span>Reach: {mention.reach_estimate?.toLocaleString()}</span>
                      <span>Sentiment: {mention.sentiment_score?.toFixed(2)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-mentions">
                  <CheckCircle size={32} />
                  <p>No concerning mentions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrisisControlCenter;
