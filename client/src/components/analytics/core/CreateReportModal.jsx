import React, { useState, useEffect } from 'react';
import { ChevronRight, FileText, Layout } from 'lucide-react';
import { getForms } from '../../../services/formService';
import { TemplateGallery } from '../templates/TemplateGallery';
import styles from '../styles/Analytics.module.css';

/**
 * CreateReportModal - Modal for selecting a survey data source
 */
export function CreateReportModal({ onClose, onSelect }) {
  const [mode, setMode] = useState('choose'); // 'choose', 'scratch', 'template'
  const [surveys, setSurveys] = useState([]);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSurveys();
  }, []);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      const data = await getForms();
      // Only forms with definition/title
      setSurveys(data.filter(f => f.title));
    } catch (err) {
      console.error("Failed to fetch forms", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSurvey = (survey) => {
    if (mode === 'scratch') {
      onSelect(survey);
    } else if (mode === 'template') {
      setSelectedSurvey(survey);
    }
  };

  const handleSelectTemplate = (report) => {
    onSelect(null, report);
  };

  // Show template gallery if in template mode and survey is selected
  if (mode === 'template' && selectedSurvey) {
    return (
      <TemplateGallery
        surveyId={selectedSurvey.id}
        onSelectTemplate={handleSelectTemplate}
        onClose={() => setSelectedSurvey(null)}
      />
    );
  }

  // Choose creation mode
  if (mode === 'choose') {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={styles.modalContent}
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: '600px' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-report-title"
        >
          <div className={styles.modalHeader}>
            <h2 id="create-report-title" className={styles.modalTitle}>
              Create New Report
            </h2>
          </div>

          <div className={styles.modalBody}>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Choose how you want to create your report
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Start from Scratch */}
              <button
                onClick={() => setMode('scratch')}
                style={{
                  padding: '24px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FileText size={48} color="#2563eb" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  Start from Scratch
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
                  Build a custom report with your own layout and widgets
                </p>
              </button>

              {/* Use Template */}
              <button
                onClick={() => setMode('template')}
                style={{
                  padding: '24px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Layout size={48} color="#2563eb" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                  Use a Template
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5' }}>
                  Get started quickly with pre-built report templates
                </p>
                <div style={{
                  marginTop: '12px',
                  padding: '4px 10px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  Recommended
                </div>
              </button>
            </div>
          </div>

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

  // Select survey (for scratch or template mode)
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-report-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="create-report-title" className={styles.modalTitle}>
            Select Survey Data Source
          </h2>
        </div>

        <div className={styles.modalBody}>
          <button
            onClick={() => setMode('choose')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              background: 'transparent',
              border: 'none',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: '0.875rem',
              marginBottom: '16px'
            }}
          >
            ← Back to options
          </button>

          <p style={{ color: '#64748b', marginBottom: '20px' }}>
            Choose a survey to bind to this report. One report is strictly bound to one survey dataset.
          </p>

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}>
            {loading ? (
              <div className={styles.loading} style={{ padding: '20px' }}>
                <div className={styles.loadingSpinner} />
                <div>Loading surveys...</div>
              </div>
            ) : surveys.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                  No surveys available. Create a survey first.
                </div>
              </div>
            ) : (
              surveys.map(survey => (
                <button
                  key={survey.id}
                  onClick={() => handleSelectSurvey(survey)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'white',
                    border: 'none',
                    textAlign: 'left',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  aria-label={`Select survey: ${survey.title}`}
                >
                  <span style={{ fontWeight: '500', color: '#334155' }}>
                    {survey.title}
                  </span>
                  <ChevronRight size={16} color="#cbd5e1" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.buttonSecondary}`}
            aria-label="Cancel"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateReportModal;
