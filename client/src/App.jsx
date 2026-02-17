import React, { Suspense, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/common/Toast';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { AppLayout } from './components/layout/AppLayout';
import { useTranslation } from 'react-i18next';
import './App.css';

// --- Lazy-loaded route components ---
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const CxDashboard = React.lazy(() => import('./components/CxDashboard').then(m => ({ default: m.CxDashboard })));
const FormBuilder = React.lazy(() => import('./components/FormBuilder').then(m => ({ default: m.FormBuilder })));
const FormViewer = React.lazy(() => import('./components/FormViewer').then(m => ({ default: m.FormViewer })));
const ResultsViewer = React.lazy(() => import('./components/ResultsViewer').then(m => ({ default: m.ResultsViewer })));
const SurveyDistribution = React.lazy(() => import('./components/SurveyDistribution').then(m => ({ default: m.SurveyDistribution })));
const AIIntegrations = React.lazy(() => import('./components/AIIntegrations').then(m => ({ default: m.AIIntegrations })));
const IntegrationsView = React.lazy(() => import('./components/IntegrationsView').then(m => ({ default: m.IntegrationsView })));
const PublicReportViewer = React.lazy(() => import('./components/PublicReportViewer').then(m => ({ default: m.PublicReportViewer })));
const UserManagement = React.lazy(() => import('./components/UserManagement').then(m => ({ default: m.UserManagement })));
const UserProfile = React.lazy(() => import('./components/UserProfile').then(m => ({ default: m.UserProfile })));
const RoleMaster = React.lazy(() => import('./components/RoleMaster').then(m => ({ default: m.RoleMaster })));
const ContactMaster = React.lazy(() => import('./components/ContactMaster').then(m => ({ default: m.ContactMaster })));
const ContactSegments = React.lazy(() => import('./components/contacts/ContactSegments'));
const CustomFieldsManager = React.lazy(() => import('./components/contacts/CustomFieldsManager'));
const TagsManager = React.lazy(() => import('./components/contacts/TagsManager'));
const DuplicateMergeManager = React.lazy(() => import('./components/contacts/DuplicateMergeManager'));
const SuppressionListManager = React.lazy(() => import('./components/contacts/SuppressionListManager'));
const TicketListView = React.lazy(() => import('./components/TicketListView').then(m => ({ default: m.TicketListView })));
const TicketDetailView = React.lazy(() => import('./components/TicketDetailView').then(m => ({ default: m.TicketDetailView })));
const CrmDashboard = React.lazy(() => import('./components/CrmDashboard').then(m => ({ default: m.CrmDashboard })));
const Login = React.lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const SubscriptionManagement = React.lazy(() => import('./components/SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement })));
const GlobalAdminDashboard = React.lazy(() => import('./components/GlobalAdminDashboard').then(m => ({ default: m.GlobalAdminDashboard })));
const TemplateGallery = React.lazy(() => import('./components/TemplateGallery').then(m => ({ default: m.TemplateGallery })));
const SupportPage = React.lazy(() => import('./components/SupportPage').then(m => ({ default: m.SupportPage })));
const ThemeSettings = React.lazy(() => import('./components/ThemeSettings').then(m => ({ default: m.ThemeSettings })));
const SystemSettings = React.lazy(() => import('./components/SystemSettings').then(m => ({ default: m.SystemSettings })));
const RulesEngine = React.lazy(() => import('./components/RulesEngine').then(m => ({ default: m.RulesEngine })));
const CxPersonaBuilder = React.lazy(() => import('./components/CxPersonaBuilder').then(m => ({ default: m.CxPersonaBuilder })));
const JourneyBuilder = React.lazy(() => import('./components/JourneyBuilder').then(m => ({ default: m.JourneyBuilder })));
const Customer360 = React.lazy(() => import('./components/Customer360').then(m => ({ default: m.Customer360 })));
const TicketSettings = React.lazy(() => import('./components/TicketSettings').then(m => ({ default: m.TicketSettings })));
const SurveyReportSelector = React.lazy(() => import('./components/SurveyReportSelector').then(m => ({ default: m.SurveyReportSelector })));
const AISurveyor = React.lazy(() => import('./components/AISurveyor').then(m => ({ default: m.AISurveyor })));
const AIVideoAgentPage = React.lazy(() => import('./components/AIVideoAgentPage').then(m => ({ default: m.AIVideoAgentPage })));
const VoiceAgentPublic = React.lazy(() => import('./components/VoiceAgentPublic').then(m => ({ default: m.VoiceAgentPublic })));
const CxPersonaTemplates = React.lazy(() => import('./components/CxPersonaTemplates'));
const AnalyticsStudio = React.lazy(() => import('./components/analytics/AnalyticsStudioWrapper'));
const AnalyticsBuilder = React.lazy(() => import('./components/analytics/AnalyticsBuilder').then(m => ({ default: m.AnalyticsBuilder })));
const SurveyAnalyticsDashboard = React.lazy(() => import('./components/analytics/SurveyAnalyticsDashboard').then(m => ({ default: m.SurveyAnalyticsDashboard })));
const DynamicDashboard = React.lazy(() => import('./components/DynamicDashboard'));
const TextIQDashboard = React.lazy(() => import('./components/TextIQDashboard').then(m => ({ default: m.TextIQDashboard })));
const XMDirectory = React.lazy(() => import('./components/XMDirectory').then(m => ({ default: m.XMDirectory })));
const ActionPlanning = React.lazy(() => import('./components/ActionPlanning').then(m => ({ default: m.ActionPlanning })));
const SocialMediaMarketing = React.lazy(() => import('./components/SocialMediaMarketing.jsx'));
const ReputationManager = React.lazy(() => import('./components/ReputationManager.jsx'));
const CJMBuilder = React.lazy(() => import('./components/CJM/CJMBuilder.jsx'));
const CJMDashboard = React.lazy(() => import('./components/CJM/CJMDashboard.jsx'));
const CJMAnalyticsDashboard = React.lazy(() => import('./components/CJM/CJMAnalyticsDashboard.jsx'));
const InteractiveManual = React.lazy(() => import('./components/InteractiveManual').then(m => ({ default: m.InteractiveManual })));
const MobileExperience = React.lazy(() => import('./components/MobileExperience').then(m => ({ default: m.MobileExperience })));
const Notifications = React.lazy(() => import('./components/Notifications').then(m => ({ default: m.Notifications })));
const ABTestingDashboard = React.lazy(() => import('./components/ab-testing/ABTestingDashboard'));
const ABExperimentBuilder = React.lazy(() => import('./components/ab-testing/ABExperimentBuilder'));
const ABStatsComparison = React.lazy(() => import('./components/ab-testing/ABStatsComparison'));
const SocialListeningDashboard = React.lazy(() => import('./components/social-listening/SocialListeningDashboard'));
const WorkflowsPage = React.lazy(() => import('./pages/WorkflowsPage'));
const CustomReportsDashboard = React.lazy(() => import('./components/reports/CustomReportsDashboard'));
const CustomReportBuilder = React.lazy(() => import('./components/reports/CustomReportBuilder'));
const CRMConnectionsDashboard = React.lazy(() => import('./components/crm/CRMConnectionsDashboard'));
const CRMConnectionWizard = React.lazy(() => import('./components/crm/CRMConnectionWizard'));
const CRMSyncDashboard = React.lazy(() => import('./components/crm/CRMSyncDashboard'));
const TelegramConfig = React.lazy(() => import('./components/telegram/TelegramConfig'));
const SlackConfig = React.lazy(() => import('./components/slack/SlackConfig'));
const TeamsConfig = React.lazy(() => import('./components/teams/TeamsConfig'));
const DripCampaignsDashboard = React.lazy(() => import('./components/drip-campaigns/DripCampaignsDashboard'));
const DripCampaignBuilder = React.lazy(() => import('./components/drip-campaigns/DripCampaignBuilder'));
const DripCampaignDetails = React.lazy(() => import('./components/drip-campaigns/DripCampaignDetails'));
const WorkflowAutomationList = React.lazy(() => import('./components/workflows/WorkflowAutomationList'));
const WorkflowAutomationBuilder = React.lazy(() => import('./components/workflows/WorkflowAutomationBuilder'));
const APIKeysList = React.lazy(() => import('./components/api-keys/APIKeysList'));
const APIKeyBuilder = React.lazy(() => import('./components/api-keys/APIKeyBuilder'));
const WebhooksList = React.lazy(() => import('./components/webhooks/WebhooksList'));
const WebhookBuilder = React.lazy(() => import('./components/webhooks/WebhookBuilder'));
const AuditLogViewer = React.lazy(() => import('./components/audit-logs/AuditLogViewer'));
const RetentionPolicySettings = React.lazy(() => import('./components/audit-logs/RetentionPolicySettings'));
const IPWhitelistManager = React.lazy(() => import('./components/ip-whitelist/IPWhitelistManager'));
const TwoFactorSettings = React.lazy(() => import('./components/settings/TwoFactorSettings'));
const SSOProvidersList = React.lazy(() => import('./components/sso/SSOProvidersList'));
const SSOProviderWizard = React.lazy(() => import('./components/sso/SSOProviderWizard'));
const TenantManagement = React.lazy(() => import('./components/TenantManagement').then(m => ({ default: m.default })));
const IdentityView = React.lazy(() => import('./components/IdentityView.jsx'));
const PersonaEngineDashboard = React.lazy(() => import('./components/PersonaEngine/PersonaEngineDashboard.jsx'));
const SubscriptionConfig = React.lazy(() => import('./components/SubscriptionConfig.jsx'));
const MediaLibraryPage = React.lazy(() => import('./components/distributions/MediaLibraryPage').then(m => ({ default: m.MediaLibraryPage })));

// --- View title mapping ---
const VIEW_TITLES = {
  dashboard: 'Overview',
  builder: 'Form Builder',
  viewer: 'Surveys',
  surveys: 'Surveys',
  results: 'Results',
  'ai-settings': 'AI Settings',
  'system-settings': 'System Settings',
  'theme-settings': 'Theme & Branding',
  integrations: 'Integrations',
  'user-management': 'User Management',
  workflows: 'Workflows',
  tickets: 'Tickets',
  'ticket-detail': 'Tickets',
  'cx-ratings': 'CX Dashboard',
  personas: 'CX Personas',
  templates: 'Templates',
  'media-library': 'Media Library',
  'contact-master': 'Contacts',
  'contact-segments': 'Contact Segments',
  'custom-fields': 'Custom Fields',
  'contact-tags': 'Contact Tags',
  'contact-duplicates': 'Duplicate Contacts',
  'suppression-list': 'Suppression List',
  'role-master': 'Roles',
  subscription: 'Subscription',
  customer360: 'Unified Customer Profile',
  journeys: 'Journey Orchestration',
  'global-admin': 'Global Administration',
  profile: 'My Profile',
  'survey-reports': 'Survey Reports',
  'crm-reports': 'CRM Reports',
  'analytics-studio': 'Analytics Studio',
  'analytics-builder': 'Analytics Builder',
  'analytics-dashboard': 'Dynamic Dashboard',
  'survey-activity-dashboard': 'Survey Activity',
  textiq: 'Text iQ',
  'xm-directory': 'XM Directory',
  actions: 'Action Planning',
  'social-media': 'Social Media Marketing',
  reputation: 'Reputation Manager',
  cjm: 'Customer Journey Maps',
  'cjm-analytics': 'CJM Analytics',
  'interactive-manual': 'Manual',
  'ai-surveyor': 'AI Surveyor',
  'ai-video-agent': 'AI Video Agent',
  'ticket-settings': 'Ticket Settings',
  'persona-templates': 'Persona Templates',
  smartreach: 'SmartReach',
  'ab-tests': 'A/B Testing',
  'social-listening': 'Social Listening',
  'custom-reports': 'Custom Reports',
  'mobile-app': 'Frontline App',
  'crm-connections': 'CRM Integrations',
  'telegram-config': 'Telegram Bot',
  'slack-config': 'Slack Bot',
  'teams-config': 'Microsoft Teams Bot',
  'drip-campaigns': 'Drip Campaigns',
  'workflows-automation': 'Workflow Automations',
  'api-keys': 'API Keys',
  'webhooks': 'Webhooks',
  'audit-logs': 'Audit Logs',
  'retention-policy': 'Retention Policy',
  'ip-whitelist': 'IP Whitelisting',
  '2fa-settings': 'Two-Factor Authentication',
  'sso-providers': 'SSO Providers',
  identity: 'Identity & Consent',
  'persona-engine': 'GN Persona Engine',
  'subscription-config': 'Plans & Billing',
};

// --- Protected Route Wrapper ---
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

// --- Main App Router (inside AuthProvider) ---
function AppRoutes() {
  const { user, login, isAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();

  // No more global state for IDs - handled via URLs

  const handleNavigate = useCallback((id, payload) => {
    if (id === 'create-normal') {
      navigate('/surveys'); // Open listing or show create modal? Usually /surveys shows listing with Create button.
      return;
    }
    if (id === 'create-template') {
      navigate('/templates');
      return;
    }
    if (id === 'take-survey') {
      navigate(`/surveys/${payload}`);
      return;
    }
    if (id === 'view-results') {
      const formId = payload.id || payload;
      navigate(`/surveys/${formId}/results`);
      return;
    }
    if (id === 'builder' && payload?.initialData) {
      navigate('/builder', { state: { initialData: payload.initialData } });
      return;
    }

    // Map sidebar IDs that don't match route paths
    const routeMap = {
      'survey-results': 'survey-reports',
      'mobile-app': 'mobile-app',
      'xm-center': 'cx-ratings',
      'surveys': 'surveys',
      'tickets': 'tickets'
    };
    navigate(`/${routeMap[id] || id}`);
  }, [navigate]);

  const handleEditForm = useCallback((id, tab = 'questionnaire') => {
    navigate(`/surveys/${id}/edit?tab=${tab}`);
  }, [navigate]);

  const handleEditSubmission = useCallback((subId, formId) => {
    navigate(`/surveys/${formId}?submissionId=${subId}`);
  }, [navigate]);

  return (
    <ThemeProvider user={user}>
      <ToastProvider>
        <ConfirmProvider>
          <NotificationProvider isAuthenticated={isAuthenticated}>
            <Suspense fallback={<LoadingSpinner variant="fullscreen" size={60} message="Loading VTrustX..." showProgress={true} />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={
                  isAuthenticated ? <Navigate to="/" replace /> : <LandingPage onLogin={login} />
                } />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/s/voice/:slug" element={<PublicVoiceRoute />} />
                <Route path="/s/report/:slug" element={<PublicReportRoute />} />
                <Route path="/report/:slug" element={<PublicReportRoute />} />
                <Route path="/s/:slug" element={<PublicSurveyRoute />} />

                {/* Protected routes with AppLayout */}
                <Route element={
                  <ProtectedRoute>
                    <AppLayout onNavigate={handleNavigate} viewTitles={VIEW_TITLES} />
                  </ProtectedRoute>
                }>
                  <Route index element={<Dashboard user={user} />} />
                  <Route path="dashboard" element={<Dashboard user={user} />} />
                  <Route path="cx-ratings" element={<CxDashboard onNavigate={handleNavigate} />} />
                  <Route path="survey-reports" element={<SurveyReportSelector onSelect={(id) => navigate(`/surveys/${id}/results`)} />} />

                  {/* Standardized Survey Routes */}
                  <Route path="surveys" element={<FormViewer user={user} />} />
                  <Route path="surveys/:formId" element={<FormViewer user={user} />} />
                  <Route path="surveys/:formId/edit" element={<FormBuilder user={user} />} />
                  <Route path="surveys/:formId/results" element={<ResultsViewer onBack={() => navigate('/surveys')} />} />
                  <Route path="surveys/:formId/smartreach" element={<SurveyDistribution onBack={() => navigate('/surveys')} />} />

                  {/* Legacy/Shortcut routes (Redirected or handled by param-less components) */}
                  <Route path="builder" element={<FormBuilder user={user} />} />
                  <Route path="results" element={<FormViewer user={user} />} /> {/* FormViewer handles list if no param */}
                  <Route path="smartreach" element={<SurveyDistribution onBack={() => navigate('/')} />} />
                  <Route path="viewer" element={<FormViewer user={user} />} />
                  <Route path="ai-settings" element={<AIIntegrations />} />
                  <Route path="system-settings" element={<SystemSettings />} />
                  <Route path="ticket-settings" element={<TicketSettings />} />
                  <Route path="theme-settings" element={<ThemeSettings />} />
                  <Route path="interactive-manual" element={<InteractiveManual />} />
                  <Route path="ai-surveyor" element={<AISurveyor />} />
                  <Route path="ai-video-agent" element={<AIVideoAgentPage />} />
                  <Route path="profile" element={<UserProfile user={user} onUpdateUser={(updatedUser) => setUser(prev => ({ ...prev, user: updatedUser }))} />} />
                  <Route path="integrations" element={<IntegrationsView />} />
                  <Route path="identity" element={<IdentityView />} />
                  <Route path="workflows" element={<WorkflowsPage />} />
                  <Route path="user-management" element={<UserManagement />} />
                  <Route path="role-master" element={<RoleMaster />} />
                  <Route path="persona-engine" element={<PersonaEngineDashboard />} />
                  <Route path="subscription-config" element={<SubscriptionConfig />} />
                  <Route path="tenant-management" element={<TenantManagement />} />
                  <Route path="subscription" element={<SubscriptionManagement />} />
                  <Route path="global-admin" element={<GlobalAdminDashboard />} />
                  <Route path="admin" element={<Navigate to="/global-admin" replace />} />
                  <Route path="contact-master" element={<ContactMaster />} />
                  <Route path="contact-segments" element={<ContactSegments />} />
                  <Route path="custom-fields" element={<CustomFieldsManager />} />
                  <Route path="contact-tags" element={<TagsManager />} />
                  <Route path="contact-duplicates" element={<DuplicateMergeManager />} />
                  <Route path="suppression-list" element={<SuppressionListManager />} />
                  <Route path="customer360" element={<Customer360 />} />
                  <Route path="personas" element={<CxPersonaBuilder onNavigate={(v) => navigate(`/${v}`)} />} />
                  <Route path="journeys" element={<JourneyBuilder />} />
                  <Route path="persona-templates" element={
                    <PersonaTemplatesRoute navigate={navigate} />
                  } />
                  <Route path="templates" element={
                    <div style={{ height: 'calc(100vh - 100px)' }}>
                      <TemplateGallery displayMode="page" onSelect={(template) => {
                        navigate('/builder', { state: { initialData: { ...template.definition, title: template.title } } });
                      }} />
                    </div>
                  } />
                  <Route path="media-library" element={<MediaLibraryPage />} />
                  <Route path="tickets" element={<TicketListView user={user} />} />
                  <Route path="tickets/:id" element={<TicketDetailView user={user} onBack={() => navigate('/tickets')} />} />
                  <Route path="crm-reports" element={<CrmDashboard user={user} />} />
                  <Route path="ticket-detail" element={<TicketDetailView user={user} />} /> {/* Legacy fallback */}

                  <Route path="analytics-studio" element={<AnalyticsStudio />} />
                  <Route path="analytics-builder" element={<AnalyticsBuilder onNavigate={(v) => navigate(`/${v}`)} />} />
                  <Route path="analytics-dashboard" element={<DynamicDashboard />} />
                  <Route path="survey-activity-dashboard" element={<SurveyAnalyticsDashboard />} />
                  <Route path="textiq" element={<TextIQDashboard />} />
                  <Route path="xm-directory" element={<XMDirectory />} />
                  <Route path="actions" element={<ActionPlanning />} />
                  <Route path="social-media" element={<SocialMediaMarketing />} />
                  <Route path="reputation" element={<ReputationManager />} />
                  <Route path="cjm" element={<CJMDashboard />} />
                  <Route path="cjm/:mapId" element={<CJMBuilder onBack={() => navigate('/cjm')} />} />
                  <Route path="cjm-analytics" element={<CJMAnalyticsDashboard />} />

                  {/* A/B Testing Routes */}
                  <Route path="ab-tests" element={<ABTestingDashboard />} />
                  <Route path="ab-tests/new" element={<ABExperimentBuilder />} />
                  <Route path="ab-tests/:id" element={<ABStatsComparison />} />

                  {/* Social Listening Route */}
                  <Route path="social-listening/*" element={<SocialListeningDashboard />} />

                  {/* Custom Reports Routes */}
                  <Route path="custom-reports" element={<CustomReportsDashboard />} />
                  <Route path="custom-reports/new" element={<CustomReportBuilder />} />
                  <Route path="custom-reports/:id" element={<CustomReportBuilder />} />
                  <Route path="custom-reports/:id/edit" element={<CustomReportBuilder />} />

                  {/* CRM Integrations Routes */}
                  <Route path="crm-connections" element={<CRMConnectionsDashboard />} />
                  <Route path="crm-connections/new" element={<CRMConnectionWizard />} />
                  <Route path="crm-connections/:id/sync" element={<CRMSyncDashboard />} />

                  {/* Telegram Bot Configuration */}
                  <Route path="telegram-config" element={<TelegramConfig />} />

                  {/* Slack Bot Configuration */}
                  <Route path="slack-config" element={<SlackConfig />} />

                  {/* Microsoft Teams Bot Configuration */}
                  <Route path="teams-config" element={<TeamsConfig />} />

                  {/* Drip Campaigns Routes */}
                  <Route path="drip-campaigns" element={<DripCampaignsDashboard />} />
                  <Route path="drip-campaigns/new" element={<DripCampaignBuilder />} />
                  <Route path="drip-campaigns/:id" element={<DripCampaignDetails />} />
                  <Route path="workflows-automation" element={<WorkflowAutomationList />} />
                  <Route path="workflows-automation/new" element={<WorkflowAutomationBuilder />} />

                  {/* API Keys & Webhooks Routes */}
                  <Route path="api-keys" element={<APIKeysList />} />
                  <Route path="api-keys/new" element={<APIKeyBuilder />} />
                  <Route path="webhooks" element={<WebhooksList />} />
                  <Route path="webhooks/new" element={<WebhookBuilder />} />

                  {/* Audit Logs Routes */}
                  <Route path="audit-logs" element={<AuditLogViewer />} />
                  <Route path="retention-policy" element={<RetentionPolicySettings />} />

                  {/* IP Whitelisting Routes */}
                  <Route path="ip-whitelist" element={<IPWhitelistManager />} />

                  {/* Frontline App Route */}
                  <Route path="mobile-app" element={<MobileExperience />} />

                  {/* Security Settings Routes */}
                  <Route path="2fa-settings" element={<TwoFactorSettings />} />

                  {/* SSO Provider Routes */}
                  <Route path="sso-providers" element={<SSOProvidersList />} />
                  <Route path="sso-providers/new" element={<SSOProviderWizard />} />
                  <Route path="sso-providers/:id/edit" element={<SSOProviderWizard />} />

                  {/* Backward Compatibility Redirects */}
                  <Route path="form-viewer" element={<Navigate to="/surveys" replace />} />
                </Route>

                {/* Catch-all: redirect to dashboard or login */}
                <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// --- Helper route components ---
function PublicSurveyRoute() {
  const { slug } = useParams();
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff' }}>
      <Suspense fallback={<LoadingSpinner variant="fullscreen" size={60} message="Loading Survey..." />}>
        <FormViewer slug={slug} isPublic={true} />
      </Suspense>
    </div>
  );
}

function PublicReportRoute() {
  const { slug } = useParams();
  return <Suspense fallback={<LoadingSpinner variant="fullscreen" size={60} message="Loading Report..." />}><PublicReportViewer token={slug} /></Suspense>;
}

function PublicVoiceRoute() {
  const { slug } = useParams();
  return <Suspense fallback={<LoadingSpinner variant="fullscreen" size={60} message="Loading Voice Agent..." />}><VoiceAgentPublic slug={slug} /></Suspense>;
}

function BuilderWithParam({ handleEditForm }) {
  const { id } = useParams();
  React.useEffect(() => { handleEditForm(id); }, [id]);
  return null;
}

function PersonaTemplatesRoute({ navigate }) {
  const axios = require('axios').default;
  const { useToast } = require('./components/common/Toast');
  const toast = useToast();

  return (
    <CxPersonaTemplates
      onSelectTemplate={(tmpl) => {
        const payload = {
          name: tmpl.payload?.name || tmpl.title,
          title: tmpl.payload?.title || "Generated Persona",
          layout_config: tmpl.payload?.layout_config,
        };
        axios.post('/api/cx-personas', payload)
          .then(() => navigate('/personas'))
          .catch(err => toast.error("Failed to create: " + err.message));
      }}
    />
  );
}

// --- Root App ---
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
