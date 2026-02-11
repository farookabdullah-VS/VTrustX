import React from 'react';
import { Navigate } from 'react-router-dom';

// Lazy load components for code splitting
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const FormViewer = React.lazy(() => import('./components/FormViewer').then(m => ({ default: m.FormViewer })));
const FormBuilder = React.lazy(() => import('./components/FormBuilder').then(m => ({ default: m.FormBuilder })));
const ResultsViewer = React.lazy(() => import('./components/ResultsViewer').then(m => ({ default: m.ResultsViewer })));
const AnalysisViewer = React.lazy(() => import('./components/AnalysisViewer').then(m => ({ default: m.AnalysisViewer })));
const ContactMaster = React.lazy(() => import('./components/ContactMaster').then(m => ({ default: m.ContactMaster })));
const Customer360 = React.lazy(() => import('./components/Customer360').then(m => ({ default: m.Customer360 })));
const CJM = React.lazy(() => import('./components/CJM').then(m => ({ default: m.CJM })));
const JourneyMapView = React.lazy(() => import('./components/JourneyMapView').then(m => ({ default: m.JourneyMapView })));
const JourneyBuilder = React.lazy(() => import('./components/JourneyBuilder').then(m => ({ default: m.JourneyBuilder })));
const CxPersonaBuilder = React.lazy(() => import('./components/CxPersonaBuilder').then(m => ({ default: m.CxPersonaBuilder })));
const PersonaTemplates = React.lazy(() => import('./components/PersonaTemplates').then(m => ({ default: m.PersonaTemplates })));
const PersonaEngine = React.lazy(() => import('./components/PersonaEngine').then(m => ({ default: m.PersonaEngine })));
const CxDashboard = React.lazy(() => import('./components/CxDashboard').then(m => ({ default: m.CxDashboard })));
const SurveyReports = React.lazy(() => import('./components/SurveyReports').then(m => ({ default: m.SurveyReports })));
const AnalyticsBuilder = React.lazy(() => import('./components/analytics/AnalyticsBuilder').then(m => ({ default: m.AnalyticsBuilder })));
const AnalyticsStudio = React.lazy(() => import('./components/analytics/AnalyticsStudio').then(m => ({ default: m.AnalyticsStudio })));
const DynamicDashboard = React.lazy(() => import('./components/DynamicDashboard').then(m => ({ default: m.DynamicDashboard })));
const SurveyActivityDashboard = React.lazy(() => import('./components/SurveyActivityDashboard').then(m => ({ default: m.SurveyActivityDashboard })));
const TicketListView = React.lazy(() => import('./components/TicketListView').then(m => ({ default: m.TicketListView })));
const TicketDetailView = React.lazy(() => import('./components/TicketDetailView').then(m => ({ default: m.TicketDetailView })));
const XMDirectory = React.lazy(() => import('./components/XMDirectory').then(m => ({ default: m.XMDirectory })));
const ActionPlanning = React.lazy(() => import('./components/ActionPlanning').then(m => ({ default: m.ActionPlanning })));
const TicketSettings = React.lazy(() => import('./components/TicketSettings').then(m => ({ default: m.TicketSettings })));
const SocialMediaMarketing = React.lazy(() => import('./components/SocialMediaMarketing').then(m => ({ default: m.SocialMediaMarketing })));
const ReputationManager = React.lazy(() => import('./components/ReputationManager').then(m => ({ default: m.ReputationManager })));
const IntegrationPage = React.lazy(() => import('./components/IntegrationPage').then(m => ({ default: m.IntegrationPage })));
const IntegrationDetailView = React.lazy(() => import('./components/IntegrationDetailView').then(m => ({ default: m.IntegrationDetailView })));
const AIIntegrations = React.lazy(() => import('./components/AIIntegrations').then(m => ({ default: m.AIIntegrations })));
const CRMIntegration = React.lazy(() => import('./components/CRMIntegration').then(m => ({ default: m.CRMIntegration })));
const RoleMaster = React.lazy(() => import('./components/RoleMaster').then(m => ({ default: m.RoleMaster })));
const TenantManagement = React.lazy(() => import('./components/TenantManagement').then(m => ({ default: m.TenantManagement })));
const SubscriptionManagement = React.lazy(() => import('./components/SubscriptionManagement').then(m => ({ default: m.SubscriptionManagement })));
const GlobalAdminDashboard = React.lazy(() => import('./components/GlobalAdminDashboard').then(m => ({ default: m.GlobalAdminDashboard })));
const SystemSettings = React.lazy(() => import('./components/SystemSettings').then(m => ({ default: m.SystemSettings })));
const ThemeSettings = React.lazy(() => import('./components/ThemeSettings').then(m => ({ default: m.ThemeSettings })));
const TextIQDashboard = React.lazy(() => import('./components/TextIQDashboard').then(m => ({ default: m.TextIQDashboard })));
const AISurveyor = React.lazy(() => import('./components/AISurveyor').then(m => ({ default: m.AISurveyor })));
const AIVideoAgentPage = React.lazy(() => import('./components/AIVideoAgentPage').then(m => ({ default: m.AIVideoAgentPage })));
const SurveyDistribution = React.lazy(() => import('./components/SurveyDistribution').then(m => ({ default: m.SurveyDistribution })));
const MobileExperience = React.lazy(() => import('./components/MobileExperience').then(m => ({ default: m.MobileExperience })));
const TemplateLibrary = React.lazy(() => import('./components/TemplateLibrary').then(m => ({ default: m.TemplateLibrary })));

