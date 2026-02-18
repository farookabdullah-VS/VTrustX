/**
 * New Analytics Studio
 *
 * Refactored version with modular architecture, better performance, and enhanced features.
 * This is the orchestration layer that coordinates all sub-components.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Core components
import ReportList from './core/ReportList';
import ReportDesigner from './core/ReportDesigner';
import CreateReportModal from './core/CreateReportModal';

// Dashboard components
import { DeliveryAnalyticsDashboard } from './DeliveryAnalyticsDashboard';
import { SentimentDashboard } from './SentimentDashboard';
import SentimentAnalyticsDashboard from './SentimentAnalyticsDashboard';
import { SurveyAnalystChat } from './SurveyAnalystChat';

// Services
import { getReports, saveReport, deleteReport } from '../../services/reportService';
import { useToast } from '../common/Toast';

// Shared utilities
import { AnalyticsLiveRegion } from './shared/LiveRegion';

/**
 * Tab Navigation Component
 */
function TabNavigation({ activeTab, onTabChange, tabs }) {
  return (
    <div
      role="tablist"
      aria-label="Analytics sections"
      style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '2px solid #e5e7eb',
        marginBottom: '24px'
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-panel`}
          id={`${tab.id}-tab`}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: `3px solid ${activeTab === tab.id ? '#8b5cf6' : 'transparent'}`,
            color: activeTab === tab.id ? '#8b5cf6' : '#6b7280',
            fontWeight: activeTab === tab.id ? '600' : '400',
            fontSize: '0.938rem',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Error Boundary for graceful error handling
 */
class AnalyticsErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Analytics Studio Error:', error, errorInfo);

    // Report to Sentry if available
    if (window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          errorInfo: {
            componentStack: errorInfo.componentStack
          }
        }
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '40px',
            textAlign: 'center',
            background: '#fff',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}
        >
          <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            We encountered an error loading the Analytics Studio. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              background: '#8b5cf6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.938rem',
              fontWeight: '600'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main New Analytics Studio Component
 */
export default function NewAnalyticsStudio() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('custom-reports');
  const [activeView, setActiveView] = useState('list'); // 'list' or 'designer'
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { showToast } = useToast();

  // Available tabs
  const tabs = [
    { id: 'custom-reports', label: t('analytics.tabs.custom_reports') },
    { id: 'survey-analytics', label: t('analytics.tabs.survey_analytics') },
    { id: 'delivery-performance', label: t('analytics.tabs.delivery_performance') },
    { id: 'sentiment-analysis', label: t('analytics.tabs.sentiment_analysis') },
    { id: 'ai-insights', label: t('analytics.tabs.ai_insights') }
  ];

  // Load reports on mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getReports();
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
      showToast({
        type: 'error',
        message: 'Failed to load reports. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = (reportData) => {
    setShowCreateModal(false);

    if (reportData.mode === 'template') {
      // Template creation handled by CreateReportModal
      loadReports();
    } else {
      // Start from scratch - open designer
      const newReport = {
        id: `temp-${Date.now()}`,
        title: reportData.title || 'Untitled Report',
        form_id: reportData.surveyId,
        layout: [],
        widgets: [],
        isNew: true
      };
      setSelectedReport(newReport);
      setActiveView('designer');
    }
  };

  const handleSaveReport = async (reportData) => {
    try {
      const savedReport = await saveReport(reportData);

      showToast({
        type: 'success',
        message: 'Report saved successfully!'
      });

      // Update reports list
      await loadReports();

      // Update selected report if it's the one we just saved
      if (selectedReport?.id === reportData.id) {
        setSelectedReport(savedReport);
      }

      return savedReport;
    } catch (error) {
      console.error('Failed to save report:', error);
      showToast({
        type: 'error',
        message: 'Failed to save report. Please try again.'
      });
      throw error;
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await deleteReport(reportId);

      showToast({
        type: 'success',
        message: 'Report deleted successfully!'
      });

      // Reload reports and return to list view
      await loadReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport(null);
        setActiveView('list');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      showToast({
        type: 'error',
        message: 'Failed to delete report. Please try again.'
      });
    }
  };

  const handleOpenReport = (report) => {
    setSelectedReport(report);
    setActiveView('designer');
  };

  const handleCloseDesigner = () => {
    setSelectedReport(null);
    setActiveView('list');
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'custom-reports':
        return (
          <div
            role="tabpanel"
            id="custom-reports-panel"
            aria-labelledby="custom-reports-tab"
          >
            {activeView === 'list' ? (
              <ReportList
                reports={reports}
                loading={loading}
                onOpenReport={handleOpenReport}
                onDeleteReport={handleDeleteReport}
                onCreateReport={() => setShowCreateModal(true)}
              />
            ) : (
              <ReportDesigner
                report={selectedReport}
                onSave={handleSaveReport}
                onClose={handleCloseDesigner}
              />
            )}
          </div>
        );

      case 'survey-analytics':
        return (
          <div
            role="tabpanel"
            id="survey-analytics-panel"
            aria-labelledby="survey-analytics-tab"
          >
            {/* Legacy Survey Analytics - can be refactored in future */}
            <div style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '16px' }}>
                Survey Analytics
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Create custom reports using the report builder or explore pre-built analytics dashboards.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '10px 24px',
                  background: '#8b5cf6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.938rem',
                  fontWeight: '600'
                }}
              >
                Create Survey Report
              </button>
            </div>
          </div>
        );

      case 'delivery-performance':
        return (
          <div
            role="tabpanel"
            id="delivery-performance-panel"
            aria-labelledby="delivery-performance-tab"
          >
            <DeliveryAnalyticsDashboard />
          </div>
        );

      case 'sentiment-analysis':
        return (
          <div
            role="tabpanel"
            id="sentiment-analysis-panel"
            aria-labelledby="sentiment-analysis-tab"
          >
            <SentimentAnalyticsDashboard />
          </div>
        );

      case 'ai-insights':
        return (
          <div
            role="tabpanel"
            id="ai-insights-panel"
            aria-labelledby="ai-insights-tab"
          >
            <SurveyAnalystChat />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnalyticsErrorBoundary>
      <div
        style={{
          padding: '24px',
          maxWidth: '1400px',
          margin: '0 auto',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '8px' }}>
            {t('analytics.title')}
          </h1>
          <p style={{ color: '#6b7280', fontSize: '1rem' }}>
            {t('analytics.subtitle')}
          </p>
        </div>

        {/* Tab Navigation */}
        {activeView === 'list' && (
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
          />
        )}

        {/* Tab Content */}
        {renderTabContent()}

        {/* Create Report Modal */}
        {showCreateModal && (
          <CreateReportModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateReport}
          />
        )}

        {/* Live Region for screen readers */}
        <AnalyticsLiveRegion />
      </div>
    </AnalyticsErrorBoundary>
  );
}
