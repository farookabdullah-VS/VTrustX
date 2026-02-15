/**
 * Competitors Tab - Competitive benchmarking and Share of Voice
 */

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Plus, Trash2 } from 'lucide-react';
import { LoadingSpinner } from '../../common/LoadingSpinner';
import socialListeningApi from '../../../services/socialListeningApi';
import './CompetitorsTab.css';

const CompetitorsTab = () => {
  const [competitors, setCompetitors] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', keywords: '' });

  useEffect(() => {
    fetchCompetitors();
    fetchBenchmarks();
  }, []);

  const fetchCompetitors = async () => {
    try {
      const response = await socialListeningApi.competitors.list();
      setCompetitors(response.data);
    } catch (error) {
      console.error('Failed to fetch competitors:', error);
    }
  };

  const fetchBenchmarks = async () => {
    setLoading(true);
    try {
      const response = await socialListeningApi.competitors.benchmarks();
      setBenchmarks(response.data);
    } catch (error) {
      console.error('Failed to fetch benchmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async () => {
    try {
      await socialListeningApi.competitors.create({
        name: newCompetitor.name,
        keywords: newCompetitor.keywords.split(',').map(k => k.trim())
      });
      setNewCompetitor({ name: '', keywords: '' });
      setShowAddModal(false);
      fetchCompetitors();
      fetchBenchmarks();
    } catch (error) {
      console.error('Failed to add competitor:', error);
    }
  };

  const handleDeleteCompetitor = async (id) => {
    if (!window.confirm('Are you sure you want to remove this competitor?')) return;
    try {
      await socialListeningApi.competitors.delete(id);
      fetchCompetitors();
      fetchBenchmarks();
    } catch (error) {
      console.error('Failed to delete competitor:', error);
    }
  };

  if (loading) {
    return (
      <div className="sl-loading-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="competitors-tab">
      {/* Header */}
      <div className="sl-tab-section">
        <div className="sl-section-header">
          <h2 className="sl-section-title">
            <Users size={20} />
            Competitive Analysis
          </h2>
          <button className="sl-button" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Competitor
          </button>
        </div>
      </div>

      {competitors.length === 0 ? (
        <div className="sl-empty-state">
          <Users size={48} className="sl-empty-icon" />
          <h3>No competitors added</h3>
          <p>Add competitors to benchmark your performance</p>
          <button className="sl-button" onClick={() => setShowAddModal(true)}>
            <Plus size={18} />
            Add Your First Competitor
          </button>
        </div>
      ) : (
        <>
          {/* Share of Voice */}
          {benchmarks && (
            <div className="sl-tab-section">
              <h3 className="sl-section-title">
                <TrendingUp size={18} />
                Share of Voice
              </h3>
              <div className="sov-chart">
                {benchmarks.map((item, index) => {
                  const total = benchmarks.reduce((sum, b) => sum + (b.mention_count || 0), 0);
                  const percentage = total > 0 ? ((item.mention_count / total) * 100).toFixed(1) : 0;

                  return (
                    <div key={index} className="sov-item">
                      <div className="sov-header">
                        <span className="sov-name">{item.name}</span>
                        <span className="sov-percentage">{percentage}%</span>
                      </div>
                      <div className="sov-bar">
                        <div
                          className="sov-fill"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: index === 0 ? '#667eea' : '#adb5bd'
                          }}
                        />
                      </div>
                      <div className="sov-stats">
                        <span>{item.mention_count || 0} mentions</span>
                        <span>Sentiment: {(item.avg_sentiment || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Competitors List */}
          <div className="sl-tab-section">
            <h3 className="sl-section-title">Tracked Competitors</h3>
            <div className="competitors-list">
              {competitors.map((competitor) => (
                <div key={competitor.id} className="competitor-card">
                  <div className="competitor-info">
                    <div className="competitor-name">{competitor.name}</div>
                    <div className="competitor-keywords">
                      {competitor.keywords?.map((kw, i) => (
                        <span key={i} className="keyword-chip">{kw}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={() => handleDeleteCompetitor(competitor.id)}
                    title="Remove competitor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Competitor Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add Competitor</h3>
            <div className="form-group">
              <label>Competitor Name</label>
              <input
                type="text"
                placeholder="e.g., Competitor Inc."
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Keywords (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., CompetitorName, @competitorhandle"
                value={newCompetitor.keywords}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, keywords: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="sl-button-secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button
                className="sl-button"
                onClick={handleAddCompetitor}
                disabled={!newCompetitor.name || !newCompetitor.keywords}
              >
                Add Competitor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorsTab;
