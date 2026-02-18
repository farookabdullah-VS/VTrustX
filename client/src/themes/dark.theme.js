/**
 * Dark Theme
 *
 * Dark mode version with adjusted colors for better contrast
 */

export const darkTheme = {
  id: 'dark',
  name: 'Dark Mode',
  description: 'Dark theme with high contrast',

  colors: {
    primary: '#26A69A',
    primaryHover: '#00897B',
    primaryLight: '#4DB6AC',
    secondary: '#FFD54F',
    accent: '#26A69A',

    // Backgrounds
    deepBg: '#0f1419',
    surfaceBg: '#1a1f2e',
    cardBg: '#242b3d',

    // Glass Effect
    glassBg: 'rgba(26, 31, 46, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',

    // Sidebar
    sidebarBg: 'linear-gradient(180deg, #1a2332 0%, #141b28 100%)',
    sidebarText: '#e2e8f0',
    sidebarActiveBg: '#2d3748',
    sidebarActiveText: '#26A69A',
    sidebarHoverBg: 'rgba(226, 232, 240, 0.08)',
    sidebarBorder: 'rgba(226, 232, 240, 0.1)',

    // Header
    headerBg: '#1a2332',
    headerBorder: 'rgba(226, 232, 240, 0.1)',

    // Text - Enhanced for better visibility
    textPrimary: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',
    textDisabled: '#64748b',
    textColor: '#f8fafc',  // Main text color

    // Additional text colors for components
    headingColor: '#ffffff',
    labelColor: '#e2e8f0',
    placeholderColor: '#94a3b8',

    // Status
    statusError: '#EF4444',
    statusSuccess: '#10B981',
    statusWarning: '#F59E0B',
    statusInfo: '#3B82F6',

    // Form Elements
    inputBg: '#2d3748',
    inputBorder: '#4a5568',
    inputFocusBorder: '#26A69A',
    inputText: '#f8fafc',
    inputPlaceholder: '#94a3b8',

    // Buttons
    buttonPrimaryBg: '#26A69A',
    buttonPrimaryHoverBg: '#00897B',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryBg: '#2d3748',
    buttonSecondaryHoverBg: '#4a5568',
    buttonSecondaryText: '#f8fafc',

    // Borders
    borderLight: '#2d3748',
    borderMedium: '#4a5568',

    // Additional UI elements
    dividerColor: 'rgba(226, 232, 240, 0.1)',
    hoverBg: 'rgba(226, 232, 240, 0.05)',
    selectedBg: 'rgba(38, 166, 154, 0.15)',
    focusRing: 'rgba(38, 166, 154, 0.5)'
  },

  typography: {
    fontFamily: "'Outfit', 'Google Sans', system-ui, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },

  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px'
  },

  shadows: {
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
  },

  components: {
    dashboard: {
      cardBg: '#242b3d',
      cardBorder: '#2d3748',
      cardShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
    },
    abTesting: {
      cardBg: '#242b3d',
      cardBorder: '#2d3748',
      statusRunningBg: '#1e3a8a',
      statusRunningColor: '#93c5fd',
      statusCompletedBg: '#065f46',
      statusCompletedColor: '#6ee7b7'
    },
    analytics: {
      chartPrimary: '#26A69A',
      chartSecondary: '#FFD54F',
      chartGrid: '#2d3748'
    }
  }
};
