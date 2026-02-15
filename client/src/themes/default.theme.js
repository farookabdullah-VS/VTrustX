/**
 * Default Theme - Rayi Stitch
 * 
 * The primary theme for VTrustX featuring teal and amber colors
 * with a modern, premium feel.
 */

export const defaultTheme = {
  id: 'default',
  name: 'Rayi Stitch',
  description: 'Modern teal and amber theme with glass effects',
  
  colors: {
    // Brand Colors
    primary: '#00695C',
    primaryHover: '#004D40',
    primaryLight: '#00897B',
    secondary: '#FFB300',
    accent: '#00897B',
    
    // Backgrounds
    deepBg: '#eff3f8',
    surfaceBg: '#ffffff',
    cardBg: '#ffffff',
    
    // Glass Effect
    glassBg: 'rgba(255, 255, 255, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.6)',
    
    // Sidebar
    sidebarBg: 'linear-gradient(180deg, #D9F8E5 0%, #ecfdf5 100%)',
    sidebarText: '#064e3b',
    sidebarActiveBg: '#cce8e4',
    sidebarActiveText: '#004D40',
    sidebarHoverBg: 'rgba(6, 78, 59, 0.08)',
    sidebarBorder: 'rgba(6, 78, 59, 0.1)',
    
    // Header
    headerBg: '#ecfdf5',
    headerBorder: 'rgba(6, 78, 59, 0.3)',
    
    // Text
    textPrimary: '#1a1c1e',
    textSecondary: '#444746',
    textMuted: '#5f6368',
    textDisabled: '#9CA3AF',
    
    // Status
    statusError: '#B3261E',
    statusSuccess: '#14AE5C',
    statusWarning: '#FFB300',
    statusInfo: '#2563EB',
    
    // Form Elements
    inputBg: '#f0f2f5',
    inputBorder: 'transparent',
    inputFocusBorder: '#00695C',
    
    // Buttons
    buttonPrimaryBg: '#00695C',
    buttonPrimaryHoverBg: '#004D40',
    buttonPrimaryText: '#ffffff',
    buttonSecondaryBg: '#f0f2f5',
    buttonSecondaryHoverBg: '#e5e7eb',
    buttonSecondaryText: '#1a1c1e',
    
    // Borders
    borderLight: '#e5e7eb',
    borderMedium: '#d1d5db'
  },
  
  typography: {
    fontFamily: "'Outfit', 'Google Sans', system-ui, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem'
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
    xl: '2rem',
    '2xl': '3rem'
  },
  
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px'
  },
  
  shadows: {
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
  },
  
  components: {
    dashboard: {
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      cardShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    },
    abTesting: {
      cardBg: '#ffffff',
      cardBorder: '#e5e7eb',
      statusRunningBg: '#DBEAFE',
      statusRunningColor: '#1D4ED8',
      statusCompletedBg: '#D1FAE5',
      statusCompletedColor: '#065F46',
      liveIndicatorBg: '#10B98115',
      liveIndicatorBorder: '#10B981'
    },
    formBuilder: {
      canvasBg: '#f9fafb',
      fieldBg: '#ffffff',
      fieldBorder: '#e5e7eb'
    },
    analytics: {
      chartPrimary: '#00695C',
      chartSecondary: '#FFB300',
      chartGrid: '#e5e7eb'
    }
  }
};
