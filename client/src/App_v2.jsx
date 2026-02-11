import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ToastProvider } from './components/common/Toast';
import { ConfirmProvider } from './components/common/ConfirmDialog';
import { LoadingSpinner } from './common/LoadingSpinner';
import { AppLayout } from './components/layout/AppLayout';
import './App.css';

// Lazy-loaded components
const Dashboard = React.lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const FormBuilder = React.lazy(() => import('./components/FormBuilder').then(m => ({ default: m.FormBuilder })));
const FormViewer = React.lazy(() => import('./components/FormViewer').then(m => ({ default: m.FormViewer })));
const ResultsViewer = React.lazy(() => import('./components/ResultsViewer').then(m => ({ default: m.ResultsViewer })));
const AnalysisViewer = React.lazy(() => import('./components/AnalysisViewer').then(m => ({ default: m.AnalysisViewer })));
const SurveyDistribution = React.lazy(() => import('./components/SurveyDistribution').then(m => ({ default: m.SurveyDistribution })));
const TicketListView = React.lazy(() => import('./components/TicketListView').then(m => ({ default: m.TicketListView })));
const TicketDetailView = React.lazy(() => import('./components/TicketDetailView').then(m => ({ default: m.TicketDetailView })));
const ContactMaster = React.lazy(() => import('./components/ContactMaster').then(m => ({ default: m.ContactMaster })));
const Customer360 = React.lazy(() => import('./components/Customer360').then(m => ({ default: m.Customer360 })));
const CxPersonaBuilder = React.lazy(() => import('./components/CxPersonaBuilder').then(m => ({ default: m.CxPersonaBuilder })));
const TemplateLibrary = React.lazy(() => import('./components/TemplateLibrary').then(m => ({ default: m.TemplateLibrary })));
const LandingPage = React.lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })));
const VoiceAgentPublic = React.lazy(() => import('./components/VoiceAgentPublic').then(m => ({ default: m.VoiceAgentPublic })));
const PublicReportViewer = React.lazy(() => import('./components/PublicReportViewer').then(m => ({ default: m.PublicReportViewer })));
// ... Import other components as needed

/**
 * Protected Route Wrapper
 */
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Main App Routes
 */
function AppRoutes() {
  const { user, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <ThemeProvider user={user}>
      <ToastProvider>
        <ConfirmProvider>
          <NotificationProvider isAuthenticated={isAuthenticated}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                {/* Public Routes */}
                <Route
                  path="/login"
                  element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage onLogin={login} />}
                />
                <Route path="/s/:slug" element={<PublicSurveyView />} />
                <Route path="/s/voice/:slug" element={<PublicVoiceView />} />
                <Route path="/s/report/:slug" element={<PublicReportView />} />

                {/* Protected Routes with AppLayout */}
                <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  {/* Dashboard */}
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardView />} />

                  {/* Surveys & Forms */}
                  <Route path="/surveys" element={<FormViewer />} />
                  <Route path="/surveys/:formId" element={<FormViewer />} />
                  <Route path="/surveys/:formId/edit" element={<FormBuilder />} />
                  <Route path="/surveys/:formId/results" element={<ResultsViewer />} />
                  <Route path="/surveys/:formId/analysis" element={<AnalysisViewer />} />
                  <Route path="/surveys/:formId/collect" element={<SurveyDistribution />} />

                  {/* Templates */}
                  <Route path="/templates" element={<TemplateLibrary />} />

                  {/* Tickets */}
                  <Route path="/tickets" element={<TicketListView />} />
                  <Route path="/tickets/:ticketId" element={<TicketDetailView />} />

                  {/* Contacts & Customer 360 */}
                  <Route path="/contacts" element={<ContactMaster />} />
                  <Route path="/customer360" element={<Customer360 />} />
                  <Route path="/customer360/:contactId" element={<Customer360 />} />

                  {/* Personas */}
                  <Route path="/personas" element={<CxPersonaBuilder />} />
                  <Route path="/personas/:personaId" element={<CxPersonaBuilder />} />

                  {/* ... Add remaining routes ... */}
                </Route>

                {/* Backward Compatibility Redirects */}
                <Route path="/builder" element={<RedirectToSurveys />} />
                <Route path="/builder/:id" element={<RedirectToSurveyEdit />} />
                <Route path="/results" element={<RedirectToSurveys />} />
                <Route path="/viewer" element={<Navigate to="/surveys" replace />} />
                <Route path="/form-viewer" element={<Navigate to="/surveys" replace />} />
                <Route path="/ticket-detail" element={<Navigate to="/tickets" replace />} />
                <Route path="/contact-master" element={<Navigate to="/contacts" replace />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </NotificationProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

/**
 * Component Wrappers that Use URL Params
 */
function DashboardView() {
  const navigate = useNavigate();

  return (
    <Dashboard
      onNavigate={(view, payload) => {
        // Map old navigation calls to new routes
        if (view === 'view-results') navigate(`/surveys/${payload}/results`);
        else if (view === 'take-survey') navigate(`/surveys/${payload}`);
        else navigate(`/${view}`);
      }}
      onEdit={(formId) => navigate(`/surveys/${formId}/edit`)}
      onEditSubmission={(subId, formId) => navigate(`/surveys/${formId}?submissionId=${subId}`)}
    />
  );
}

function PublicSurveyView() {
  const { slug } = useParams();
  return <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff' }}>
    <FormViewer slug={slug} isPublic={true} />
  </div>;
}

function PublicVoiceView() {
  const { slug } = useParams();
  return <VoiceAgentPublic slug={slug} />;
}

function PublicReportView() {
  const { slug } = useParams();
  return <PublicReportViewer token={slug} />;
}

function RedirectToSurveys() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  if (id) return <Navigate to={`/surveys/${id}/edit`} replace />;
  return <Navigate to="/surveys" replace />;
}

function RedirectToSurveyEdit() {
  const { id } = useParams();
  return <Navigate to={`/surveys/${id}/edit`} replace />;
}

function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '6rem', fontWeight: '800', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 0 20px 0' }}>
        404
      </h1>
      <h2 style={{ fontSize: '1.5rem', color: 'var(--text-color)', margin: '0 0 10px 0' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <a href="/dashboard" style={{ padding: '12px 24px', background: 'var(--primary-gradient)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
        Go to Dashboard
      </a>
    </div>
  );
}

/**
 * Root App Component
 */
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
