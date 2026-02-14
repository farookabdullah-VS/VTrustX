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
const AnalyticsStudio = React.lazy(() => import('./components/analytics/AnalyticsStudio').then(m => ({ default: m.AnalyticsStudio })));
const AnalyticsBuilder = React.lazy(() => import('./components/analytics/AnalyticsBuilder').then(m => ({ default: m.AnalyticsBuilder })));
const SurveyAnalyticsDashboard = React.lazy(() => import('./components/analytics/SurveyAnalyticsDashboard').then(m => ({ default: m.SurveyAnalyticsDashboard })));
const DynamicDashboard = React.lazy(() => import('./components/DynamicDashboard'));
const TextIQDashboard = React.lazy(() => import('./components/TextIQDashboard').then(m => ({ default: m.TextIQDashboard })));
const XMDirectory = React.lazy(() => import('./components/XMDirectory').then(m => ({ default: m.XMDirectory })));
const ActionPlanning = React.lazy(() => import('./components/ActionPlanning').then(m => ({ default: m.ActionPlanning })));
const SocialMediaMarketing = React.lazy(() => import('./components/SocialMediaMarketing').then(m => ({ default: m.SocialMediaMarketing })));
const ReputationManager = React.lazy(() => import('./components/ReputationManager').then(m => ({ default: m.ReputationManager })));
const CJMBuilder = React.lazy(() => import('./components/CJM/CJMBuilder').then(m => ({ default: m.CJMBuilder })));
const CJMDashboard = React.lazy(() => import('./components/CJM/CJMDashboard').then(m => ({ default: m.CJMDashboard })));
const CJMAnalyticsDashboard = React.lazy(() => import('./components/CJM/CJMAnalyticsDashboard').then(m => ({ default: m.CJMAnalyticsDashboard })));
const InteractiveManual = React.lazy(() => import('./components/InteractiveManual').then(m => ({ default: m.InteractiveManual })));
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
const DripCampaignsDashboard = React.lazy(() => import('./components/drip-campaigns/DripCampaignsDashboard'));
const DripCampaignBuilder = React.lazy(() => import('./components/drip-campaigns/DripCampaignBuilder'));
const DripCampaignDetails = React.lazy(() => import('./components/drip-campaigns/DripCampaignDetails'));

