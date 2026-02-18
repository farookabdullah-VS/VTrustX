/**
 * Mentions Tab - Filterable mention feed with detail view
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSocialListening } from '../../../contexts/SocialListeningContext';
import {
  MessageCircle, Filter, Search, ThumbsUp, ThumbsDown, Minus,
  ExternalLink, Reply, Flag, CheckCircle, Clock, AlertCircle,
  Instagram, Twitter, Facebook, Linkedin, Youtube, Music, MessageSquare, Eye,
  Download
} from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
import axios from '../../../axiosConfig';
import './MentionsTab.css';

const MentionsTab = () => {
  const { filters, updateFilters } = useSocialListening();
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [selectedMention, setSelectedMention] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchMentions();
  }, [filters, pagination.offset, searchQuery]);

  const fetchMentions = async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset,
        search: searchQuery || undefined
      };

      // Remove null values
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === undefined) {
          delete params[key];
        }
      });

      const response = await socialListeningApi.mentions.list(params);
      setMentions(response.data.mentions);
      setPagination(prev => ({ ...prev, total: response.data.pagination.total }));
    } catch (error) {
      console.error('Failed to fetch mentions:', error);
      setMentions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  }, []);

  const handleExport = (format) => {
    const params = new URLSearchParams({ format });
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.sentiment) params.set('sentiment', filters.sentiment);
    if (filters.intent) params.set('intent', filters.intent);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    params.set('limit', 5000);
    window.open(`/api/v1/social-listening/export/mentions?${params.toString()}`, '_blank');
  };

  const handleFilterChange = (key, value) => {
    updateFilters({ [key]: value });
    setPagination(prev => ({ ...prev, offset: 0 })); // Reset to first page
  };

  const handleStatusChange = async (mentionId, newStatus) => {
    try {
      await socialListeningApi.mentions.update(mentionId, { status: newStatus });
      fetchMentions(); // Refresh list
    } catch (error) {
      console.error('Failed to update mention status:', error);
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp size={16} style={{ color: '#10b981' }} />;
      case 'negative':
        return <ThumbsDown size={16} style={{ color: '#ef4444' }} />;
      default:
        return <Minus size={16} style={{ color: '#f59e0b' }} />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      new: { icon: Clock, color: '#3b82f6', bg: '#dbeafe', label: 'New' },
      reviewed: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Reviewed' },
      responded: { icon: Reply, color: '#8b5cf6', bg: '#ede9fe', label: 'Responded' },
      flagged: { icon: Flag, color: '#ef4444', bg: '#fee2e2', label: 'Flagged' },
      dismissed: { icon: AlertCircle, color: '#6b7280', bg: '#f3f4f6', label: 'Dismissed' }
    };

    const badge = badges[status] || badges.new;
    const Icon = badge.icon;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          backgroundColor: badge.bg,
          color: badge.color,
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 500
        }}
      >
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const renderPlatformIcon = (platform) => {
    const iconProps = { size: 14, style: { marginRight: '4px' } };
    switch (platform?.toLowerCase()) {
      case 'instagram':
        return <Instagram {...iconProps} style={{ ...iconProps.style, color: '#E4405F' }} />;
      case 'twitter':
        return <Twitter {...iconProps} style={{ ...iconProps.style, color: '#1DA1F2' }} />;
      case 'facebook':
        return <Facebook {...iconProps} style={{ ...iconProps.style, color: '#4267B2' }} />;
      case 'linkedin':
        return <Linkedin {...iconProps} style={{ ...iconProps.style, color: '#0077B5' }} />;
      case 'youtube':
        return <Youtube {...iconProps} style={{ ...iconProps.style, color: '#FF0000' }} />;
      case 'tiktok':
        return <Music {...iconProps} style={{ ...iconProps.style, color: '#000000' }} />;
      case 'reddit':
        return <MessageSquare {...iconProps} style={{ ...iconProps.style, color: '#FF4500' }} />;
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="mentions-tab">
      {/* Header with Search and Filters */}
      <div className="sl-tab-section">
        <div className="mentions-header">
          <div className="search-container">
            <Search size={18} style={{ color: '#6c757d' }} />
            <input
              type="text"
              placeholder="Search mentions by content, author, or keywords..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <button
            className="sl-button-secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
            Filters
          </button>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              className="sl-button-secondary"
              title="Export mentions"
              onClick={() => handleExport('csv')}
              style={{ borderRight: 'none', borderRadius: '8px 0 0 8px' }}
            >
              <Download size={16} /> CSV
            </button>
            <button
              className="sl-button-secondary"
              title="Export as Excel"
              onClick={() => handleExport('xlsx')}
              style={{ borderRadius: '0 8px 8px 0', borderLeft: '1px solid #dee2e6' }}
            >
              XLSX
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filter-group">
              <label>Platform</label>
              <select
                value={filters.platform || ''}
                onChange={(e) => handleFilterChange('platform', e.target.value || null)}
              >
                <option value="">All Platforms</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="reddit">Reddit</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Sentiment</label>
              <select
                value={filters.sentiment || ''}
                onChange={(e) => handleFilterChange('sentiment', e.target.value || null)}
              >
                <option value="">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Intent</label>
              <select
                value={filters.intent || ''}
                onChange={(e) => handleFilterChange('intent', e.target.value || null)}
              >
                <option value="">All Intents</option>
                <option value="inquiry">Inquiry</option>
                <option value="complaint">Complaint</option>
                <option value="praise">Praise</option>
                <option value="feature_request">Feature Request</option>
                <option value="general">General</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || null)}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="responded">Responded</option>
                <option value="flagged">Flagged</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="results-summary">
          Showing {mentions.length} of {pagination.total} mentions
        </div>
      </div>

      {/* Mentions List */}
      {loading ? (
        <div className="sl-loading-container">
          <LoadingSpinner />
        </div>
      ) : mentions.length === 0 ? (
        <div className="sl-empty-state">
          <MessageCircle size={48} className="sl-empty-icon" />
          <h3>No mentions found</h3>
          <p>Try adjusting your filters or search criteria</p>
        </div>
      ) : (
        <div className="mentions-grid">
          {mentions.map((mention) => (
            <div key={mention.id} className="mention-card">
              {/* Header */}
              <div className="mention-header">
                <div className="mention-author">
                  <div className="author-avatar">
                    {mention.author_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="author-name">{mention.author_name || 'Unknown'}</div>
                    <div className="mention-meta">
                      <span className="platform-badge">
                        {renderPlatformIcon(mention.platform)}
                        {mention.platform}
                      </span>
                      <span className="mention-time">{formatTimeAgo(mention.published_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="mention-badges">
                  {getSentimentIcon(mention.sentiment)}
                  {getStatusBadge(mention.status)}
                </div>
              </div>

              {/* Content */}
              <div className="mention-content">
                {mention.content}
              </div>

              {/* Metrics */}
              <div className="mention-metrics">
                <div className="metric">
                  <ThumbsUp size={14} />
                  {mention.likes_count || 0}
                </div>
                <div className="metric">
                  <Reply size={14} />
                  {mention.comments_count || 0}
                </div>
                <div className="metric">
                  <MessageCircle size={14} />
                  {mention.shares_count || 0}
                </div>
                <div className="metric">
                  <Eye size={14} />
                  {mention.reach.toLocaleString()} reach
                </div>
              </div>

              {/* Actions */}
              <div className="mention-actions">
                <button
                  className="action-btn"
                  onClick={() => window.open(mention.url, '_blank')}
                  title="View original post"
                >
                  <ExternalLink size={16} />
                  View
                </button>
                <button
                  className="action-btn"
                  onClick={() => setSelectedMention(mention)}
                  title="View details"
                >
                  <MessageCircle size={16} />
                  Details
                </button>
                <select
                  className="status-select"
                  value={mention.status}
                  onChange={(e) => handleStatusChange(mention.id, e.target.value)}
                >
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="responded">Responded</option>
                  <option value="flagged">Flagged</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.total > pagination.limit && (
        <div className="pagination-controls">
          <button
            className="sl-button-secondary"
            disabled={pagination.offset === 0}
            onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
            {Math.ceil(pagination.total / pagination.limit)}
          </span>
          <button
            className="sl-button-secondary"
            disabled={pagination.offset + pagination.limit >= pagination.total}
            onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default MentionsTab;