/**
 * Main application routes configuration
 * Using React Router v6 patterns
 */
export const routes = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/dashboard',
    element: <Dashboard />
  },

  // Surveys & Forms
  {
    path: '/surveys',
    element: <FormViewer />
  },
  {
    path: '/surveys/:formId',
    element: <FormViewer />
  },
  {
    path: '/surveys/:formId/edit',
    element: <FormBuilder />
  },
  {
    path: '/surveys/:formId/results',
    element: <ResultsViewer />
  },
  {
    path: '/surveys/:formId/analysis',
    element: <AnalysisViewer />
  },
  {
    path: '/survey-results',
    element: <ResultsViewer />
  },
  {
    path: '/distributions',
    element: <SurveyDistribution />
  },
  {
    path: '/mobile-app',
    element: <MobileExperience />
  },
  {
    path: '/templates',
    element: <TemplateLibrary />
  },

  // AI Agents
  {
    path: '/ai-surveyor',
    element: <AISurveyor />
  },
  {
    path: '/ai-video-agent',
    element: <AIVideoAgentPage />
  },

  // Engagement & Ticketing
  {
    path: '/tickets',
    element: <TicketListView />
  },
  {
    path: '/tickets/:ticketId',
    element: <TicketDetailView />
  },
  {
    path: '/xm-directory',
    element: <XMDirectory />
  },
  {
    path: '/actions',
    element: <ActionPlanning />
  },
  {
    path: '/ticket-settings',
    element: <TicketSettings />
  },

  // Marketing
  {
    path: '/social-media',
    element: <SocialMediaMarketing />
  },
  {
    path: '/reputation',
    element: <ReputationManager />
  },

  // Customer Journey
  {
    path: '/cjm',
    element: <CJM />
  },
  {
    path: '/cjm-analytics',
    element: <JourneyMapView />
  },
  {
    path: '/journeys',
    element: <JourneyBuilder />
  },

  // Personas
  {
    path: '/personas',
    element: <CxPersonaBuilder />
  },
  {
    path: '/persona-templates',
    element: <PersonaTemplates />
  },
  {
    path: '/persona-engine',
    element: <PersonaEngine />
  },

  // Analytics
  {
    path: '/cx-ratings',
    element: <CxDashboard />
  },
  {
    path: '/survey-reports',
    element: <SurveyReports />
  },
  {
    path: '/analytics-builder',
    element: <AnalyticsBuilder />
  },
  {
    path: '/analytics-studio',
    element: <AnalyticsStudio />
  },
  {
    path: '/analytics-dashboard',
    element: <DynamicDashboard />
  },
  {
    path: '/survey-activity-dashboard',
    element: <SurveyActivityDashboard />
  },

  // Customer 360
  {
    path: '/customer360',
    element: <Customer360 />
  },
  {
    path: '/customer360/:contactId',
    element: <Customer360 />
  },
  {
    path: '/contact-master',
    element: <ContactMaster />
  },

  // Integrations
  {
    path: '/integrations',
    element: <IntegrationPage />
  },
  {
    path: '/integrations/:integrationId',
    element: <IntegrationDetailView />
  },
  {
    path: '/ai-integrations',
    element: <AIIntegrations />
  },
  {
    path: '/crm-integration',
    element: <CRMIntegration />
  },

  // TextIQ / CogniVue
  {
    path: '/textiq',
    element: <TextIQDashboard />
  },

  // Admin & Settings
  {
    path: '/roles',
    element: <RoleMaster />
  },
  {
    path: '/tenants',
    element: <TenantManagement />
  },
  {
    path: '/subscriptions',
    element: <SubscriptionManagement />
  },
  {
    path: '/global-admin',
    element: <GlobalAdminDashboard />
  },
  {
    path: '/system-settings',
    element: <SystemSettings />
  },
  {
    path: '/theme',
    element: <ThemeSettings />
  },

  // XM Center (kept as fallback route for now)
  {
    path: '/xm-center',
    element: <Dashboard /> // TODO: Create dedicated XM Center component
  },

  // 404 Not Found
  {
    path: '*',
    element: <NotFound />
  }
];

