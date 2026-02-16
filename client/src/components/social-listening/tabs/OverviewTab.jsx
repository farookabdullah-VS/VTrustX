/**
 * Overview Tab - KPI Metrics & Trends
 */

import React, { useState, useEffect } from 'react';
import { useSocialListening } from '../../../contexts/SocialListeningContext';
import { MessageCircle, TrendingUp, ThumbsUp, ThumbsDown, BarChart3 } from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import SentimentTrendChart from '../components/SentimentTrendChart';
import VolumeTrendChart from '../components/VolumeTrendChart';
import './OverviewTab.css';

const OverviewTab = () => {
  const { overview, loading, fetchOverview } = useSocialListening();
  const [dateRange, setDateRange] = useState('7d'); // 7d, 30d, 90d

  useEffect(() => {
    const now = new Date();
    const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    fetchOverview({
      date_from: dateFrom.toISOString().split('T')[0],
      date_to: now.toISOString().split('T')[0]
    });
  }, [dateRange]);

  if (loading.overview && !overview) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  const getSentimentColor = (score) => {
    if (score > 0.3) return '#10b981'; // positive - green
    if (score < -0.3) return '#ef4444'; // negative - red
    return '#f59e0b'; // neutral - amber
  };

  const formatSentiment = (score) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  return (
    <div className="overview-tab">
      {/* Date Range Selector */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <BarChart3 size={20} />
            Performance Overview
          </h2>
          <div className="date-range-selector">
            <button
              className={`range-btn ${dateRange === '7d' ? 'active' : ''}`}
              onClick={() => setDateRange('7d')}
            >
              Last 7 Days
            </button>
            <button
              className={`range-btn ${dateRange === '30d' ? 'active' : ''}`}
              onClick={() => setDateRange('30d')}
            >
              Last 30 Days
            </button>
            <button
              className={`range-btn ${dateRange === '90d' ? 'active' : ''}`}
              onClick={() => setDateRange('90d')}
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpi-cards">
          {/* Total Mentions */}
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 10%, transparent)' }}>
              <MessageCircle size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Total Mentions</div>
              <div className="kpi-value">{overview?.total_mentions?.toLocaleString() || 0}</div>
            </div>
          </div>

          {/* Average Sentiment */}
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: getSentimentColor(overview?.avg_sentiment || 0) + '20' }}>
              {(overview?.avg_sentiment || 0) >= 0 ? (
                <ThumbsUp size={24} style={{ color: getSentimentColor(overview?.avg_sentiment || 0) }} />
              ) : (
                <ThumbsDown size={24} style={{ color: getSentimentColor(overview?.avg_sentiment || 0) }} />
              )}
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Average Sentiment</div>
              <div className="kpi-value" style={{ color: getSentimentColor(overview?.avg_sentiment || 0) }}>
                {formatSentiment(overview?.avg_sentiment || 0)}
              </div>
              <div className="kpi-subtext">{(overview?.avg_sentiment || 0).toFixed(2)}</div>
            </div>
          </div>

          {/* Top Platform */}
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--secondary-color, #FFB300) 15%, transparent)' }}>
              <TrendingUp size={24} style={{ color: 'var(--secondary-color, #FFB300)' }} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Top Platform</div>
              <div className="kpi-value">{overview?.by_platform?.[0]?.platform || 'N/A'}</div>
              <div className="kpi-subtext">{overview?.by_platform?.[0]?.count || 0} mentions</div>
            </div>
          </div>

          {/* Top Intent */}
          <div className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: 'color-mix(in srgb, var(--primary-color) 15%, transparent)' }}>
              <BarChart3 size={24} style={{ color: 'var(--primary-color)' }} />
            </div>
            <div className="kpi-content">
              <div className="kpi-label">Top Intent</div>
              <div className="kpi-value">{overview?.by_intent?.[0]?.intent || 'N/A'}</div>
              <div className="kpi-subtext">{overview?.by_intent?.[0]?.count || 0} mentions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment Trend Chart */}
      <div className="sl-tab-section">
        <h2 className="sl-section-title">
          <TrendingUp size={20} />
          Sentiment Trend
        </h2>
        <SentimentTrendChart dateRange={dateRange} />
      </div>

      {/* Volume Trend Chart */}
      <div className="sl-tab-section">
        <h2 className="sl-section-title">
          <MessageCircle size={20} />
          Mention Volume by Platform
        </h2>
        <VolumeTrendChart dateRange={dateRange} />
      </div>

      {/* Platform & Intent Breakdown */}
      <div className="breakdown-grid">
        {/* By Platform */}
        <div className="sl-tab-section">
          <h3 className="sl-section-title">By Platform</h3>
          <div className="breakdown-list">
            {overview?.by_platform?.length > 0 ? (
              overview.by_platform.map((item, index) => (
                <div key={index} className="breakdown-item">
                  <div className="breakdown-label">{item.platform}</div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill"
                      style={{
                        width: `${(item.count / overview.total_mentions) * 100}%`,
                        backgroundColor: 'var(--primary-color, #00695C)'
                      }}
                    />
                  </div>
                  <div className="breakdown-value">{item.count}</div>
                </div>
              ))
            ) : (
              <p className="no-data">No data available</p>
            )}
          </div>
        </div>

        {/* By Sentiment */}
        <div className="sl-tab-section">
          <h3 className="sl-section-title">By Sentiment</h3>
          <div className="breakdown-list">
            {overview?.by_sentiment?.length > 0 ? (
              overview.by_sentiment.map((item, index) => (
                <div key={index} className="breakdown-item">
                  <div className="breakdown-label">{item.sentiment}</div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill"
                      style={{
                        width: `${(item.count / overview.total_mentions) * 100}%`,
                        backgroundColor: getSentimentColor(
                          item.sentiment === 'positive' ? 0.5 :
                          item.sentiment === 'negative' ? -0.5 : 0
                        )
                      }}
                    />
                  </div>
                  <div className="breakdown-value">{item.count}</div>
                </div>
              ))
            ) : (
              <p className="no-data">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
