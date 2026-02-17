/**
 * Font Loader Service
 *
 * Handles font loading from various sources:
 * - Google Fonts API
 * - Custom font URLs
 * - System fonts
 *
 * Automatically detects if fonts are available and provides fallbacks.
 */

const axios = require('axios');
const logger = require('../infrastructure/logger');

class FontLoader {
    constructor() {
        this.googleFontsApiKey = process.env.GOOGLE_FONTS_API_KEY || null;
        this.googleFontsCache = new Map();
    }

    /**
     * Process font from Figma and determine how to load it
     * @param {string} fontFamily - Font family name from Figma
     * @returns {Promise<Object>} Font configuration
     */
    async processFigmaFont(fontFamily) {
        try {
            // Clean font name
            const cleanName = this.cleanFontName(fontFamily);

            // Check if it's a system font
            if (this.isSystemFont(cleanName)) {
                return {
                    fontFamily: this.getSystemFontStack(cleanName),
                    source: 'system',
                    loadMethod: 'none',
                    fallback: this.getSystemFontStack(cleanName)
                };
            }

            // Check if available on Google Fonts
            const googleFont = await this.findGoogleFont(cleanName);
            if (googleFont) {
                return {
                    fontFamily: `'${googleFont.family}', sans-serif`,
                    source: 'google-fonts',
                    loadMethod: 'link',
                    googleFontUrl: this.getGoogleFontUrl(googleFont.family),
                    googleFontImport: this.getGoogleFontImport(googleFont.family),
                    fallback: this.getFallbackStack(googleFont.category),
                    weights: googleFont.variants || ['regular', '400', '700']
                };
            }

            // Custom font (needs to be hosted)
            return {
                fontFamily: `'${cleanName}', sans-serif`,
                source: 'custom',
                loadMethod: 'hosted',
                warning: 'This font needs to be hosted separately. Upload font files to use.',
                fallback: this.getFallbackStack('sans-serif')
            };

        } catch (error) {
            logger.error('[FontLoader] Error processing font', {
                fontFamily,
                error: error.message
            });

            // Return safe fallback
            return {
                fontFamily: 'sans-serif',
                source: 'system',
                loadMethod: 'none',
                fallback: 'Arial, Helvetica, sans-serif',
                error: error.message
            };
        }
    }

