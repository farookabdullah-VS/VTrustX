/**
 * AnalyticsStudio - Main Analytics Studio Component (Refactored)
 *
 * This is the refactored version, reduced from 3,391 lines to ~150 lines
 * by extracting components into modular architecture.
 *
 * Components used:
 * - ReportList: Report listing and management
 * - ReportDesigner: Main report design interface
 * - CreateReportModal: Survey selection modal
 * - DeliveryAnalyticsDashboard: Delivery performance analytics
 * - SentimentDashboard: Sentiment analysis dashboard
 * - SentimentAnalyticsDashboard: AI-powered sentiment analysis
 */

import React, { useState, useEffect } from 'react';
import { ReportList, ReportDesigner, CreateReportModal } from './core';
import { DeliveryAnalyticsDashboard } from './DeliveryAnalyticsDashboard';
import { SentimentDashboard } from './SentimentDashboard';
import SentimentAnalyticsDashboard from './SentimentAnalyticsDashboard';
import { extractFieldsFromDefinition, generateReportId } from './shared/helpers';
import styles from './styles/Analytics.module.css';

/**
 * Main AnalyticsStudio Component
 */
export const AnalyticsStudio = () => {
  // View state: 'list' or 'designer'
  const [view, setView] = useState('list');

  // Active tab: 'surveys', 'delivery', 'sentiment', 'ai-sentiment'
  const [activeTab, setActiveTab] = useState('surveys');

  // Currently active report
  const [activeReport, setActiveReport] = useState(null);

  // Show/hide create report modal
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Selected form (for sentiment dashboards)
  const [selectedForm, setSelectedForm] = useState(null);

  // Log version on mount
  useEffect(() => {
    console.log('AnalyticsStudio v2.0 Loaded - Modular Architecture');
  }, []);

  /**
   * Handle create new report button click
   */
  const handleCreateReport = () => {
    setShowCreateModal(true);
  };

  /**
   * Handle survey selection from CreateReportModal
   */
  const handleSurveySelect = (survey) => {
    // Parse fields from survey definition
    const fields = extractFieldsFromDefinition(survey.definition);

    // Initialize new report
    const newReport = {
      id: generateReportId(),
      title: survey.title || 'New Report',
      surveyId: survey.id,
      surveyName: survey.title,
      fields: fields,
      definition: survey.definition,
      widgets: [],
      layout: [],
      filters: {}
    };

    setActiveReport(newReport);
    setShowCreateModal(false);
    setView('designer');
  };

  /**
   * Handle opening an existing report
   */
  const handleOpenReport = (report) => {
    setActiveReport(report);
    setView('designer');
  };

  /**
   * Handle back from designer to list
   */
  const handleBackToList = () => {
    setView('list');
    setActiveReport(null);
  };

  // If in designer view, show ReportDesigner
  if (view === 'designer' && activeReport) {
    return (
      <ReportDesigner
        report={activeReport}
        onBack={handleBackToList}
      />
    );
  }

  // Otherwise, show main container with tabs
  return (
    <div className={styles.container}>
      {/* Tab Navigation */}
      <nav className={styles.tabNav} role="navigation" aria-label="Analytics sections">
        <button
          onClick={() => setActiveTab('surveys')}
          className={`${styles.tab} ${activeTab === 'surveys' ? styles.active : ''}`}
          aria-current={activeTab === 'surveys' ? 'page' : undefined}
        >
          📊 Survey Analytics
        </button>

        <button
          onClick={() => setActiveTab('delivery')}
          className={`${styles.tab} ${activeTab === 'delivery' ? styles.active : ''}`}
          aria-current={activeTab === 'delivery' ? 'page' : undefined}
        >
          📬 Delivery Performance
        </button>

        <button
          onClick={() => setActiveTab('sentiment')}
          className={`${styles.tab} ${activeTab === 'sentiment' ? styles.active : ''}`}
          aria-current={activeTab === 'sentiment' ? 'page' : undefined}
        >
          😊 Sentiment Analysis
        </button>

        <button
          onClick={() => setActiveTab('ai-sentiment')}
          className={`${styles.tab} ${activeTab === 'ai-sentiment' ? styles.active : ''}`}
          aria-current={activeTab === 'ai-sentiment' ? 'page' : undefined}
        >
          🤖 AI Sentiment
        </button>
      </nav>

      {/* Tab Content */}
      <div role="tabpanel" aria-label={`${activeTab} content`}>
        {activeTab === 'surveys' && (
          <>
            <ReportList
              onCreateReport={handleCreateReport}
              onOpenReport={handleOpenReport}
            />
            {showCreateModal && (
              <CreateReportModal
                onClose={() => setShowCreateModal(false)}
                onSelect={handleSurveySelect}
              />
            )}
          </>
        )}

        {activeTab === 'delivery' && (
          <DeliveryAnalyticsDashboard />
        )}

        {activeTab === 'sentiment' && (
          <SentimentDashboard formId={selectedForm?.id} />
        )}

        {activeTab === 'ai-sentiment' && (
          <SentimentAnalyticsDashboard formId={selectedForm?.id} />
        )}
      </div>
    </div>
  );
};

export default AnalyticsStudio;
