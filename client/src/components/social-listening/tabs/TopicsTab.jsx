/**
 * Topics Tab - Topic clustering and trending themes
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Hash, BarChart3 } from 'lucide-react';
import LoadingSpinner from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
import './TopicsTab.css';

const TopicsTab = () => {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    fetchTopics();
  }, [dateRange]);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysAgo = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const dateFrom = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const response = await socialListeningApi.analytics.topics({
        date_from: dateFrom.toISOString().split('T')[0],
        date_to: now.toISOString().split('T')[0],
        limit: 50
      });

      setTopics(response.data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      setTopics([]);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0.2) return { icon: '📈', color: '#10b981', label: 'Trending Up' };
    if (trend < -0.2) return { icon: '📉', color: '#ef4444', label: 'Trending Down' };
    return { icon: '➡️', color: '#f59e0b', label: 'Stable' };
  };

  const getSentimentColor = (score) => {
    if (score > 0.3) return '#10b981';
    if (score < -0.3) return '#ef4444';
    return '#f59e0b';
  };

  const formatSentiment = (score) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  if (loading) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="topics-tab">
      {/* Header */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <TrendingUp size={20} />
            Trending Topics & Themes
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
      </div>

      {/* Topics Cloud/Grid */}
      {topics.length === 0 ? (
        <div className="sl-empty-state">
          <Hash size={48} className="sl-empty-icon" />
          <h3>No topics found</h3>
          <p>Topics will appear as mentions are analyzed by the AI pipeline</p>
        </div>
      ) : (
        <>
          {/* Topic Cloud */}
          <div className="sl-tab-section">
            <h3 className="sl-section-title">
              <Hash size={18} />
              Topic Cloud
            </h3>
            <div className="topic-cloud">
              {topics.slice(0, 30).map((topic, index) => {
                const maxCount = Math.max(...topics.map(t => t.mention_count));
                const minCount = Math.min(...topics.map(t => t.mention_count));
                const range = maxCount - minCount || 1;
                const normalized = (topic.mention_count - minCount) / range;
                const fontSize = 14 + (normalized * 28); // 14px to 42px

                return (
                  <span
                    key={index}
                    className="topic-tag"
                    style={{
                      fontSize: `${fontSize}px`,
                      opacity: 0.7 + (normalized * 0.3)
                    }}
                    title={`${topic.mention_count} mentions • ${formatSentiment(topic.avg_sentiment)}`}
                  >
                    {topic.topic_name || topic.topic}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Topics Table */}
          <div className="sl-tab-section">
            <h3 className="sl-section-title">
              <BarChart3 size={18} />
              Top Topics
            </h3>
            <div className="topics-table">
              <div className="topics-table-header">
                <div className="col-topic">Topic</div>
                <div className="col-mentions">Mentions</div>
                <div className="col-sentiment">Sentiment</div>
                <div className="col-trend">Trend</div>
              </div>
              {topics.slice(0, 20).map((topic, index) => {
                const trend = getTrendIcon(topic.trend || 0);
                return (
                  <div key={index} className="topics-table-row">
                    <div className="col-topic">
                      <div className="topic-rank">#{index + 1}</div>
                      <div className="topic-info">
                        <div className="topic-name">{topic.topic_name || topic.topic}</div>
                        {topic.keywords && topic.keywords.length > 0 && (
                          <div className="topic-keywords">
                            {topic.keywords.slice(0, 3).map((kw, i) => (
                              <span key={i} className="keyword-tag">{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="col-mentions">
                      <div className="mention-count">{topic.mention_count?.toLocaleString() || 0}</div>
                    </div>
                    <div className="col-sentiment">
                      <div
                        className="sentiment-badge"
                        style={{
                          backgroundColor: getSentimentColor(topic.avg_sentiment) + '20',
                          color: getSentimentColor(topic.avg_sentiment)
                        }}
                      >
                        {formatSentiment(topic.avg_sentiment)}
                      </div>
                      <div className="sentiment-score">{(topic.avg_sentiment || 0).toFixed(2)}</div>
                    </div>
                    <div className="col-trend">
                      <div className="trend-indicator" style={{ color: trend.color }}>
                        <span className="trend-icon">{trend.icon}</span>
                        <span className="trend-label">{trend.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TopicsTab;
