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
    return localStorage.getItem('rayix_theme_id') || 'default';
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
    if (!user?.tenant_id) return;

    axios.get(`/api/tenants/${user.tenant_id}/theme`)
      .then(res => {
        const theme = res.data;
        if (theme && theme.customTheme) {
          // Register custom theme
          const themeId = `tenant_${user.tenant_id}`;
          registerTheme(themeId, theme.customTheme);
          setCustomTheme(theme.customTheme);
          setCurrentTheme(themeId);
        } else if (theme && theme.preset) {
          // Use preset theme
          setCurrentTheme(theme.preset);
        }
      })
      .catch(err => {
        console.log('[ThemeContext] No custom theme found, using default');
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

  return (
    <ThemeContext.Provider value={{
      currentTheme,
      isDark,
      isRtl,
      customTheme,
      switchTheme,
      toggleDarkMode,
      updateCustomTheme,
      availableThemes: getAvailableThemes()
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
