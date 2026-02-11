import React, { createContext, useContext, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, user }) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language.startsWith('ar');

  // Update Body Direction
  useEffect(() => {
    document.body.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  // Fetch and apply theme
  useEffect(() => {
    axios.get('/api/settings/theme')
      .then(res => {
        const theme = res.data;
        if (theme && Object.keys(theme).length > 0) {
          applyTheme(theme);
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <ThemeContext.Provider value={{ isRtl }}>
      {children}
    </ThemeContext.Provider>
  );
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.primaryColor) {
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--sidebar-bg', `color-mix(in srgb, ${theme.primaryColor} 4%, white)`);
    root.style.setProperty('--sidebar-text', theme.primaryColor);
    root.style.setProperty('--sidebar-active-bg', theme.primaryColor);
    root.style.setProperty('--sidebar-active-text', '#ffffff');
    root.style.setProperty('--sidebar-border', `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`);
    root.style.setProperty('--header-bg', `color-mix(in srgb, ${theme.primaryColor} 2%, white)`);
    root.style.setProperty('--header-border', `color-mix(in srgb, ${theme.primaryColor} 15%, transparent)`);
  }
  if (theme.secondaryColor) root.style.setProperty('--secondary-color', theme.secondaryColor);
  if (theme.backgroundColor) root.style.setProperty('--background-color', theme.backgroundColor);
  if (theme.textColor) root.style.setProperty('--text-color', theme.textColor);
  if (theme.borderRadius) root.style.setProperty('--border-radius', theme.borderRadius);
  if (theme.fontFamily) root.style.setProperty('--font-family', theme.fontFamily);
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
