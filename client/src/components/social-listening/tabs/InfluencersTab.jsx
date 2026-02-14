/**
 * Influencers Tab - Top influencers and engagement metrics
 */

import React, { useState, useEffect } from 'react';
import { Award, Users, TrendingUp, ExternalLink, MessageCircle } from 'lucide-react';
import LoadingSpinner from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
import './InfluencersTab.css';

const InfluencersTab = () => {
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('reach');

  useEffect(() => {
    fetchInfluencers();
  }, [sortBy]);

  const fetchInfluencers = async () => {
    setLoading(true);
    try {
      const response = await socialListeningApi.influencers.list({
        sort_by: sortBy,
        limit: 50
      });
      setInfluencers(response.data);
    } catch (error) {
      console.error('Failed to fetch influencers:', error);
      setInfluencers([]);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const getSentimentColor = (score) => {
    if (score > 0.3) return '#10b981';
    if (score < -0.3) return '#ef4444';
    return '#f59e0b';
  };

  if (loading) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="influencers-tab">
      {/* Header */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <Award size={20} />
            Top Influencers
          </h2>
          <div className="sort-selector">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="reach">Reach</option>
              <option value="engagement">Engagement</option>
              <option value="mentions">Mentions</option>
              <option value="sentiment">Sentiment</option>
            </select>
          </div>
        </div>
      </div>

      {/* Influencers List */}
      {influencers.length === 0 ? (
        <div className="sl-empty-state">
          <Award size={48} className="sl-empty-icon" />
          <h3>No influencers found</h3>
          <p>Influencers will appear as mentions are analyzed</p>
        </div>
      ) : (
        <div className="influencers-grid">
          {influencers.map((influencer, index) => (
            <div key={influencer.id || index} className="influencer-card">
              {/* Rank Badge */}
              <div className="rank-badge">#{index + 1}</div>

              {/* Avatar and Info */}
              <div className="influencer-header">
                <div className="influencer-avatar">
                  {influencer.author_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="influencer-info">
                  <div className="influencer-name">{influencer.author_name || 'Unknown'}</div>
                  <div className="influencer-handle">@{influencer.author_handle || 'unknown'}</div>
                  <div className="platform-tags">
                    {influencer.platforms?.map((platform, i) => (
                      <span key={i} className="platform-tag">{platform}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="metrics-grid">
                <div className="metric-box">
                  <div className="metric-icon">
                    <Users size={18} />
                  </div>
                  <div className="metric-value">{formatNumber(influencer.total_reach)}</div>
                  <div className="metric-label">Reach</div>
                </div>
                <div className="metric-box">
                  <div className="metric-icon">
                    <TrendingUp size={18} />
                  </div>
                  <div className="metric-value">{formatNumber(influencer.engagement_rate * 100)}%</div>
                  <div className="metric-label">Engagement</div>
                </div>
                <div className="metric-box">
                  <div className="metric-icon">
                    <MessageCircle size={18} />
                  </div>
                  <div className="metric-value">{influencer.mention_count || 0}</div>
                  <div className="metric-label">Mentions</div>
                </div>
                <div className="metric-box">
                  <div
                    className="metric-icon"
                    style={{ color: getSentimentColor(influencer.avg_sentiment) }}
                  >
                    ❤️
                  </div>
                  <div
                    className="metric-value"
                    style={{ color: getSentimentColor(influencer.avg_sentiment) }}
                  >
                    {(influencer.avg_sentiment || 0).toFixed(2)}
                  </div>
                  <div className="metric-label">Sentiment</div>
                </div>
              </div>

              {/* Latest Mention Preview */}
              {influencer.latest_mention && (
                <div className="latest-mention">
                  <div className="mention-label">Latest Mention:</div>
                  <div className="mention-text">"{influencer.latest_mention}"</div>
                  <div className="mention-date">
                    {new Date(influencer.last_mention_date).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="influencer-actions">
                <button
                  className="action-btn-primary"
                  onClick={() => influencer.profile_url && window.open(influencer.profile_url, '_blank')}
                  disabled={!influencer.profile_url}
                >
                  <ExternalLink size={16} />
                  View Profile
                </button>
                <button className="action-btn-secondary">
                  <MessageCircle size={16} />
                  See All Mentions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InfluencersTab;
