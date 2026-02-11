import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Sidebar';
import { Notifications } from '../Notifications';
import { AIAgentChat } from '../AIAgentChat';
import { AIFormGeneratorModal } from '../AIFormGeneratorModal';
import { CreateSurveyModal } from '../CreateSurveyModal';
import { TemplateGallery } from '../TemplateGallery';
import { User, Globe, LogOut, Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { MobileBottomNav } from '../common/MobileBottomNav';
import { CommandPalette } from '../common/CommandPalette';
import { PageTransition } from '../common/AnimatedLayout';
import { useToast } from '../common/Toast';
import { HamburgerMenu, SidebarOverlay } from '../common/HamburgerMenu';
import axios from 'axios';

export function AppLayout({ onNavigate, viewTitles }) {
  const { user, logout, setUser } = useAuth();
  const { isRtl, isDark, toggleDarkMode } = useTheme();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [isCreateSurveyModalOpen, setIsCreateSurveyModalOpen] = useState(false);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Command palette (Ctrl+K / Cmd+K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  // Sidebar visibility logic
  const showSidebar = isMobile ? isMobileSidebarOpen : !isSidebarHidden;

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  return (
    <div className="App">
      {/* Skip to main content link for keyboard navigation */}
      <a href="#main-content" className="skip-link">
        {t('accessibility.skip_to_content') || 'Skip to main content'}
      </a>

      {/* Mobile sidebar overlay */}
      <SidebarOverlay
        isActive={isMobile && isMobileSidebarOpen}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Sidebar */}
      {(showSidebar || isMobile) && (
        <div className={`sidebar ${isMobile && isMobileSidebarOpen ? 'mobile-open' : ''}`}>
          <Sidebar
            user={user}
            view={currentView === 'viewer' ? 'form-viewer' : currentView === 'builder' ? 'create-normal' : currentView}
            onViewChange={(id) => {
              if (onNavigate) onNavigate(id);
              if (isMobile) setIsMobileSidebarOpen(false);
            }}
            onLogout={logout}
            isCollapsed={!isMobile && isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onHide={() => setIsSidebarHidden(true)}
          />
        </div>
      )}

      <div
        id="main-content"
        className="main-content"
        role="main"
        style={{
          marginLeft: isMobile ? 0 : (isRtl ? 0 : (isSidebarHidden ? '24px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)'))),
          marginRight: isMobile ? 0 : (isRtl ? (isSidebarHidden ? '24px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)')) : 0),
          transition: isSidebarCollapsed ? 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          width: isMobile ? '100%' : `calc(100% - ${isSidebarHidden ? '48px' : (isSidebarCollapsed ? '104px' : 'calc(var(--sidebar-width, 260px) + 24px)')} - 12px)`,
          minHeight: '100vh',
          boxSizing: 'border-box',
          paddingTop: currentView === 'personas' ? '0' : '12px',
          paddingBottom: isMobile ? '80px' : 0,
        }}
      >
        <header
          role="banner"
          className="glass-panel"
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            marginBottom: currentView === 'personas' ? '0' : (isMobile ? '12px' : '24px'),
            marginLeft: isMobile ? '8px' : 0,
            marginRight: isMobile ? '8px' : 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: isMobile ? '56px' : '70px',
            boxSizing: 'border-box',
            borderRadius: isMobile ? '12px' : '16px',
            background: 'var(--header-bg, #ecfdf5)',
            border: '1px solid var(--header-border, rgba(6, 78, 59, 0.3))',
          }}
        >
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Hamburger menu for mobile */}
            {isMobile && (
              <HamburgerMenu
                isOpen={isMobileSidebarOpen}
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              />
            )}

            {/* Show sidebar button (desktop only) */}
            {!isMobile && isSidebarHidden && (
              <button
                onClick={() => setIsSidebarHidden(false)}
                style={{
                  background: 'var(--card-bg)', border: '1px solid var(--input-border, #cbd5e1)', borderRadius: '8px', padding: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  color: 'var(--sidebar-text, #064e3b)', backgroundImage: 'none', boxShadow: 'none', textTransform: 'none',
                }}
                title="Show Sidebar"
                aria-label="Show Sidebar"
              >
                <Menu size={20} />
              </button>
            )}
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: 'var(--sidebar-text, #064e3b)' }}>
              {viewTitle}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Light mode' : 'Dark mode'}
              style={{
                background: isDark ? 'rgba(200, 160, 82, 0.12)' : 'var(--input-bg)',
                border: `1px solid ${isDark ? 'rgba(200, 160, 82, 0.25)' : 'var(--input-border)'}`,
                borderRadius: '12px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: isDark ? '#C8A052' : 'var(--sidebar-text, #064e3b)',
                transition: 'all 0.2s ease',
                backgroundImage: 'none',
                boxShadow: 'none',
                textTransform: 'none',
              }}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Notifications />
            <div style={{ position: 'relative' }}>
              <div
                role="button"
                tabIndex={0}
                aria-label="User profile menu"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="true"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsProfileMenuOpen(!isProfileMenuOpen); } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '20px',
                  borderLeft: '1px solid var(--divider-color, #e2e8f0)', cursor: 'pointer', userSelect: 'none',
                }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', background: 'var(--avatar-bg, var(--primary-color, #0f172a))', color: isDark ? '#0A0E1A' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold',
                }}>
                  {user?.user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', fontSize: '0.9em', color: 'var(--username-color, #334155)' }}>
                      {user?.user?.username || 'User'}
                      <span style={{ fontSize: '0.7em', marginLeft: '5px', color: 'var(--username-muted, #94a3b8)' }}>&#9660;</span>
                    </span>
                    <span style={{ fontSize: '0.75em', color: 'var(--username-muted, #94a3b8)' }}>
                      {t(`users.role_${user?.user?.role}`) || user?.user?.role || t('users.role_user')}
                    </span>
                  </div>
                )}
              </div>

              {isProfileMenuOpen && (
                <div role="menu" aria-label="Profile options" style={{
                  position: 'absolute', top: '50px', [isRtl ? 'left' : 'right']: '0', width: '260px',
                  background: 'var(--profile-menu-bg, #f0fdf4)', border: `1px solid var(--profile-menu-border, #4ade80)`, borderRadius: '16px',
                  padding: '12px', boxShadow: 'var(--profile-menu-shadow, 0 10px 30px -5px rgba(21, 128, 61, 0.15))', zIndex: 1000,
                }}>
                  <div
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { onNavigate('profile'); setIsProfileMenuOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('profile'); setIsProfileMenuOpen(false); } }}
                    style={{
                      background: 'var(--profile-menu-item-bg)', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid transparent', transition: 'border-color 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--profile-menu-hover)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <User size={18} style={{ color: 'var(--manage-profile-color)' }} />
                    <span style={{ fontSize: '0.9em', fontWeight: '600', color: 'var(--manage-profile-color)', letterSpacing: '0.5px' }}>{t('header.manage_profile')}</span>
                  </div>

                  <div
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en'); setIsProfileMenuOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en'); setIsProfileMenuOpen(false); } }}
                    style={{
                      background: 'var(--profile-menu-item-bg)', padding: '12px 16px', borderRadius: '10px', marginBottom: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid transparent', transition: 'border-color 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--profile-menu-hover)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Globe size={18} style={{ color: 'var(--manage-profile-color)' }} />
                      <span style={{ fontSize: '0.9em', fontWeight: '600', color: 'var(--manage-profile-color)', letterSpacing: '0.5px' }}>{t('header.language')}</span>
                    </div>
                    <span style={{ fontSize: '0.7em', padding: '2px 8px', borderRadius: '4px', background: 'var(--profile-badge-bg)', color: 'var(--profile-badge-text)', border: '1px solid var(--profile-badge-border)', fontWeight: '600', textTransform: 'uppercase' }}>
                      {i18n.language === 'en' ? 'English' : 'Arabic'}
                    </span>
                  </div>

                  <div
                    role="menuitem"
                    tabIndex={0}
                    onClick={() => { logout(); setIsProfileMenuOpen(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logout(); setIsProfileMenuOpen(false); } }}
                    style={{
                      background: 'var(--profile-menu-item-bg)', padding: '12px 16px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.03)', border: '1px solid transparent', transition: 'border-color 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = 'var(--logout-color)'}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    <LogOut size={18} style={{ color: 'var(--logout-color)' }} />
                    <span style={{ fontSize: '0.9em', fontWeight: '600', color: 'var(--logout-color)', letterSpacing: '0.5px' }}>{t('header.logout')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main role="main" aria-label="Main content" style={{ padding: currentView === 'cx-ratings' ? 0 : '20px' }}>
          <PageTransition viewKey={currentView}>
            <Outlet context={{
              onNavigate,
              isAIModalOpen, setIsAIModalOpen,
              isTemplateGalleryOpen, setIsTemplateGalleryOpen,
              isCreateSurveyModalOpen, setIsCreateSurveyModalOpen,
              isSidebarCollapsed, setIsSidebarCollapsed,
            }} />
          </PageTransition>
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
            toast.error("AI generation failed: " + (err.response?.data?.error || err.message));
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
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(id) => { onNavigate(id); setIsCommandPaletteOpen(false); }}
      />
      {isMobile && (
        <MobileBottomNav
          currentView={currentView}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}
