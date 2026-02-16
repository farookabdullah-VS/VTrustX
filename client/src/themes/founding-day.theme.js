/**
 * Saudi Founding Day Theme
 * 
 * A heritage-inspired theme utilizing colors from the Saudi Founding Day identity:
 * Coffee bean brown, desert gold, mud brick beige, and palm green.
 */

export const foundingDayTheme = {
    id: 'founding-day',
    name: 'Founding Day',
    description: 'Saudi heritage theme with coffee brown and desert gold',

    colors: {
        // Heritage Brand Colors
        primary: '#7C4F3B', // Heritage Brown
        primaryHover: '#5D3B2C',
        primaryLight: '#A27B63',
        secondary: '#C5A059', // Desert Gold
        accent: '#2D4C3E', // Palm Green

        // Backgrounds
        deepBg: '#F5EEE6', // Mud Brick Light
        surfaceBg: '#FDF9F2', // Parchment
        cardBg: '#ffffff',

        // Glass Effect
        glassBg: 'rgba(253, 249, 242, 0.85)',
        glassBorder: 'rgba(124, 79, 59, 0.2)',

        // Sidebar
        sidebarBg: 'linear-gradient(180deg, #E4D8C4 0%, #F5EEE6 100%)',
        sidebarText: '#4A2E22',
        sidebarActiveBg: '#7C4F3B',
        sidebarActiveText: '#ffffff',
        sidebarHoverBg: 'rgba(124, 79, 59, 0.1)',
        sidebarBorder: 'rgba(124, 79, 59, 0.15)',

        // Header
        headerBg: '#FDF9F2',
        headerBorder: 'rgba(124, 79, 59, 0.2)',

        // Text
        textPrimary: '#2D1B14',
        textSecondary: '#5D3B2C',
        textMuted: '#8B7361',
        textDisabled: '#B9A99D',

        // Status
        statusError: '#9E3229',
        statusSuccess: '#2D4C3E',
        statusWarning: '#C5A059',
        statusInfo: '#4A6D8C',

        // Form Elements
        inputBg: '#ffffff',
        inputBorder: '#D7C7B2',
        inputFocusBorder: '#7C4F3B',

        // Buttons
        buttonPrimaryBg: '#7C4F3B',
        buttonPrimaryHoverBg: '#5D3B2C',
        buttonPrimaryText: '#ffffff',
        buttonSecondaryBg: '#E4D8C4',
        buttonSecondaryHoverBg: '#D7C7B2',
        buttonSecondaryText: '#4A2E22',

        // Borders
        borderLight: '#F0E6D8',
        borderMedium: '#D7C7B2'
    },

    typography: {
        fontFamily: "'IBM Plex Sans Arabic', 'Outfit', system-ui, sans-serif",
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
        sm: '0.2rem',
        md: '0.4rem',
        lg: '0.6rem',
        xl: '0.8rem',
        '2xl': '1.2rem',
        full: '9999px'
    },

    shadows: {
        sm: '0 1px 3px 0 rgba(74, 46, 34, 0.1)',
        md: '0 4px 6px -1px rgba(74, 46, 34, 0.1)',
        lg: '0 10px 15px -3px rgba(74, 46, 34, 0.1)',
        xl: '0 20px 25px -5px rgba(74, 46, 34, 0.1)'
    },

    components: {
        dashboard: {
            cardBg: '#ffffff',
            cardBorder: '#F0E6D8',
            cardShadow: '0 1px 3px rgba(74, 46, 34, 0.05)'
        },
        formBuilder: {
            canvasBg: '#F5EEE6',
            fieldBg: '#ffffff',
            fieldBorder: '#D7C7B2'
        },
        analytics: {
            chartPrimary: '#7C4F3B',
            chartSecondary: '#C5A059',
            chartGrid: '#F0E6D8'
        }
    }
};
