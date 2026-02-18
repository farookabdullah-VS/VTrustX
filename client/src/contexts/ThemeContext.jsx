import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { applyTheme, registerTheme, getAvailableThemes } from '../themes';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, user }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');

  // Current theme ID
  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('rayix_theme_id');
    return (saved && saved !== 'dark') ? saved : 'default';
  });

  // Dark mode: check localStorage first, then system preference
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('rayix_theme_mode');
    if (saved) return saved === 'dark';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  // Custom theme object (for tenant-specific themes)
  const [customTheme, setCustomTheme] = useState(null);

  // Apply direction
  useEffect(() => {
    document.body.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  // Apply theme when changed
  useEffect(() => {
    const themeId = isDark ? 'dark' : currentTheme;
    applyTheme(themeId, customTheme);
  }, [currentTheme, isDark, customTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e) => {
      const saved = localStorage.getItem('rayix_theme_mode');
      if (!saved) setIsDark(e.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch tenant-specific theme from backend
  useEffect(() => {
    if (!user?.user?.tenant_id) return;

    axios.get(`/api/settings/theme`)
      .then(res => {
        const theme = res.data;
        if (theme && (theme.primaryColor || theme.backgroundColor)) {
          // Transform flat tenant theme to structured theme
          const themeId = `tenant_${user.user.tenant_id}`;
          // Helper to adjust color opacity
          const alpha = (hex, opacity) => {
            if (!hex) return 'transparent';
            if (hex.startsWith('rgba')) return hex;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          };

          const structuredTheme = {
            id: themeId,
            name: theme.name || 'Custom Brand',
            colors: {
              // Core Colors
              primary: theme.primaryColor,
              primaryHover: theme.primaryColor,
              primaryLight: alpha(theme.primaryColor, 0.1),
              secondary: theme.secondaryColor || theme.primaryColor,
              accent: theme.primaryColor,

              // Backgrounds
              deepBg: theme.backgroundColor || '#eff3f8',
              surfaceBg: '#ffffff',
              cardBg: '#ffffff',

              // Glass Effect
              glassBg: 'rgba(255, 255, 255, 0.85)',
              glassBorder: 'rgba(255, 255, 255, 0.6)',

              // Sidebar
              sidebarBg: `linear-gradient(180deg, ${alpha(theme.primaryColor, 0.08)} 0%, ${alpha(theme.backgroundColor || '#ffffff', 0.95)} 100%)`,
              sidebarText: theme.textColor || '#1a1c1e',
              sidebarActiveBg: alpha(theme.primaryColor, 0.1),
              sidebarActiveText: theme.primaryColor,
              sidebarHoverBg: alpha(theme.primaryColor, 0.04),
              sidebarBorder: alpha(theme.primaryColor, 0.08),

              // Header
              headerBg: alpha(theme.backgroundColor || '#ffffff', 0.95),
              headerBorder: alpha(theme.primaryColor, 0.15),

              // Text
              textPrimary: theme.textColor || '#1a1c1e',
              textSecondary: alpha(theme.textColor || '#1a1c1e', 0.7),
              textMuted: alpha(theme.textColor || '#1a1c1e', 0.5),

              // Components
              buttonPrimaryBg: theme.primaryColor,
              buttonPrimaryText: '#ffffff',
              inputBg: alpha(theme.primaryColor, 0.02),
              inputBorder: alpha(theme.primaryColor, 0.1),

              // Profile/Header elements
              avatarBg: theme.primaryColor,
              usernameColor: theme.textColor || '#1a1c1e',
              dividerColor: alpha(theme.primaryColor, 0.08),
              profileMenuBg: '#ffffff',
              profileMenuBorder: alpha(theme.primaryColor, 0.1)
            },
            borderRadius: {
              sm: '4px',
              md: theme.borderRadius || '8px',
              lg: theme.borderRadius || '12px',
              xl: '16px',
              full: '9999px'
            },
            typography: {
              fontFamily: theme.fontFamily || "'Outfit', sans-serif"
            }
          };

          registerTheme(themeId, structuredTheme);
          setCustomTheme(structuredTheme);
          setCurrentTheme(themeId);
        } else if (theme && theme.preset) {
          // Use preset theme
          setCurrentTheme(theme.preset);
        }
      })
      .catch(err => {
        console.log('[ThemeContext] No custom theme found or error fetching', err);
      });
  }, [user]);

  // Switch theme
  const switchTheme = useCallback((themeId) => {
    setCurrentTheme(themeId);
    localStorage.setItem('rayix_theme_id', themeId);
    console.log(`[ThemeContext] Switched to theme: ${themeId}`);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setIsDark(prev => {
      const newValue = !prev;
      localStorage.setItem('rayix_theme_mode', newValue ? 'dark' : 'light');
      return newValue;
    });
  }, []);

  // Update custom theme
  const updateCustomTheme = useCallback((themeConfig) => {
    setCustomTheme(themeConfig);
    applyTheme(currentTheme, themeConfig);
    console.log('[ThemeContext] Custom theme updated');
  }, [currentTheme]);

  // Manual theme application - force re-apply current theme
  const manualApplyTheme = useCallback(() => {
    const themeId = isDark ? 'dark' : currentTheme;
    applyTheme(themeId, customTheme);
    console.log(`[ThemeContext] Manually applied theme: ${themeId}`);
  }, [currentTheme, isDark, customTheme]);

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      isDark,
      isRtl,
      customTheme,
      switchTheme,
      toggleDarkMode,
      updateCustomTheme,
      manualApplyTheme,
      availableThemes: getAvailableThemes()
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    console.warn('useTheme called outside ThemeProvider, returning defaults');
    return {
      currentTheme: 'default',
      isDark: false,
      isRtl: false,
      customTheme: null,
      switchTheme: () => { },
      toggleDarkMode: () => { },
      updateCustomTheme: () => { },
      manualApplyTheme: () => { },
      availableThemes: []
    };
  }
  return ctx;
};
