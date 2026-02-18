/**
 * Theme Manager
 *
 * Central theme loader and manager for applying themes dynamically
 */

import { defaultTheme } from './default.theme';
import { darkTheme } from './dark.theme';
import { foundingDayTheme } from './founding-day.theme';
import { aiNeuralTheme } from './ai-neural.theme';

// Theme registry
const themes = {
  default: defaultTheme,
  dark: darkTheme,
  founding: foundingDayTheme,
  'ai-neural': aiNeuralTheme
};

/**
 * Apply a theme to the document
 * @param {string} themeId - Theme identifier
 * @param {object} customTheme - Optional custom theme object
 */
export function applyTheme(themeId, customTheme = null) {
  // If we are applying dark mode, we prioritize the dark theme object
  // otherwise we use customTheme if available, then the requested themeId
  const theme = (themeId === 'dark' && !customTheme?.isDark)
    ? themes.dark
    : (customTheme || themes[themeId] || themes.default);

  const root = document.documentElement;

  // Set data attribute for CSS selectors first
  root.setAttribute('data-theme', themeId);

  console.log(`[ThemeManager] Applying theme: ${theme.name} (ID: ${themeId})`);

  // Force reset core variables to avoid leakage from previous themes
  // This is critical when switching from Dark -> Light Custom
  if (themeId !== 'dark') {
    // If not dark mode, ensure we set light defaults for common background variables
    // if the theme doesn't provide them.
    root.style.setProperty('--deep-bg', theme.colors?.deepBg || '#eff3f8');
    root.style.setProperty('--surface-bg', theme.colors?.surfaceBg || '#ffffff');
    root.style.setProperty('--card-bg', theme.colors?.cardBg || '#ffffff');
  }

  const applyRecursive = (obj, prefix = '') => {
    if (!obj) return;
    Object.entries(obj).forEach(([key, value]) => {
      const kebabKey = camelToKebab(key);
      const fullKey = prefix ? `${prefix}-${kebabKey}` : kebabKey;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        applyRecursive(value, fullKey);
      } else {
        root.style.setProperty(`--${fullKey}`, value);
      }
    });
  };

  // 1. Apply core colors
  if (theme.colors) applyRecursive(theme.colors);

  // 2. Apply typography
  if (theme.typography) {
    if (theme.typography.fontFamily) {
      root.style.setProperty('--font-family', theme.typography.fontFamily);
    }
    if (theme.typography.fontSize) applyRecursive(theme.typography.fontSize, 'text');
    if (theme.typography.fontWeight) applyRecursive(theme.typography.fontWeight, 'font');
  }

  // 3. Apply basic design tokens
  if (theme.spacing) applyRecursive(theme.spacing, 'space');
  if (theme.borderRadius) applyRecursive(theme.borderRadius, 'radius');
  if (theme.shadows) applyRecursive(theme.shadows, 'shadow');

  // 4. Apply component-specific styles
  if (theme.components) {
    Object.entries(theme.components).forEach(([componentKey, componentStyles]) => {
      Object.entries(componentStyles).forEach(([styleKey, styleValue]) => {
        const cssVarName = `--${componentKey}-${camelToKebab(styleKey)}`;
        root.style.setProperty(cssVarName, styleValue);
      });
    });
  }

  // Store theme preference - ONLY if it's not 'dark' (which is handled by rayix_theme_mode)
  if (themeId !== 'dark') {
    localStorage.setItem('rayix_theme_id', themeId);
  }
}

/**
 * Get theme by ID
 * @param {string} themeId - Theme identifier
 * @returns {object} Theme object
 */
export function getTheme(themeId) {
  return themes[themeId] || themes.default;
}

/**
 * Register a custom theme
 * @param {string} themeId - Theme identifier
 * @param {object} themeConfig - Theme configuration object
 */
export function registerTheme(themeId, themeConfig) {
  themes[themeId] = {
    ...themeConfig,
    id: themeId
  };
  console.log(`[ThemeManager] Registered theme: ${themeId}`);
}

/**
 * Get all available themes
 * @returns {Array} Array of theme metadata
 */
export function getAvailableThemes() {
  return Object.keys(themes).map(key => ({
    id: key,
    name: themes[key].name,
    description: themes[key].description,
    preview: themes[key].colors?.primary || '#00695C'
  }));
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - camelCase string
 * @returns {string} kebab-case string
 */
function camelToKebab(str) {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Generate CSS variables from theme object
 * @param {object} theme - Theme object
 * @returns {string} CSS variables string
 */
export function generateThemeCSS(theme) {
  let css = ':root {\n';

  const processObject = (obj, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      const varName = prefix + camelToKebab(key);

      if (typeof value === 'object' && !Array.isArray(value)) {
        processObject(value, `${varName}-`);
      } else {
        css += `  --${varName}: ${value};\n`;
      }
    });
  };

  if (theme.colors) processObject(theme.colors);
  if (theme.typography) processObject(theme.typography, 'typography-');
  if (theme.spacing) processObject(theme.spacing, 'space-');
  if (theme.borderRadius) processObject(theme.borderRadius, 'radius-');
  if (theme.shadows) processObject(theme.shadows, 'shadow-');
  if (theme.components) processObject(theme.components);

  css += '}\n';
  return css;
}

// Initialize default theme on module load
// This ensures CSS variables are set before React renders
const initThemeId = localStorage.getItem('rayix_theme_id') || 'default';
const initThemeMode = localStorage.getItem('rayix_theme_mode');

// Apply appropriate theme immediately
if (initThemeMode === 'dark') {
  applyTheme('dark');
} else {
  applyTheme(initThemeId);
}

console.log(`[ThemeManager] Initialized with theme: ${initThemeMode === 'dark' ? 'dark' : initThemeId}`);

// Export all
export { themes };
export default {
  applyTheme,
  getTheme,
  registerTheme,
  getAvailableThemes,
  generateThemeCSS,
  themes
};