// --- View title mapping ---
const VIEW_TITLES = {
  dashboard: 'Overview',
  builder: 'Form Builder',
  viewer: 'Surveys',
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
  'contact-master': 'Contacts',
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
  collect: 'Distribution',
  'ab-tests': 'A/B Testing',
  'social-listening': 'Social Listening',
  'custom-reports': 'Custom Reports',
  'crm-connections': 'CRM Integrations',
  'telegram-config': 'Telegram Bot',
  'drip-campaigns': 'Drip Campaigns',
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

  // Shared state for form editing context
  const [currentFormId, setCurrentFormId] = useState(null);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [currentCjmMapId, setCurrentCjmMapId] = useState(null);

  const handleNavigate = useCallback((id, payload) => {
    setCurrentSubmissionId(null);
    setCurrentFormId(null);

    if (id === 'create-normal') {
      navigate('/viewer');
      // Signal to open create modal — handled in AppLayout
      return;
    }
    if (id === 'create-template') {
      navigate('/templates');
      return;
    }
    if (id === 'create-ai') {
      navigate('/viewer');
      return;
    }
    if (id === 'take-survey') {
      setCurrentFormId(payload);
      setCurrentSubmissionId(null);
      navigate('/viewer');
      return;
    }
    if (id === 'view-results') {
      if (typeof payload === 'object' && payload !== null) {
        setCurrentFormId(payload.id);
        setInitialData({ view: payload.view });
      } else {
        setCurrentFormId(payload);
        setInitialData(null);
      }
      navigate('/results');
      return;
    }
    // Builder with payload
    if (id === 'builder' && payload?.initialData) {
      setInitialData(payload.initialData);
      setCurrentFormId(null);
      navigate('/builder');
      return;
    }
    // Map sidebar IDs that don't match route paths
    const routeMap = { 'form-viewer': 'viewer', 'survey-results': 'survey-reports', 'mobile-app': 'distributions', 'xm-center': 'cx-ratings' };
    navigate(`/${routeMap[id] || id}`);
  }, [navigate]);

  const handleEditForm = useCallback((id, tab = 'questionnaire') => {
    setCurrentFormId(id);
    setCurrentSubmissionId(null);
    setInitialData({ initialTab: tab });
    navigate('/builder');
  }, [navigate]);

  const handleEditSubmission = useCallback((subId, formId) => {
    setCurrentFormId(formId);
    setCurrentSubmissionId(subId);
    navigate('/viewer');
  }, [navigate]);

  return (
    <ThemeProvider user={user}>
      <ToastProvider>
        <ConfirmProvider>
          <NotificationProvider isAuthenticated={isAuthenticated}>
            <Suspense fallback={<LoadingSpinner />}>
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
              <Route index element={<Dashboard onNavigate={handleNavigate} onEdit={handleEditForm} onEditSubmission={handleEditSubmission} />} />
              <Route path="dashboard" element={<Dashboard onNavigate={handleNavigate} onEdit={handleEditForm} onEditSubmission={handleEditSubmission} />} />
              <Route path="cx-ratings" element={<CxDashboard onNavigate={handleNavigate} />} />
              <Route path="survey-reports" element={<SurveyReportSelector onSelect={(id) => { setCurrentFormId(id); navigate('/results'); }} />} />
              <Route path="builder" element={
                <FormBuilder user={user} formId={currentFormId} initialData={initialData}
                  onBack={() => { setCurrentFormId(null); navigate('/viewer'); }}
                  onNavigate={(target) => { if (target === 'results') navigate('/results'); }}
                  onFormChange={handleEditForm}
                />
              } />
              <Route path="builder/:id" element={<BuilderWithParam handleEditForm={handleEditForm} />} />

              {/* NEW: URL-based survey routes */}
              <Route path="surveys" element={
                <FormViewer formId={currentFormId} submissionId={currentSubmissionId}
                  onSelectForm={(id) => setCurrentFormId(id)}
                  onEditSubmission={handleEditSubmission}
                  onEditForm={handleEditForm}
                  onCreate={(type) => handleNavigate(type)}
                  user={user}
                />
              } />
              <Route path="surveys/:formId" element={
                <FormViewer
                  onEditSubmission={(subId, fId) => navigate(`/surveys/${fId}?submissionId=${subId}`)}
                  onEditForm={(fId) => navigate(`/surveys/${fId}/edit`)}
                  onCreate={(type) => handleNavigate(type)}
                  user={user}
                />
              } />
              <Route path="surveys/:formId/edit" element={
                <FormBuilder user={user}
                  onFormChange={(id) => navigate(`/surveys/${id}/edit`)}
                />
              } />
              <Route path="surveys/:formId/results" element={
                <ResultsViewer
                  onBack={() => navigate('/surveys')}
                  onEditSubmission={(subId, fId) => navigate(`/surveys/${fId}?submissionId=${subId}`)}
                  onNavigate={(target, payload) => {
                    if (target === 'builder') navigate(`/surveys/${payload}/edit`);
                    else navigate(`/${target}`);
                  }}
                />
              } />
              <Route path="surveys/:formId/collect" element={
                <SurveyDistribution
                  onBack={() => navigate('/surveys')}
                  onNavigate={(target, payload) => {
                    if (target === 'builder') navigate(`/surveys/${payload}/edit`);
                    else navigate(`/${target}`);
                  }}
                />
              } />

              <Route path="results" element={
                <ResultsViewer formId={currentFormId} initialView={initialData?.view}
                  onBack={() => navigate('/')}
                  onEditSubmission={handleEditSubmission}
                  onNavigate={(target) => { if (target === 'builder') handleEditForm(currentFormId); else navigate(`/${target}`); }}
                />
              } />
              <Route path="collect" element={
                <SurveyDistribution formId={currentFormId}
                  onBack={() => navigate('/')}
                  onNavigate={(target) => { if (target === 'builder') handleEditForm(currentFormId); else navigate(`/${target}`); }}
                />
              } />
              <Route path="viewer" element={
                <FormViewer formId={currentFormId} submissionId={currentSubmissionId}
                  onSelectForm={(id) => setCurrentFormId(id)}
                  onEditSubmission={handleEditSubmission}
                  onEditForm={handleEditForm}
                  onCreate={(type) => handleNavigate(type)}
                  user={user}
                />
              } />
              <Route path="ai-settings" element={<AIIntegrations />} />
              <Route path="system-settings" element={<SystemSettings />} />
              <Route path="ticket-settings" element={<TicketSettings />} />
              <Route path="theme-settings" element={<ThemeSettings />} />
              <Route path="interactive-manual" element={<InteractiveManual />} />
              <Route path="ai-surveyor" element={<AISurveyor />} />
              <Route path="ai-video-agent" element={<AIVideoAgentPage />} />
              <Route path="profile" element={<UserProfile user={user} onUpdateUser={(updatedUser) => setUser(prev => ({ ...prev, user: updatedUser }))} />} />
              <Route path="integrations" element={<IntegrationsView />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="user-management" element={<UserManagement />} />
              <Route path="role-master" element={<RoleMaster />} />
              <Route path="subscription" element={<SubscriptionManagement />} />
              <Route path="global-admin" element={<GlobalAdminDashboard />} />
              <Route path="contact-master" element={<ContactMaster />} />
              <Route path="customer360" element={<Customer360 />} />
              <Route path="personas" element={<CxPersonaBuilder onNavigate={(v) => navigate(`/${v}`)} />} />
              <Route path="journeys" element={<JourneyBuilder />} />
              <Route path="persona-templates" element={
                <PersonaTemplatesRoute navigate={navigate} />
              } />
              <Route path="templates" element={
                <div style={{ height: 'calc(100vh - 100px)' }}>
                  <TemplateGallery displayMode="page" onSelect={(template) => {
                    setInitialData({ ...template.definition, title: template.title });
                    setCurrentFormId(null);
                    navigate('/builder');
                  }} />
                </div>
              } />
              <Route path="tickets" element={
                <TicketListView user={user} onSelectTicket={(id) => {
                  if (id === 'reports') navigate('/crm-reports');
                  else { setCurrentTicketId(id); navigate('/ticket-detail'); }
                }} />
              } />
              <Route path="crm-reports" element={<CrmDashboard user={user} />} />
              <Route path="ticket-detail" element={
                <TicketDetailView ticketId={currentTicketId} user={user}
                  onBack={() => { navigate('/tickets'); setCurrentTicketId(null); }}
                />
              } />
              <Route path="analytics-studio" element={<AnalyticsStudio />} />
              <Route path="analytics-builder" element={<AnalyticsBuilder onNavigate={(v) => navigate(`/${v}`)} />} />
              <Route path="analytics-dashboard" element={<DynamicDashboard />} />
              <Route path="survey-activity-dashboard" element={<SurveyAnalyticsDashboard />} />
              <Route path="textiq" element={<TextIQDashboard />} />
              <Route path="xm-directory" element={<XMDirectory />} />
              <Route path="actions" element={<ActionPlanning />} />
              <Route path="social-media" element={<SocialMediaMarketing />} />
              <Route path="reputation" element={<ReputationManager />} />
              <Route path="cjm" element={
                currentCjmMapId
                  ? <CJMBuilder mapId={currentCjmMapId} onBack={() => setCurrentCjmMapId(null)} />
                  : <CJMDashboard onSelectMap={(id) => setCurrentCjmMapId(id)} />
              } />
              <Route path="cjm-analytics" element={<CJMAnalyticsDashboard />} />

              {/* A/B Testing Routes */}
              <Route path="ab-tests" element={<ABTestingDashboard />} />
              <Route path="ab-tests/new" element={<ABExperimentBuilder />} />
              <Route path="ab-tests/:id" element={<ABStatsComparison />} />

              {/* Social Listening Route */}
              <Route path="social-listening" element={<SocialListeningDashboard />} />

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

              {/* Drip Campaigns Routes */}
              <Route path="drip-campaigns" element={<DripCampaignsDashboard />} />
              <Route path="drip-campaigns/new" element={<DripCampaignBuilder />} />
              <Route path="drip-campaigns/:id" element={<DripCampaignDetails />} />

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
      <Suspense fallback={<LoadingSpinner />}>
        <FormViewer slug={slug} isPublic={true} />
      </Suspense>
    </div>
  );
}

function PublicReportRoute() {
  const { slug } = useParams();
  return <Suspense fallback={<LoadingSpinner />}><PublicReportViewer token={slug} /></Suspense>;
}

function PublicVoiceRoute() {
  const { slug } = useParams();
  return <Suspense fallback={<LoadingSpinner />}><VoiceAgentPublic slug={slug} /></Suspense>;
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
