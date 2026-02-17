/**
 * Client-side Font Loader Utility
 *
 * Handles dynamic font loading from Google Fonts and custom sources
 */

class ClientFontLoader {
    constructor() {
        this.loadedFonts = new Set();
    }

    /**
     * Load fonts from theme configuration
     * @param {Object} theme - Theme object with font properties
     * @param {Array} fontConfigs - Font configurations from import
     */
    loadThemeFonts(theme, fontConfigs = []) {
        // Load from font configs if available (from Figma import)
        if (fontConfigs && fontConfigs.length > 0) {
            fontConfigs.forEach(fontConfig => {
                if (fontConfig.config?.source === 'google-fonts') {
                    this.loadGoogleFont(fontConfig.config.fontFamily, fontConfig.config.weights);
                }
            });
            return;
        }

        // Fallback: extract and load fonts from theme object
        const fonts = this.extractFontsFromTheme(theme);
        fonts.forEach(font => {
            this.loadFontFromName(font);
        });
    }

    /**
     * Extract font names from theme
     * @private
     */
    extractFontsFromTheme(theme) {
        const fonts = new Set();

        if (theme.headingFont) fonts.add(this.cleanFontName(theme.headingFont));
        if (theme.bodyFont) fonts.add(this.cleanFontName(theme.bodyFont));
        if (theme.fontFamily) fonts.add(this.cleanFontName(theme.fontFamily));

        return Array.from(fonts);
    }

    /**
     * Clean font name
     * @private
     */
    cleanFontName(fontFamily) {
        return fontFamily
            .replace(/['"]/g, '')
            .split(',')[0]
            .trim();
    }

    /**
     * Load font by name (attempts Google Fonts)
     * @param {string} fontName - Font family name
     */
    loadFontFromName(fontName) {
        // Check if already loaded
        if (this.loadedFonts.has(fontName.toLowerCase())) {
            return;
        }

        // Check if it's a system font
        if (this.isSystemFont(fontName)) {
            return;
        }

        // Try loading from Google Fonts
        this.loadGoogleFont(fontName);
    }

    /**
     * Load Google Font
     * @param {string} fontFamily - Font family name
     * @param {Array} weights - Font weights to load
     */
    loadGoogleFont(fontFamily, weights = ['400', '700']) {
        const cleanName = this.cleanFontName(fontFamily);

        // Check if already loaded
        if (this.loadedFonts.has(cleanName.toLowerCase())) {
            return;
        }

        try {
            // Create link element
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = this.getGoogleFontUrl(cleanName, weights);

            // Add to document head
            document.head.appendChild(link);

            // Mark as loaded
            this.loadedFonts.add(cleanName.toLowerCase());

            console.log(`[FontLoader] Loaded Google Font: ${cleanName}`);

        } catch (error) {
            console.error(`[FontLoader] Failed to load font: ${cleanName}`, error);
        }
    }

    /**
     * Get Google Font URL
     * @private
     */
    getGoogleFontUrl(fontFamily, weights = ['400', '700']) {
        const family = encodeURIComponent(fontFamily);
        const weightParams = weights.join(';');
        return `https://fonts.googleapis.com/css2?family=${family}:wght@${weightParams}&display=swap`;
    }

    /**
     * Check if font is a system font
     * @private
     */
    isSystemFont(fontName) {
        const systemFonts = [
            'arial', 'helvetica', 'times', 'courier', 'verdana', 'georgia',
            'palatino', 'garamond', 'bookman', 'comic sans', 'trebuchet',
            'impact', 'lucida', 'tahoma', 'segoe', 'system', 'apple',
            'blink', 'roboto', 'oxygen', 'ubuntu', 'cantarell', 'fira',
            'droid', 'sans-serif', 'serif', 'monospace'
        ];

        const lowerName = fontName.toLowerCase();
        return systemFonts.some(sys => lowerName.includes(sys));
    }

    /**
     * Preconnect to font sources for faster loading
     */
    preconnectToFontSources() {
        // Google Fonts preconnect
        const preconnects = [
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com'
        ];

        preconnects.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = url;
            if (url.includes('gstatic')) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });
    }

    /**
     * Generate CSS @font-face rule for custom fonts
     * @param {string} fontFamily - Font family name
     * @param {string} fontUrl - URL to font file
     * @param {string} weight - Font weight
     * @param {string} style - Font style
     */
    loadCustomFont(fontFamily, fontUrl, weight = '400', style = 'normal') {
        const fontFace = new FontFace(fontFamily, `url(${fontUrl})`, {
            weight,
            style
        });

        fontFace.load().then(loadedFont => {
            document.fonts.add(loadedFont);
            this.loadedFonts.add(fontFamily.toLowerCase());
            console.log(`[FontLoader] Loaded custom font: ${fontFamily}`);
        }).catch(error => {
            console.error(`[FontLoader] Failed to load custom font: ${fontFamily}`, error);
        });
    }

    /**
     * Check if font is loaded
     * @param {string} fontFamily - Font family name
     * @returns {boolean}
     */
    isFontLoaded(fontFamily) {
        const cleanName = this.cleanFontName(fontFamily).toLowerCase();
        return this.loadedFonts.has(cleanName);
    }

    /**
     * Wait for font to load
     * @param {string} fontFamily - Font family name
     * @param {number} timeout - Timeout in ms
     * @returns {Promise<boolean>}
     */
    async waitForFont(fontFamily, timeout = 3000) {
        const cleanName = this.cleanFontName(fontFamily);

        if (this.isSystemFont(cleanName)) {
            return true; // System fonts are always available
        }

        try {
            await document.fonts.load(`16px "${cleanName}"`, '', { timeout });
            return true;
        } catch (error) {
            console.warn(`[FontLoader] Font loading timeout: ${cleanName}`);
            return false;
        }
    }

    /**
     * Get loaded fonts list
     * @returns {Array<string>}
     */
    getLoadedFonts() {
        return Array.from(this.loadedFonts);
    }

    /**
     * Clear loaded fonts tracking (useful for cleanup)
     */
    clearLoadedFonts() {
        this.loadedFonts.clear();
    }
}

// Export singleton instance
const fontLoader = new ClientFontLoader();

// Preconnect to font sources on load
if (typeof window !== 'undefined') {
    fontLoader.preconnectToFontSources();
}

export default fontLoader;
