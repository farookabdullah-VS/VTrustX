import React, { useState, useEffect } from 'react';
import { Bell, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
// import './AlertsTab.css'; // Temporarily disabled to debug import issues

const AlertsTab = () => {
  const [alerts, setAlerts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('events'); // 'events' or 'rules'

  useEffect(() => {
    fetchAlerts();
    fetchEvents();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await socialListeningApi.alerts.list();
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await socialListeningApi.alerts.events.list({ limit: 50 });
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to fetch alert events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventAction = async (eventId, status) => {
    try {
      await socialListeningApi.alerts.events.action(eventId, status);
      fetchEvents();
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  const getRuleTypeLabel = (type) => {
    const labels = {
      sentiment_threshold: 'Sentiment Alert',
      volume_spike: 'Volume Spike',
      keyword_match: 'Keyword Match',
      influencer_mention: 'Influencer Mention',
      competitor_spike: 'Competitor Activity'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: Clock, color: '#3b82f6', bg: '#dbeafe', label: 'Pending' },
      acknowledged: { icon: CheckCircle, color: '#10b981', bg: '#d1fae5', label: 'Acknowledged' },
      resolved: { icon: CheckCircle, color: '#6b7280', bg: '#f3f4f6', label: 'Resolved' }
    };

    const badge = badges[status] || badges.pending;
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

  if (loading) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="alerts-tab">
      {/* Header */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <Bell size={20} />
            Alerts & Notifications
          </h2>
          <button className="sl-button" onClick={() => alert('Alert rule builder coming soon')}>
            <Plus size={18} />
            Create Alert
          </button>
        </div>

        {/* View Toggle */}
        <div className="view-toggle">
          <button
            className={`toggle-btn ${activeView === 'events' ? 'active' : ''}`}
            onClick={() => setActiveView('events')}
          >
            Recent Events ({events.length})
          </button>
          <button
            className={`toggle-btn ${activeView === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveView('rules')}
          >
            Alert Rules ({alerts.length})
          </button>
        </div>
      </div>

      {/* Recent Events View */}
      {activeView === 'events' && (
        <div className="sl-tab-section">
          {events.length === 0 ? (
            <div className="sl-empty-state">
              <Bell size={48} className="sl-empty-icon" />
              <h3>No alert events</h3>
              <p>Alert events will appear here when triggered</p>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event) => (
                <div key={event.id} className="event-card">
                  <div className="event-icon">
                    <AlertCircle size={20} />
                  </div>
                  <div className="event-content">
                    <div className="event-header">
                      <div className="event-title">{event.alert_name || 'Alert Triggered'}</div>
                      {getStatusBadge(event.status)}
                    </div>
                    <div className="event-message">{event.message}</div>
                    <div className="event-meta">
                      <span>{new Date(event.triggered_at).toLocaleString()}</span>
                      {event.mention_count && (
                        <span>• {event.mention_count} mentions</span>
                      )}
                    </div>
                  </div>
                  {event.status === 'pending' && (
                    <div className="event-actions">
                      <button
                        className="action-btn-ack"
                        onClick={() => handleEventAction(event.id, 'acknowledged')}
                      >
                        Acknowledge
                      </button>
                      <button
                        className="action-btn-resolve"
                        onClick={() => handleEventAction(event.id, 'resolved')}
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Alert Rules View */}
      {activeView === 'rules' && (
        <div className="sl-tab-section">
          {alerts.length === 0 ? (
            <div className="sl-empty-state">
              <Bell size={48} className="sl-empty-icon" />
              <h3>No alert rules</h3>
              <p>Create alert rules to get notified of important events</p>
              <button className="sl-button" onClick={() => alert('Alert rule builder coming soon')}>
                <Plus size={18} />
                Create Your First Alert
              </button>
            </div>
          ) : (
            <div className="rules-list">
              {alerts.map((alert) => (
                <div key={alert.id} className="rule-card">
                  <div className="rule-header">
                    <div className="rule-title">{alert.name}</div>
                    <div className={`rule-status ${alert.is_active ? 'active' : 'inactive'}`}>
                      {alert.is_active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="rule-type">{getRuleTypeLabel(alert.rule_type)}</div>
                  {alert.description && (
                    <div className="rule-description">{alert.description}</div>
                  )}
                  <div className="rule-actions-chips">
                    {alert.actions?.map((action, i) => (
                      <span key={i} className="action-chip">{action}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlertsTab;
