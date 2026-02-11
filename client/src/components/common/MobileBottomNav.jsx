import React from 'react';
import { LayoutDashboard, ClipboardList, BarChart3, Contact, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, labelKey: 'sidebar.item.dashboard' },
  { id: 'form-viewer', icon: ClipboardList, labelKey: 'sidebar.item.surveys' },
  { id: 'cx-ratings', icon: BarChart3, labelKey: 'sidebar.group.analytics' },
  { id: 'customer360', icon: Contact, labelKey: 'sidebar.group.c360' },
  { id: 'system-settings', icon: Settings, labelKey: 'sidebar.item.settings' },
];

export function MobileBottomNav({ currentView, onNavigate }) {
  const { t } = useTranslation();

  return (
    <nav
      className="mobile-bottom-nav"
      role="navigation"
      aria-label="Mobile navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        background: 'var(--card-bg)',
        borderTop: '1px solid var(--glass-border)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        height: '64px',
      }}
    >
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? 'page' : undefined}
            aria-label={t(item.labelKey)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              border: 'none',
              background: 'transparent',
              backgroundImage: 'none',
              boxShadow: 'none',
              textTransform: 'none',
              padding: '8px 4px',
              cursor: 'pointer',
              color: isActive ? 'var(--primary-color)' : 'var(--text-muted)',
              transition: 'color 0.2s',
              position: 'relative',
              borderRadius: 0,
              letterSpacing: 0,
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '24px',
                height: '3px',
                borderRadius: '0 0 3px 3px',
                background: 'var(--primary-color)',
              }} />
            )}
            <Icon size={20} />
            <span style={{
              fontSize: '0.65rem',
              fontWeight: isActive ? '700' : '500',
              lineHeight: 1,
              maxWidth: '64px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {t(item.labelKey)}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
