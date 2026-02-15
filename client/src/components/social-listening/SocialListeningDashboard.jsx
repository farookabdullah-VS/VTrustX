/**
 * Social Listening Dashboard - Main Entry Point
 *
 * Tabs: Overview, Mentions, Topics, Influencers, Competitors, Alerts, Sources
 */

import React, { useState, lazy, Suspense } from 'react';
import { SocialListeningProvider } from '../../contexts/SocialListeningContext';
import { Radio, Ear, MessageCircle, TrendingUp, Users, Award, Bell, Settings, AlertTriangle } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './SocialListeningDashboard.css';

// Lazy load tab components
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const MentionsTab = lazy(() => import('./tabs/MentionsTab'));
const TopicsTab = lazy(() => import('./tabs/TopicsTab'));
const InfluencersTab = lazy(() => import('./tabs/InfluencersTab'));
const CompetitorsTab = lazy(() => import('./tabs/CompetitorsTab'));
const AlertsTab = lazy(() => import('./tabs/AlertsTab'));
const CrisisControlCenter = lazy(() => import('./CrisisControlCenter'));
const SourcesTab = lazy(() => import('./tabs/SourcesTab'));

const SocialListeningDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'mentions', label: 'Mentions', icon: MessageCircle },
    { id: 'topics', label: 'Topics', icon: TrendingUp },
    { id: 'influencers', label: 'Influencers', icon: Award },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'crisis', label: 'Crisis Control', icon: AlertTriangle },
    { id: 'sources', label: 'Sources', icon: Settings }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'mentions':
        return <MentionsTab />;
      case 'topics':
        return <TopicsTab />;
      case 'influencers':
        return <InfluencersTab />;
      case 'competitors':
        return <CompetitorsTab />;
      case 'alerts':
        return <AlertsTab />;
      case 'crisis':
        return <CrisisControlCenter />;
      case 'sources':
        return <SourcesTab />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <SocialListeningProvider>
      <div className="social-listening-dashboard">
        {/* Header */}
        <div className="sl-header">
          <div className="sl-header-content">
            <div className="sl-title-section">
              <Ear size={32} className="sl-icon" />
              <div>
                <h1>Social Listening</h1>
                <p className="sl-subtitle">Monitor and analyze brand mentions across social media</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="sl-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`sl-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="sl-content">
          <Suspense fallback={
            <div className="sl-loading-container">
              <LoadingSpinner />
            </div>
          }>
            {renderTabContent()}
          </Suspense>
        </div>
      </div>
    </SocialListeningProvider>
  );
};

export default SocialListeningDashboard;