    /**
     * Clean font name from Figma format
     * @private
     */
    cleanFontName(fontFamily) {
        return fontFamily
            .replace(/['"]/g, '')
            .split(',')[0]
            .trim();
    }

    /**
     * Check if font is a system font
     * @private
     */
    isSystemFont(fontName) {
        const systemFonts = [
            'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New',
            'Courier', 'Verdana', 'Georgia', 'Palatino', 'Garamond',
            'Bookman', 'Comic Sans MS', 'Trebuchet MS', 'Impact',
            'Lucida Sans', 'Tahoma', 'Segoe UI', 'System', '-apple-system',
            'BlinkMacSystemFont', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell',
            'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif',
            'serif', 'monospace', 'cursive', 'fantasy'
        ];

        return systemFonts.some(sysFont =>
            fontName.toLowerCase().includes(sysFont.toLowerCase())
        );
    }

    /**
     * Get system font stack
     * @private
     */
    getSystemFontStack(fontName) {
        const stacks = {
            'Arial': 'Arial, Helvetica, sans-serif',
            'Helvetica': 'Helvetica, Arial, sans-serif',
            'Times': 'Times, "Times New Roman", serif',
            'Georgia': 'Georgia, Times, serif',
            'Courier': '"Courier New", Courier, monospace',
            'Verdana': 'Verdana, Geneva, sans-serif',
            'Trebuchet': '"Trebuchet MS", Helvetica, sans-serif',
            'System': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        };

        for (const [key, stack] of Object.entries(stacks)) {
            if (fontName.toLowerCase().includes(key.toLowerCase())) {
                return stack;
            }
        }

        return fontName;
    }

    /**
     * Find font on Google Fonts
     * @private
     */
    async findGoogleFont(fontName) {
        try {
            // Check cache first
            if (this.googleFontsCache.has(fontName.toLowerCase())) {
                return this.googleFontsCache.get(fontName.toLowerCase());
            }

            // Get Google Fonts list
            const fonts = await this.getGoogleFontsList();

            // Find exact or close match
            const exactMatch = fonts.find(f =>
                f.family.toLowerCase() === fontName.toLowerCase()
            );

            if (exactMatch) {
                this.googleFontsCache.set(fontName.toLowerCase(), exactMatch);
                return exactMatch;
            }

            // Try fuzzy match
            const fuzzyMatch = fonts.find(f =>
                f.family.toLowerCase().includes(fontName.toLowerCase()) ||
                fontName.toLowerCase().includes(f.family.toLowerCase())
            );

            if (fuzzyMatch) {
                this.googleFontsCache.set(fontName.toLowerCase(), fuzzyMatch);
                return fuzzyMatch;
            }

            return null;

        } catch (error) {
            logger.warn('[FontLoader] Could not search Google Fonts', {
                fontName,
                error: error.message
            });
            return null;
        }
    }

    /**
     * Get list of Google Fonts
     * @private
     */
    async getGoogleFontsList() {
        try {
            // Use cached list if available (cache for 24 hours)
            if (this._googleFontsList && this._googleFontsListExpiry > Date.now()) {
                return this._googleFontsList;
            }

            let url = 'https://www.googleapis.com/webfonts/v1/webfonts';

            if (this.googleFontsApiKey) {
                url += `?key=${this.googleFontsApiKey}`;
            } else {
                // Use fallback list of popular Google Fonts
                return this.getPopularGoogleFonts();
            }

            const response = await axios.get(url, { timeout: 5000 });

            this._googleFontsList = response.data.items || [];
            this._googleFontsListExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

            return this._googleFontsList;

        } catch (error) {
            logger.warn('[FontLoader] Could not fetch Google Fonts list, using fallback', {
                error: error.message
            });
            return this.getPopularGoogleFonts();
        }
    }

    /**
     * Get popular Google Fonts as fallback
     * @private
     */
    getPopularGoogleFonts() {
        return [
            { family: 'Roboto', category: 'sans-serif', variants: ['100', '300', '400', '500', '700', '900'] },
            { family: 'Open Sans', category: 'sans-serif', variants: ['300', '400', '600', '700', '800'] },
            { family: 'Lato', category: 'sans-serif', variants: ['100', '300', '400', '700', '900'] },
            { family: 'Montserrat', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Poppins', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Inter', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Outfit', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Raleway', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Nunito', category: 'sans-serif', variants: ['200', '300', '400', '600', '700', '800', '900'] },
            { family: 'Ubuntu', category: 'sans-serif', variants: ['300', '400', '500', '700'] },
            { family: 'Playfair Display', category: 'serif', variants: ['400', '500', '600', '700', '800', '900'] },
            { family: 'Merriweather', category: 'serif', variants: ['300', '400', '700', '900'] },
            { family: 'PT Sans', category: 'sans-serif', variants: ['400', '700'] },
            { family: 'Noto Sans', category: 'sans-serif', variants: ['400', '700'] },
            { family: 'Work Sans', category: 'sans-serif', variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'] },
            { family: 'Cairo', category: 'sans-serif', variants: ['200', '300', '400', '600', '700', '900'] },
            { family: 'Tajawal', category: 'sans-serif', variants: ['200', '300', '400', '500', '700', '800', '900'] },
            { family: 'Rubik', category: 'sans-serif', variants: ['300', '400', '500', '600', '700', '800', '900'] },
            { family: 'DM Sans', category: 'sans-serif', variants: ['400', '500', '700'] },
            { family: 'Source Sans Pro', category: 'sans-serif', variants: ['200', '300', '400', '600', '700', '900'] }
        ];
    }

    /**
     * Get Google Font URL for <link> tag
     * @private
     */
    getGoogleFontUrl(fontFamily, weights = ['400', '700']) {
        const family = encodeURIComponent(fontFamily);
        const weightParams = weights.includes('regular') ? '400' : weights.join(';');
        return `https://fonts.googleapis.com/css2?family=${family}:wght@${weightParams}&display=swap`;
    }

    /**
     * Get Google Font @import statement
     * @private
     */
    getGoogleFontImport(fontFamily, weights = ['400', '700']) {
        const url = this.getGoogleFontUrl(fontFamily, weights);
        return `@import url('${url}');`;
    }

    /**
     * Get fallback font stack by category
     * @private
     */
    getFallbackStack(category) {
        const fallbacks = {
            'sans-serif': 'Arial, Helvetica, sans-serif',
            'serif': 'Georgia, Times, serif',
            'monospace': '"Courier New", Courier, monospace',
            'display': 'Impact, Arial Black, sans-serif',
            'handwriting': '"Comic Sans MS", cursive'
        };

        return fallbacks[category] || fallbacks['sans-serif'];
    }

    /**
     * Generate CSS for font loading
     * @param {Object} fontConfig - Font configuration from processFigmaFont
     * @returns {string} CSS code
     */
    generateFontCSS(fontConfig) {
        if (fontConfig.source === 'google-fonts') {
            return fontConfig.googleFontImport;
        }

        if (fontConfig.source === 'custom') {
            return `/* Custom font: ${fontConfig.fontFamily} */\n/* Upload font files and add @font-face rules here */`;
        }

        return `/* System font: ${fontConfig.fontFamily} */`;
    }

    /**
     * Generate HTML <link> tag for font loading
     * @param {Object} fontConfig - Font configuration
     * @returns {string} HTML link tag
     */
    generateFontLinkTag(fontConfig) {
        if (fontConfig.source === 'google-fonts') {
            return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontConfig.googleFontUrl}" rel="stylesheet">`;
        }

        return '';
    }

    /**
     * Validate if font is web-safe
     * @param {string} fontFamily - Font family name
     * @returns {boolean}
     */
    isWebSafe(fontFamily) {
        const cleanName = this.cleanFontName(fontFamily);
        return this.isSystemFont(cleanName);
    }

    /**
     * Get font loading instructions for user
     * @param {Object} fontConfig - Font configuration
     * @returns {Object} Instructions
     */
    getFontInstructions(fontConfig) {
        const instructions = {
            source: fontConfig.source,
            fontFamily: fontConfig.fontFamily,
            steps: []
        };

        if (fontConfig.source === 'google-fonts') {
            instructions.steps = [
                'This font is available on Google Fonts',
                'It will load automatically when you apply the theme',
                'No additional configuration needed'
            ];
            instructions.autoLoad = true;
        } else if (fontConfig.source === 'custom') {
            instructions.steps = [
                'This is a custom font that needs to be hosted',
                'Option 1: Upload font files to your server',
                'Option 2: Use a similar Google Font instead',
                'Option 3: System font will be used as fallback'
            ];
            instructions.autoLoad = false;
            instructions.warning = fontConfig.warning;
        } else {
            instructions.steps = [
                'This is a system font',
                'Available on most devices',
                'No loading required'
            ];
            instructions.autoLoad = true;
        }

        return instructions;
    }
}

module.exports = new FontLoader();