/**
 * 404 Not Found page
 */
function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: '40px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '6rem',
        fontWeight: '800',
        background: 'var(--primary-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '0 0 20px 0'
      }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-color)', margin: '0 0 10px 0' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a
        href="/dashboard"
        style={{
          padding: '12px 24px',
          background: 'var(--primary-gradient)',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600'
        }}
      >
        Go to Dashboard
      </a>
    </div>
  );
}

/**
 * Generate breadcrumb from current path
 */
export function getBreadcrumb(pathname) {
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbMap = {
    'dashboard': 'Dashboard',
    'surveys': 'Surveys',
    'survey-results': 'Survey Results',
    'distributions': 'SmartReach',
    'mobile-app': 'Frontline App',
    'templates': 'Templates',
    'ai-surveyor': 'Rayi Voice Agent',
    'ai-video-agent': 'Rayi Video Agent',
    'tickets': 'Tickets',
    'xm-directory': 'XM Directory',
    'actions': 'Action Planning',
    'ticket-settings': 'Ticket Settings',
    'social-media': 'Social Media',
    'reputation': 'Reputation',
    'cjm': 'Customer Journey Map',
    'cjm-analytics': 'Journey Analytics',
    'journeys': 'Journey Builder',
    'personas': 'Personas',
    'persona-templates': 'Persona Templates',
    'persona-engine': 'Persona Engine',
    'cx-ratings': 'CX Ratings',
    'survey-reports': 'Survey Reports',
    'analytics-builder': 'Analytics Builder',
    'analytics-studio': 'Analytics Studio',
    'analytics-dashboard': 'Dynamic Dashboard',
    'survey-activity-dashboard': 'Survey Activity',
    'customer360': 'Customer 360',
    'contact-master': 'Contacts',
    'integrations': 'Integrations',
    'ai-integrations': 'AI Integrations',
    'crm-integration': 'CRM Integration',
    'textiq': 'CogniVue',
    'xm-center': 'XM Center',
    'roles': 'Roles',
    'tenants': 'Tenants',
    'subscriptions': 'Subscriptions',
    'global-admin': 'Global Admin',
    'system-settings': 'System Settings',
    'theme': 'Theme Settings',
    'edit': 'Edit',
    'results': 'Results',
    'analysis': 'Analysis'
  };

  if (segments.length === 0) return 'Dashboard';

  // Get the last meaningful segment
  const lastSegment = segments[segments.length - 1];

  // If it's a UUID or number, use the parent segment
  if (/^[0-9a-f-]{36}$|^\d+$/.test(lastSegment) && segments.length > 1) {
    return breadcrumbMap[segments[segments.length - 2]] || 'Details';
  }

  return breadcrumbMap[lastSegment] || lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
