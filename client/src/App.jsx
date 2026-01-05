import React, { useState } from 'react';
import { ResultsViewer } from './components/ResultsViewer';
import { SurveyDistribution } from './components/SurveyDistribution';
import { FormBuilder } from './components/FormBuilder';
import { FormViewer } from './components/FormViewer';
import { Dashboard } from './components/Dashboard';
import { CxDashboard } from './components/CxDashboard';
import { AIIntegrations } from './components/AIIntegrations';
import { IntegrationsView } from './components/IntegrationsView';
import { UserManagement } from './components/UserManagement';
import { UserProfile } from './components/UserProfile';
import { RoleMaster } from './components/RoleMaster';
import { ContactMaster } from './components/ContactMaster';
import { TicketListView } from './components/TicketListView';
import { TicketDetailView } from './components/TicketDetailView';
import { CrmDashboard } from './components/CrmDashboard';
import { Login } from './components/Login';
import { LandingPage } from './components/LandingPage';
import { AIFormGeneratorModal } from './components/AIFormGeneratorModal';
import { CreateSurveyModal } from './components/CreateSurveyModal';
import { SubscriptionManagement } from './components/SubscriptionManagement';
import { GlobalAdminDashboard } from './components/GlobalAdminDashboard';
import { TemplateGallery } from './components/TemplateGallery';
import { Sidebar } from './components/Sidebar';
import { SupportPage } from './components/SupportPage';
import { ThemeSettings } from './components/ThemeSettings';
import { SystemSettings } from './components/SystemSettings';
import { Notifications } from './components/Notifications';
import { RulesEngine } from './components/RulesEngine';
import { CxPersonaBuilder } from './components/CxPersonaBuilder';
import { JourneyBuilder } from './components/JourneyBuilder';
import { User, Globe, LogOut } from 'lucide-react';
import { Customer360 } from './components/Customer360';
import { TicketSettings } from './components/TicketSettings';
import { SurveyReportSelector } from './components/SurveyReportSelector';
import { AISurveyor } from './components/AISurveyor';
import { VoiceAgentPublic } from './components/VoiceAgentPublic';
import { AIVideoAgentPage } from './components/AIVideoAgentPage';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import './App.css';

