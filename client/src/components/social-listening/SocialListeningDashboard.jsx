/**
 * Social Listening Dashboard - Main Entry Point
 *
 * Tabs: Overview, Mentions, Topics, Influencers, Competitors, Alerts, Sources
 */

import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SocialListeningProvider } from '../../contexts/SocialListeningContext';
import { Radio, Ear, MessageCircle, TrendingUp, Users, Award, Bell, Settings, AlertTriangle, Reply } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import './SocialListeningDashboard.css';

// Lazy load tab components
const OverviewTab = lazy(() => import('./tabs/OverviewTab'));
const MentionsTab = lazy(() => import('./tabs/MentionsTab'));
const TopicsTab = lazy(() => import('./tabs/TopicsTab'));
const InfluencersTab = lazy(() => import('./tabs/InfluencersTab'));
const CompetitorsTab = lazy(() => import('./tabs/CompetitorsTab'));
const AlertsTab = lazy(() => import('./tabs/AlertsTab'));
const ResponsesTab = lazy(() => import('./tabs/ResponsesTab'));
const CrisisControlCenter = lazy(() => import('./CrisisControlCenter'));
const SourcesTab = lazy(() => import('./tabs/SourcesTab'));

const SocialListeningDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Extract active tab from URL path
  const pathParts = location.pathname.split('/');
  const activeTab = pathParts[2] || 'overview';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Radio },
    { id: 'mentions', label: 'Mentions', icon: MessageCircle },
    { id: 'topics', label: 'Topics', icon: TrendingUp },
    { id: 'influencers', label: 'Influencers', icon: Award },
    { id: 'competitors', label: 'Competitors', icon: Users },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'responses', label: 'Responses', icon: Reply },
    { id: 'crisis', label: 'Crisis Control', icon: AlertTriangle },
    { id: 'sources', label: 'Sources', icon: Settings }
  ];

  const handleTabClick = (tabId) => {
    navigate(`/social-listening/${tabId}`);
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
                onClick={() => handleTabClick(tab.id)}
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
            <Routes>
              <Route path="/" element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewTab />} />
              <Route path="mentions" element={<MentionsTab />} />
              <Route path="topics" element={<TopicsTab />} />
              <Route path="influencers" element={<InfluencersTab />} />
              <Route path="competitors" element={<CompetitorsTab />} />
              <Route path="alerts" element={<AlertsTab />} />
              <Route path="responses" element={<ResponsesTab />} />
              <Route path="crisis" element={<CrisisControlCenter />} />
              <Route path="sources" element={<SourcesTab />} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </SocialListeningProvider>
  );
};

export default SocialListeningDashboard;
