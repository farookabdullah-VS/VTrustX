/**
 * TemplateGallery - Browse and select report templates
 *
 * Features:
 * - Category filtering
 * - Search functionality
 * - Template preview cards
 * - Usage statistics
 * - Quick create from template
 */

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Search, TrendingUp, FileText, BarChart3, Brain, Star } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

const CATEGORY_ICONS = {
  survey: BarChart3,
  delivery: TrendingUp,
  sentiment: Brain,
  mixed: FileText
};

const CATEGORY_LABELS = {
  survey: 'Survey Analytics',
  delivery: 'Delivery Performance',
  sentiment: 'Sentiment Analysis',
  mixed: 'Mixed / Executive'
};

export function TemplateGallery({ surveyId, onSelectTemplate, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch templates on mount and when category changes
  useEffect(() => {
    fetchTemplates();
  }, [category]);

  // Apply search filter
  useEffect(() => {
    if (searchQuery) {
      const filtered = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTemplates(filtered);
    } else {
      setFilteredTemplates(templates);
    }
  }, [searchQuery, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = category !== 'all' ? `?category=${category}` : '';
      const response = await axios.get(`/api/report-templates${params}`);
      setTemplates(response.data);
      setFilteredTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = useCallback(async (template) => {
    if (!surveyId) {
      alert('Please select a survey first');
      return;
    }

    try {
      // Create report from template
      const response = await axios.post(
        `/api/report-templates/${template.id}/create-report`,
        {
          surveyId,
          title: `${template.name} - ${new Date().toLocaleDateString()}`
        }
      );

      if (response.data.success) {
        onSelectTemplate(response.data.report);
      }
    } catch (err) {
      console.error('Failed to create report from template:', err);
      alert('Failed to create report. Please try again.');
    }
  }, [surveyId, onSelectTemplate]);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-gallery-title"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h2 id="template-gallery-title" className={styles.modalTitle}>
              Report Templates
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px' }}>
              Choose a pre-built template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close template gallery"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search and Filters */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid #e2e8f0' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search
              size={20}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.input}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          {/* Category Tabs */}
          <div className={styles.tabNav} style={{ marginBottom: '16px' }}>
            <button
              className={category === 'all' ? styles.tabActive : styles.tab}
              onClick={() => setCategory('all')}
            >
              All Templates
            </button>
            <button
              className={category === 'survey' ? styles.tabActive : styles.tab}
              onClick={() => setCategory('survey')}
            >
              <BarChart3 size={16} />
              Survey
            </button>
            <button
              className={category === 'delivery' ? styles.tabActive : styles.tab}
              onClick={() => setCategory('delivery')}
            >
              <TrendingUp size={16} />
              Delivery
            </button>
            <button
              className={category === 'sentiment' ? styles.tabActive : styles.tab}
              onClick={() => setCategory('sentiment')}
            >
              <Brain size={16} />
              Sentiment
            </button>
            <button
              className={category === 'mixed' ? styles.tabActive : styles.tab}
              onClick={() => setCategory('mixed')}
            >
              <FileText size={16} />
              Mixed
            </button>
          </div>
        </div>

        {/* Template Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p>Loading templates...</p>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#ef4444' }}>
              <p>{error}</p>
              <button
                onClick={fetchTemplates}
                className={`${styles.button} ${styles.buttonSecondary}`}
                style={{ marginTop: '16px' }}
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && filteredTemplates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
              <FileText size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
              <p style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '8px' }}>
                No templates found
              </p>
              <p>Try adjusting your search or category filter</p>
            </div>
          )}

          {!loading && !error && filteredTemplates.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px'
            }}>
              {filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleSelectTemplate(template)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonSecondary}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * TemplateCard - Individual template preview card
 */
function TemplateCard({ template, onSelect }) {
  const CategoryIcon = CATEGORY_ICONS[template.category] || FileText;
  const categoryLabel = CATEGORY_LABELS[template.category] || template.category;

  const widgetCount = Array.isArray(template.widgets) ? template.widgets.length : 0;

  return (
    <div className={styles.reportCard} style={{ cursor: 'pointer', height: '100%' }}>
      {/* Thumbnail */}
      {template.thumbnail_url ? (
        <div style={{
          width: '100%',
          height: '180px',
          background: `url(${template.thumbnail_url}) center/cover`,
          borderRadius: '8px 8px 0 0',
          borderBottom: '1px solid #e2e8f0'
        }} />
      ) : (
        <div style={{
          width: '100%',
          height: '180px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '3rem',
          opacity: 0.9
        }}>
          <CategoryIcon size={64} />
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '16px' }}>
        {/* Category Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          background: '#eff6ff',
          color: '#2563eb',
          borderRadius: '12px',
          fontSize: '0.75rem',
          fontWeight: '600',
          marginBottom: '12px'
        }}>
          <CategoryIcon size={12} />
          {categoryLabel}
        </div>

        {/* Title */}
        <h3 style={{
          fontSize: '1.1rem',
          fontWeight: '600',
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          {template.name}
        </h3>

        {/* Description */}
        {template.description && (
          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            lineHeight: '1.5',
            marginBottom: '16px',
            minHeight: '42px'
          }}>
            {template.description}
          </p>
        )}

        {/* Metadata */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8rem',
          color: '#94a3b8',
          marginBottom: '16px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <span>{widgetCount} widgets</span>
          {template.usage_count > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} fill="#fbbf24" stroke="#fbbf24" />
              {template.usage_count} uses
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={onSelect}
          className={`${styles.button} ${styles.buttonPrimary}`}
          style={{ width: '100%' }}
        >
          Use This Template
        </button>
      </div>
    </div>
  );
}

export default TemplateGallery;
