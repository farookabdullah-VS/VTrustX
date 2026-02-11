import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Notifications } from '../Notifications';
import { AIAgentChat } from '../AIAgentChat';
import { AIFormGeneratorModal } from '../AIFormGeneratorModal';
import { CreateSurveyModal } from '../CreateSurveyModal';
import { TemplateGallery } from '../TemplateGallery';
import { User, Globe, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

export function AppLayout({ onNavigate, viewTitles }) {
  const { user, logout, setUser } = useAuth();
  const { isRtl } = useTheme();
  const { t, i18n } = useTranslation();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [isCreateSurveyModalOpen, setIsCreateSurveyModalOpen] = useState(false);

  // Derive current view from pathname
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentView = pathParts[0] || 'dashboard';

  // Auto-hide/Collapse Sidebar Logic
  useEffect(() => {
    if (currentView === 'personas' || currentView === 'builder' || currentView === 'analytics-studio') {
      setIsSidebarHidden(true);
    } else if (['viewer', 'results', 'analytics-dashboard'].includes(currentView)) {
      setIsSidebarHidden(false);
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarHidden(false);
      setIsSidebarCollapsed(false);
    }
  }, [currentView]);

  const viewTitle = viewTitles[currentView] || '';

  return (
    <div className="App">
      {!isSidebarHidden && (
        <Sidebar
          user={user}
          view={currentView === 'viewer' ? 'form-viewer' : currentView === 'builder' ? 'create-normal' : currentView}
          onViewChange={(id) => onNavigate(id)}
          onLogout={logout}
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onHide={() => setIsSidebarHidden(true)}
        />
      )}

      <div
        className="main-content"
        style={{
          marginLeft: isRtl ? 0 : (isSidebarHidden ? '24px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)')),
          marginRight: isRtl ? (isSidebarHidden ? '24px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)')) : 0,
          transition: isSidebarCollapsed ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          width: `calc(100% - ${isSidebarHidden ? '48px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)')} - 12px)`,
          minHeight: '100vh',
          boxSizing: 'border-box',
          paddingTop: currentView === 'personas' ? '0' : '12px',
        }}
      >
        <header
          className="glass-panel"
          style={{
            padding: '0 24px',
            marginBottom: currentView === 'personas' ? '0' : '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '70px',
            boxSizing: 'border-box',
            borderRadius: '16px',
            background: 'var(--header-bg, #ecfdf5)',
            border: '1px solid var(--header-border, rgba(6, 78, 59, 0.3))',
          }}
        >
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {isSidebarHidden && (
              <button
                onClick={() => setIsSidebarHidden(false)}
                style={{
                  background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--sidebar-text, #064e3b)',
                }}
                title="Show Sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--sidebar-text, #064e3b)' }}>
              {viewTitle}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Notifications />
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px',
                  borderLeft: '1px solid #e2e8f0', cursor: 'pointer', userSelect: 'none',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-color, #0f172a)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                }}>
                  {user?.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '0.9em', color: '#334155' }}>
                    {user?.user?.username || 'User'}
                    <span style={{ fontSize: '0.7em', marginLeft: '5px', color: '#94a3b8' }}>&#9660;</span>
                  </span>
                  <span style={{ fontSize: '0.75em', color: '#94a3b8' }}>
                    {t(`users.role_${user?.user?.role}`) || user?.user?.role || t('users.role_user')}
                  </span>
                </div>
              </div>

              {isProfileMenuOpen && (
                <div style={{
                  position: 'absolute', top: '50px', [isRtl ? 'left' : 'right']: '0', width: '260px',
                  background: '#f0fdf4', border: '1px solid #4ade80', borderRadius: '16px',
                  padding: '12px', boxShadow: '0 10px 30px -5px rgba(21, 128, 61, 0.15)', zIndex: 1000,
                }}>
                  <div
                    onClick={() => { onNavigate('profile'); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid white', transition: 'border-color 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#4ade80'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'white'}
                  >
                    <User size={18} color="#064e3b" />
                    <span style={{ fontSize: '0.9em', fontWeight: '600', color: '#064e3b', letterSpacing: '0.5px' }}>{t('header.manage_profile')}</span>
                  </div>

                  <div
                    onClick={() => { i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en'); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid white', transition: 'border-color 0.2s',
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

                  <div
                    onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                    style={{
                      background: 'white', padding: '12px 16px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid white', transition: 'border-color 0.2s',
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

        <main style={{ padding: currentView === 'cx-ratings' ? 0 : '20px' }}>
          <Outlet context={{
            onNavigate,
            isAIModalOpen, setIsAIModalOpen,
            isTemplateGalleryOpen, setIsTemplateGalleryOpen,
            isCreateSurveyModalOpen, setIsCreateSurveyModalOpen,
            isSidebarCollapsed, setIsSidebarCollapsed,
          }} />
        </main>
      </div>

      <AIFormGeneratorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={async (promptText) => {
          setIsAIModalOpen(false);
          const loadingDiv = document.createElement('div');
          loadingDiv.innerText = "Generating Survey... Please wait.";
          loadingDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 40px;background:white;color:#334155;border-radius:12px;z-index:9999;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);border:1px solid #e2e8f0;font-weight:500';
          document.body.appendChild(loadingDiv);
          try {
            const res = await axios.post('/api/ai/generate', { prompt: promptText });
            onNavigate('builder', { initialData: res.data.definition });
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
          setIsTemplateGalleryOpen(false);
          onNavigate('builder', { initialData: { ...template.definition, title: template.title } });
        }}
      />
      <CreateSurveyModal
        isOpen={isCreateSurveyModalOpen}
        onClose={() => setIsCreateSurveyModalOpen(false)}
        onCreate={(data) => {
          setIsCreateSurveyModalOpen(false);
          onNavigate('builder', { initialData: { title: data.title, description: data.description, pages: [{ name: "page1", elements: [] }] } });
        }}
      />
      <AIAgentChat user={user} />
    </div>
  );
}
