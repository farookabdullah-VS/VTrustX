/**
 * AI Neural Theme
 * 
 * A futuristic AI-inspired theme featuring electric blue, cyber purple,
 * and neon accents. Designed to represent artificial intelligence and
 * neural networks throughout the entire system.
 */

export const aiNeuralTheme = {
    id: 'ai-neural',
    name: 'AI Neural',
    description: 'Futuristic AI theme with electric blue and cyber purple',

    colors: {
        // AI Brand Colors - Electric Blue & Cyber Purple
        primary: '#6366F1',           // Vibrant Indigo (AI Primary)
        primaryHover: '#4F46E5',      // Deep Indigo
        primaryLight: '#818CF8',      // Light Indigo
        secondary: '#8B5CF6',         // Vivid Purple (Neural)
        accent: '#06B6D4',            // Cyan (Tech Accent)

        // AI Gradient Colors
        aiGradientStart: '#6366F1',   // Indigo
        aiGradientMid: '#8B5CF6',     // Purple
        aiGradientEnd: '#06B6D4',     // Cyan

        // Backgrounds - Dark Tech
        deepBg: '#0F0F1E',            // Deep Space Blue
        surfaceBg: '#1A1A2E',         // Dark Navy
        cardBg: '#16213E',            // Card Navy

        // Glass Effect - Futuristic
        glassBg: 'rgba(99, 102, 241, 0.08)',
        glassBorder: 'rgba(99, 102, 241, 0.2)',

        // Sidebar - AI Neural
        sidebarBg: 'linear-gradient(180deg, #1A1A2E 0%, #0F0F1E 100%)',
        sidebarText: '#E0E7FF',
        sidebarActiveBg: 'rgba(99, 102, 241, 0.15)',
        sidebarActiveText: '#818CF8',
        sidebarHoverBg: 'rgba(99, 102, 241, 0.08)',
        sidebarBorder: 'rgba(99, 102, 241, 0.2)',

        // Header - Tech
        headerBg: 'rgba(26, 26, 46, 0.95)',
        headerBorder: 'rgba(99, 102, 241, 0.3)',

        // Text - High Contrast
        textPrimary: '#F1F5F9',
        textSecondary: '#CBD5E1',
        textMuted: '#94A3B8',
        textDisabled: '#64748B',
        textColor: '#F1F5F9',

        // AI Specific Text Colors
        aiTextGlow: '#818CF8',
        neuralText: '#8B5CF6',
        techText: '#06B6D4',

        // Status - Neon
        statusError: '#F43F5E',       // Neon Red
        statusSuccess: '#10B981',     // Neon Green
        statusWarning: '#F59E0B',     // Neon Amber
        statusInfo: '#06B6D4',        // Neon Cyan

        // AI Status Indicators
        aiActive: '#10B981',          // Active AI (Green)
        aiProcessing: '#8B5CF6',      // Processing (Purple)
        aiIdle: '#64748B',            // Idle (Gray)

        // Form Elements - Tech
        inputBg: 'rgba(99, 102, 241, 0.05)',
        inputBorder: 'rgba(99, 102, 241, 0.2)',
        inputFocusBorder: '#6366F1',
        inputText: '#F1F5F9',
        inputPlaceholder: '#94A3B8',

        // Buttons - AI Powered
        buttonPrimaryBg: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        buttonPrimaryHoverBg: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        buttonPrimaryText: '#FFFFFF',
        buttonSecondaryBg: 'rgba(99, 102, 241, 0.1)',
        buttonSecondaryHoverBg: 'rgba(99, 102, 241, 0.2)',
        buttonSecondaryText: '#818CF8',

        // AI Button Variants
        aiButtonBg: 'linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)',
        neuralButtonBg: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',

        // Borders - Neon
        borderLight: 'rgba(99, 102, 241, 0.15)',
        borderMedium: 'rgba(99, 102, 241, 0.3)',
        borderGlow: 'rgba(99, 102, 241, 0.5)',

        // Special Effects
        glowPrimary: '0 0 20px rgba(99, 102, 241, 0.5)',
        glowSecondary: '0 0 20px rgba(139, 92, 246, 0.5)',
        glowAccent: '0 0 20px rgba(6, 182, 212, 0.5)',

        // Neural Network Visualization
        neuralNode: '#8B5CF6',
        neuralConnection: 'rgba(99, 102, 241, 0.3)',
        neuralActive: '#06B6D4',

        // Data Visualization
        dataPoint1: '#6366F1',
        dataPoint2: '#8B5CF6',
        dataPoint3: '#06B6D4',
        dataPoint4: '#10B981',
        dataPoint5: '#F59E0B',

        // Additional UI Elements
        dividerColor: 'rgba(99, 102, 241, 0.2)',
        hoverBg: 'rgba(99, 102, 241, 0.05)',
        selectedBg: 'rgba(99, 102, 241, 0.15)',
        focusRing: 'rgba(99, 102, 241, 0.5)',

        // Avatar & Profile
        avatarBg: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        profileMenuBg: '#1A1A2E',
        profileMenuBorder: 'rgba(99, 102, 241, 0.3)'
    },

    typography: {
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
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
            bold: 700,
            extrabold: 800
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
        sm: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        full: '9999px'
    },

    shadows: {
        sm: '0 1px 3px 0 rgba(99, 102, 241, 0.2)',
        md: '0 4px 6px -1px rgba(99, 102, 241, 0.3)',
        lg: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
        xl: '0 20px 25px -5px rgba(99, 102, 241, 0.5)',
        glow: '0 0 30px rgba(99, 102, 241, 0.6)'
    },

    components: {
        dashboard: {
            cardBg: '#16213E',
            cardBorder: 'rgba(99, 102, 241, 0.2)',
            cardShadow: '0 4px 20px rgba(99, 102, 241, 0.15)',
            cardGlow: '0 0 30px rgba(99, 102, 241, 0.1)'
        },
        aiAgent: {
            activeBg: 'rgba(16, 185, 129, 0.1)',
            activeBorder: '#10B981',
            processingBg: 'rgba(139, 92, 246, 0.1)',
            processingBorder: '#8B5CF6',
            idleBg: 'rgba(100, 116, 139, 0.1)',
            idleBorder: '#64748B'
        },
        abTesting: {
            cardBg: '#16213E',
            cardBorder: 'rgba(99, 102, 241, 0.2)',
            statusRunningBg: 'rgba(99, 102, 241, 0.1)',
            statusRunningColor: '#818CF8',
            statusCompletedBg: 'rgba(16, 185, 129, 0.1)',
            statusCompletedColor: '#10B981',
            liveIndicatorBg: 'rgba(6, 182, 212, 0.1)',
            liveIndicatorBorder: '#06B6D4'
        },
        formBuilder: {
            canvasBg: '#0F0F1E',
            fieldBg: '#16213E',
            fieldBorder: 'rgba(99, 102, 241, 0.2)',
            fieldGlow: '0 0 10px rgba(99, 102, 241, 0.2)'
        },
        analytics: {
            chartPrimary: '#6366F1',
            chartSecondary: '#8B5CF6',
            chartAccent: '#06B6D4',
            chartGrid: 'rgba(99, 102, 241, 0.1)',
            chartGlow: '0 0 20px rgba(99, 102, 241, 0.3)'
        },
        neural: {
            nodePrimary: '#6366F1',
            nodeSecondary: '#8B5CF6',
            nodeActive: '#06B6D4',
            connection: 'rgba(99, 102, 241, 0.3)',
            connectionActive: 'rgba(6, 182, 212, 0.6)',
            pulse: '0 0 20px rgba(99, 102, 241, 0.8)'
        }
    }
};