function App() {
  const { t, i18n } = useTranslation();
  // Support ar, ar-EG, ar-SA etc
  const isRtl = i18n.language.startsWith('ar');

  // Auth State - Persist
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vtrustx_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Configure Axios Auth Header whenever user changes
  React.useEffect(() => {
    if (user && user.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
      localStorage.setItem('vtrustx_user', JSON.stringify(user));
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('vtrustx_user');
    }
  }, [user]);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  // Update Body Direction
  React.useEffect(() => {
    document.body.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  // Load and Apply Tenant Theme
  React.useEffect(() => {
    if (user && user.token) {
      axios.get('/api/settings/theme')
        .then(res => {
          const theme = res.data;
          if (theme && Object.keys(theme).length > 0) {
            const root = document.documentElement;
            if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor);
            if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
            if (theme.backgroundColor) root.style.setProperty('--background-color', theme.backgroundColor);
            if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
            if (theme.borderRadius) root.style.setProperty('--border-radius', theme.borderRadius);
            if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
          }
        })
        .catch(console.error);
    }
  }, [user]);

  // Views: dashboard, builder, viewer, system-settings, integrations, public-survey
  const [view, setView] = useState(() => {
    if (window.location.pathname.startsWith('/s/voice/')) return 'public-voice'; // Priority Check
    if (window.location.pathname.startsWith('/s/')) return 'public-survey';
    return 'dashboard';
  });
  const [currentFormId, setCurrentFormId] = useState(null);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [isCreateSurveyModalOpen, setIsCreateSurveyModalOpen] = useState(false);

  // Sidebar State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Public Survey State - Init from URL
  const [publicSlug, setPublicSlug] = useState(() => {
    const path = window.location.pathname;
    // Check voice first
    if (path.startsWith('/s/voice/')) return path.split('/s/voice/')[1];
    if (path.startsWith('/s/')) return path.split('/s/')[1];
    return null;
  });

  const isSupportPage = window.location.pathname === '/support';

  if (isSupportPage) {
    return <SupportPage />;
  }

  if (!user && !publicSlug) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const handleNavigate = async (action, payload) => {
    // Reset state
    setCurrentSubmissionId(null);
    setCurrentFormId(null);

    if (action === 'create-normal') {
      setIsCreateSurveyModalOpen(true);
    }
    else if (action === 'create-template') {
      setIsTemplateGalleryOpen(true);
    }
    else if (action === 'create-ai') {
      setIsAIModalOpen(true);
    }
    else if (action === 'create-imported') {
      // payload should contain { title, definition }
      setInitialData(payload || { title: "Imported Survey", pages: [] });
      setView('builder');
    }
    else if (action === 'take-survey') {
      setCurrentFormId(payload);
      setCurrentSubmissionId(null);
      setView('viewer');
    }
    else if (action === 'view-results') {
      if (typeof payload === 'object' && payload !== null) {
        setCurrentFormId(payload.id);
        setInitialData({ view: payload.view });
      } else {
        setCurrentFormId(payload);
        setInitialData(null);
      }
      setView('results');
    }
    else if (action === 'ai-settings') setView('ai-settings');
    else if (action === 'system-settings') setView('system-settings');
    else if (action === 'integrations') setView('integrations');
    else if (action === 'user-management') setView('user-management');
    else if (action === 'theme-settings') setView('theme-settings');
    else if (action === 'profile') setView('profile');
  };

  const handleSidebarNav = (id) => {
    if (id === 'dashboard') setView('dashboard');
    else if (id === 'create-normal') handleNavigate('create-normal');
    else if (id === 'form-viewer') {
      setCurrentFormId(null);
      setCurrentSubmissionId(null);
      setView('viewer');
    }
    else if (id === 'ai-settings') handleNavigate('ai-settings');
    else if (id === 'survey-reports') setView('survey-reports');
    else if (id === 'ai-surveyor') setView('ai-surveyor');
    else if (id === 'ai-video-agent') setView('ai-video-agent');
    else if (id === 'cx-ratings') setView('cx-ratings');
    else if (id === 'system-settings') setView('system-settings');
    else if (id === 'integrations') setView('integrations');
    else if (id === 'user-management') setView('user-management');
    else if (id === 'role-master') setView('role-master');
    else if (id === 'subscription') setView('subscription');
    else if (id === 'global-admin') setView('global-admin');
    else if (id === 'tickets') setView('tickets');
    else if (id === 'workflows') setView('workflows');
    else if (id === 'personas') setView('personas');
    else if (id === 'contact-master') setView('contact-master');
    else if (id === 'templates') setView('templates');
    else if (id === 'theme-settings') setView('theme-settings');
    else if (id === 'customer360') setView('customer360');
    else if (id === 'journeys') setView('journeys');
    else if (id === 'ticket-settings') setView('ticket-settings');
    else if (id === 'identity') setView('identity'); // Placeholder if view exists
    else if (id === 'support') setView('support'); // Or navigate to support page
  };

  const handleEditForm = (id, tab = 'questionnaire') => {
    setCurrentFormId(id);
    setCurrentSubmissionId(null);
    setInitialData({ initialTab: tab });
    setView('builder');
  }

  const handleEditSubmission = (subId, formId) => {
    setCurrentFormId(formId);
    setCurrentSubmissionId(subId);
    setView('viewer');
  }

  if (view === 'public-survey' && publicSlug) {
    return (
      <div style={{ width: '100%', minHeight: '100vh', background: '#ffffff' }}>
        <FormViewer
          slug={publicSlug}
          isPublic={true}
        />
      </div>
    )
  }

  if (view === 'public-voice' && publicSlug) {
    return <VoiceAgentPublic slug={publicSlug} />
  }

  return (
    <div className="App">
      <Sidebar
        user={user}
        view={view === 'viewer' ? 'form-viewer' : view === 'builder' ? 'create-normal' : view}
        onViewChange={handleSidebarNav}
        onLogout={() => setUser(null)}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div
        className="main-content"
        style={{
          marginLeft: isRtl ? 0 : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)'), // Sidebar + 12px gap + 12px gap
          marginRight: isRtl ? (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)') : 0,
          transition: isSidebarCollapsed ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none', // Disable transition during drag resize to avoid lag
          width: `calc(100% - ${isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)'} - 12px)`, // Right gap 12px
          minHeight: '100vh',
          boxSizing: 'border-box',
          paddingTop: '12px'
        }}
      >
        <header
          className="glass-panel"
          style={{
            padding: '0 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px',
            boxSizing: 'border-box',
            borderRadius: '16px',
            background: '#ecfdf5', // Pale Green to match sidebar
            border: '1px solid rgba(6, 78, 59, 0.3)' // Full Outline
          }}
        >
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#064e3b' }}>
              {view === 'dashboard' ? 'Overview' :
                view === 'builder' ? 'Form Builder' :
                  view === 'viewer' ? (currentSubmissionId ? 'Edit Submission' : 'Surveys') :
                    view === 'results' ? 'Results' :
                      view === 'ai-settings' ? 'AI Settings' :
                        view === 'system-settings' ? 'System Settings' :
                          view === 'theme-settings' ? 'Theme & Branding' :
                            view === 'integrations' ? 'Integrations' :
                              view === 'user-management' ? 'User Management' :
                                view === 'workflows' ? 'Workflows' :
                                  view === 'tickets' || view === 'ticket-detail' ? 'Tickets' :
                                    view === 'cx-ratings' ? 'CX Dashboard' :
                                      view === 'personas' ? 'CX Personas' :
                                        view === 'templates' ? 'Templates' :
                                          view === 'contact-master' ? 'Contacts' :
                                            view === 'role-master' ? 'Roles' :
                                              view === 'subscription' ? 'Subscription' :
                                                view === 'customer360' ? 'Unified Customer Profile' :
                                                  view === 'journeys' ? 'Journey Orchestration' :
                                                    view === 'global-admin' ? 'Global Administration' :
                                                      view === 'profile' ? 'My Profile' :
                                                        ''}
            </h3>
          </div>

          {/* User Profile & Notifications - Top Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Notifications />

            {/* Profile Dropdown */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px',
                  borderLeft: '1px solid #e2e8f0', cursor: 'pointer', userSelect: 'none'
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-color, #0f172a)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                  {user?.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9em', color: '#334155' }}>
                    {user?.user?.username || 'User'}
                    <span style={{ fontSize: '0.7em', marginLeft: '5px', color: '#94a3b8' }}>▼</span>
                  </span>
                  <span style={{ fontSize: '0.75em', color: '#94a3b8' }}>
                    {t(`users.role_${user?.user?.role}`) || user?.user?.role || t('users.role_user')}
                  </span>
                </div>
              </div>

              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute', top: '50px', [isRtl ? 'left' : 'right']: '0', width: '260px',
                  background: '#f0fdf4', // Light green bg
                  border: '1px solid #4ade80',
                  borderRadius: '16px',
                  padding: '12px',
                  boxShadow: '0 10px 30px -5px rgba(21, 128, 61, 0.15)',
                  zIndex: 1000,
                }}>
                  {/* MANAGE PROFILE */}
                  <div
                    onClick={() => { setView('profile'); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px',
                      marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      border: '1px solid white', transition: 'border-color 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#4ade80'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'white'}
                  >
                    <User size={18} color="#064e3b" />
                    <span style={{ fontSize: '0.9em', fontWeight: '600', color: '#064e3b', letterSpacing: '0.5px' }}>{t('header.manage_profile')}</span>
                  </div>

                  {/* LANGUAGE */}
                  <div
                    onClick={() => { i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en'); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px',
                      marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      border: '1px solid white', transition: 'border-color 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#4ade80'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'white'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Globe size={18} color="#064e3b" />
                      <span style={{ fontSize: '0.9em', fontWeight: '600', color: '#064e3b', letterSpacing: '0.5px' }}>{t('header.language')}</span>
                    </div>
                    <span style={{ fontSize: '0.7em', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534', border: '1px solid #86efac', fontWeight: '600', textTransform: 'uppercase' }}>
                      {i18n.language === 'en' ? 'English' : 'Arabic'}
                    </span>
                  </div>

                  {/* LOGOUT */}
                  <div
                    onClick={() => { setUser(null); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                      border: '1px solid white', transition: 'border-color 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'white'}
                  >
                    <LogOut size={18} color="#b91c1c" />
                    <span style={{ fontSize: '0.9em', fontWeight: '600', color: '#b91c1c', letterSpacing: '0.5px' }}>{t('header.logout')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main style={{ padding: view === 'cx-ratings' ? 0 : '20px' }}>
          {view === 'dashboard' && (
            <Dashboard onNavigate={handleNavigate} onEdit={handleEditForm} onEditSubmission={handleEditSubmission} />
          )}
          {view === 'cx-ratings' && <CxDashboard onNavigate={handleNavigate} />}
          {view === 'survey-reports' && <SurveyReportSelector onSelect={(id) => { setCurrentFormId(id); setView('results'); }} />}
          {view === 'builder' && <FormBuilder user={user} formId={currentFormId} initialData={initialData} onBack={() => { setCurrentFormId(null); setView('viewer'); }} onNavigate={(target) => { if (target === 'results') setView('results'); }} onFormChange={handleEditForm} />}
          {view === 'results' && (
            <ResultsViewer
              formId={currentFormId}
              initialView={initialData?.view}
              onBack={() => setView('dashboard')}
              onEditSubmission={handleEditSubmission}
              onNavigate={(target) => {
                if (target === 'builder') handleEditForm(currentFormId);
                else setView(target);
              }}
            />
          )}
          {view === 'collect' && (
            <SurveyDistribution
              formId={currentFormId}
              onBack={() => setView('dashboard')}
              onNavigate={(target) => {
                if (target === 'builder') handleEditForm(currentFormId);
                else setView(target);
              }}
            />
          )}
          {view === 'viewer' && (
            <FormViewer
              formId={currentFormId}
              submissionId={currentSubmissionId}
              onSelectForm={(id) => setCurrentFormId(id)}
              onEditSubmission={handleEditSubmission}
              onEditForm={handleEditForm}
              onCreate={(type) => handleNavigate(type)}
            />
          )}
          {view === 'ai-settings' && <AIIntegrations />}
          {view === 'system-settings' && <SystemSettings />}
          {view === 'ticket-settings' && <TicketSettings />}
          {view === 'theme-settings' && <ThemeSettings />}
          {view === 'ai-surveyor' && <AISurveyor />}
          {view === 'ai-video-agent' && <AIVideoAgentPage />}
          {view === 'profile' && <UserProfile user={user} onUpdateUser={(updatedUser) => setUser(prev => ({ ...prev, user: updatedUser }))} />}
          {view === 'integrations' && <IntegrationsView />}
          {view === 'workflows' && <RulesEngine />}
          {view === 'user-management' && <UserManagement />}
          {view === 'role-master' && <RoleMaster />}
          {view === 'subscription' && <SubscriptionManagement />}
          {view === 'global-admin' && <GlobalAdminDashboard />}
          {view === 'contact-master' && <ContactMaster />}
          {view === 'customer360' && <Customer360 />}
          {view === 'personas' && <CxPersonaBuilder />}
          {view === 'journeys' && <JourneyBuilder />}
          {view === 'templates' && (
            <div style={{ height: 'calc(100vh - 100px)' }}>
              <TemplateGallery
                displayMode="page"
                onSelect={(template) => {
                  setInitialData({ ...template.definition, title: template.title });
                  setCurrentFormId(null);
                  setView('builder');
                }}
              />
            </div>
          )}

          {view === 'tickets' && (
            <TicketListView
              onSelectTicket={(id) => {
                if (id === 'reports') setView('crm-reports');
                else { setCurrentTicketId(id); setView('ticket-detail'); }
              }}
              onCreateTicket={() => {
                const subject = prompt("Ticket Subject:");
                if (subject) {
                  // Quick create for MVP
                  axios.post('/api/crm/tickets', { subject, description: "Created via Quick Add" })
                    .then(() => alert("Ticket Created! Refesh to see."))
                    .catch(e => alert(e.message));
                }
              }}
            />
          )}

          {view === 'crm-reports' && <CrmDashboard />}

          {view === 'ticket-detail' && (
            <TicketDetailView
              ticketId={currentTicketId}
              onBack={() => { setView('tickets'); setCurrentTicketId(null); }}
            />
          )}
        </main>
      </div>
      <AIFormGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={async (promptText) => {
          setIsAIModalOpen(false);
          const loadingDiv = document.createElement('div');
          loadingDiv.innerText = "✨ Generating Survey... Please wait.";
          loadingDiv.style.position = 'fixed';
          loadingDiv.style.top = '50%';
          loadingDiv.style.left = '50%';
          loadingDiv.style.transform = 'translate(-50%, -50%)';
          loadingDiv.style.padding = '20px 40px';
          loadingDiv.style.background = 'white';
          loadingDiv.style.color = '#334155';
          loadingDiv.style.borderRadius = '12px';
          loadingDiv.style.zIndex = '9999';
          loadingDiv.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)';
          loadingDiv.style.border = '1px solid #e2e8f0';
          loadingDiv.style.fontWeight = '500';
          document.body.appendChild(loadingDiv);

          try {
            const res = await axios.post('/api/ai/generate', { prompt: promptText });
            setInitialData(res.data.definition);
            setView('builder');
          } catch (err) {
            alert("AI generation failed: " + (err.response?.data?.error || err.message));
          } finally {
            if (document.body.contains(loadingDiv)) document.body.removeChild(loadingDiv);
          }
        }}
      />
      <TemplateGallery
        isOpen={isTemplateGalleryOpen}
        onClose={() => setIsTemplateGalleryOpen(false)}
        onSelect={(template) => {
          setInitialData({ ...template.definition, title: template.title });
          setIsTemplateGalleryOpen(false);
          setView('builder');
        }}
      />

      {/* Dynamic Create Survey Modal */}
      <CreateSurveyModal
        isOpen={isCreateSurveyModalOpen}
        onClose={() => setIsCreateSurveyModalOpen(false)}
        onCreate={(data) => {
          setInitialData({
            title: data.title,
            description: data.description, // Pass description if builder supports it in metadata
            pages: [{ name: "page1", elements: [] }]
          });
          setIsCreateSurveyModalOpen(false);
          setView('builder');
        }}
      />
    </div>
  );
}

export default App;
