/**
 * Figma Theme Importer Service
 *
 * Imports design tokens (colors, typography, spacing) from Figma files
 * and transforms them into application theme format.
 *
 * Requires:
 * - Figma Personal Access Token (from Figma Account Settings)
 * - Figma File Key (from file URL)
 *
 * @see https://www.figma.com/developers/api
 */

const axios = require('axios');
const logger = require('../infrastructure/logger');
const fontLoader = require('./FontLoader');

class FigmaThemeImporter {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.baseUrl = 'https://api.figma.com/v1';
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'X-Figma-Token': accessToken
            }
        });
    }

    /**
     * Import theme from Figma file
     * @param {string} fileKey - Figma file key from URL
     * @param {object} options - Import options
     * @returns {Promise<object>} Transformed theme object
     */
    async importTheme(fileKey, options = {}) {
        try {
            logger.info('[FigmaImporter] Starting import', { fileKey });

            // 1. Fetch file metadata and styles
            const [fileData, styleData] = await Promise.all([
                this.getFile(fileKey),
                this.getFileStyles(fileKey)
            ]);

            // 2. Extract design tokens
            const designTokens = this.extractDesignTokens(fileData, styleData);

            // 3. Transform to application theme format
            const theme = this.transformToTheme(designTokens, options);

            // 4. Process fonts for web loading
            const fontInfo = await this.processFonts(theme);

            logger.info('[FigmaImporter] Import successful', {
                fileKey,
                tokensCount: Object.keys(designTokens).length,
                fontsProcessed: fontInfo.fonts.length
            });

            return {
                success: true,
                theme,
                fonts: fontInfo.fonts,
                fontInstructions: fontInfo.instructions,
                metadata: {
                    fileName: fileData.name,
                    lastModified: fileData.lastModified,
                    version: fileData.version,
                    importedAt: new Date().toISOString()
                }
            };

        } catch (error) {
            logger.error('[FigmaImporter] Import failed', {
                error: error.message,
                fileKey
            });
            throw new Error(`Figma import failed: ${error.message}`);
        }
    }

    /**
     * Get Figma file data
     * @private
     */
    async getFile(fileKey) {
        try {
            const response = await this.client.get(`/files/${fileKey}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 403) {
                throw new Error('Invalid Figma access token or no permission to access file');
            }
            if (error.response?.status === 404) {
                throw new Error('Figma file not found. Check the file key.');
            }
            throw error;
        }
    }

    /**
     * Get file styles (colors, text styles, effects)
     * @private
     */
    async getFileStyles(fileKey) {
        try {
            const response = await this.client.get(`/files/${fileKey}/styles`);
            return response.data;
        } catch (error) {
            logger.warn('[FigmaImporter] Could not fetch styles', { error: error.message });
            return { meta: { styles: [] } };
        }
    }

    /**
     * Extract design tokens from Figma data
     * @private
     */
    extractDesignTokens(fileData, styleData) {
        const tokens = {
            colors: {},
            typography: {},
            spacing: {},
            borderRadius: {},
            shadows: {}
        };

        // Extract from local styles (modern approach)
        if (styleData.meta?.styles) {
            styleData.meta.styles.forEach(style => {
                if (style.style_type === 'FILL') {
                    tokens.colors[style.name] = this.extractColorFromStyle(style);
                } else if (style.style_type === 'TEXT') {
                    tokens.typography[style.name] = this.extractTextStyle(style);
                } else if (style.style_type === 'EFFECT') {
                    tokens.shadows[style.name] = this.extractEffectStyle(style);
                }
            });
        }

        // Extract from Figma Variables (new Variables API)
        if (fileData.document?.children) {
            this.extractFromNodes(fileData.document.children, tokens);
        }

        // Extract common patterns from component names
        if (fileData.components) {
            this.extractFromComponents(fileData.components, tokens);
        }

        return tokens;
    }

    /**
     * Extract color from Figma style
     * @private
     */
    extractColorFromStyle(style) {
        // Figma color format: {r: 0-1, g: 0-1, b: 0-1, a: 0-1}
        if (style.fills && style.fills[0]) {
            const fill = style.fills[0];
            if (fill.type === 'SOLID') {
                return this.rgbaToHex(fill.color);
            }
        }
        return null;
    }

    /**
     * Extract text style from Figma
     * @private
     */
    extractTextStyle(style) {
        if (!style.text) return null;

        return {
            fontFamily: style.text.fontFamily || 'inherit',
            fontSize: `${style.text.fontSize}px` || '16px',
            fontWeight: style.text.fontWeight || 400,
            lineHeight: style.text.lineHeightPx ? `${style.text.lineHeightPx}px` : '1.5',
            letterSpacing: style.text.letterSpacing || 'normal'
        };
    }

    /**
     * Extract effect/shadow style
     * @private
     */
    extractEffectStyle(style) {
        if (style.effects && style.effects[0]) {
            const effect = style.effects[0];
            if (effect.type === 'DROP_SHADOW') {
                return {
                    offsetX: effect.offset?.x || 0,
                    offsetY: effect.offset?.y || 0,
                    blur: effect.radius || 0,
                    color: this.rgbaToHex(effect.color)
                };
            }
        }
        return null;
    }

    /**
     * Extract tokens from Figma document nodes
     * @private
     */
    extractFromNodes(nodes, tokens) {
        nodes.forEach(node => {
            // Look for frames/pages named "Design Tokens", "Colors", "Typography", etc.
            const nodeName = (node.name || '').toLowerCase();

            if (nodeName.includes('color') || nodeName.includes('palette')) {
                this.extractColorsFromNode(node, tokens.colors);
            }

            if (nodeName.includes('typography') || nodeName.includes('text')) {
                this.extractTypographyFromNode(node, tokens.typography);
            }

            if (nodeName.includes('spacing') || nodeName.includes('grid')) {
                this.extractSpacingFromNode(node, tokens.spacing);
            }

            // Recursively process children
            if (node.children) {
                this.extractFromNodes(node.children, tokens);
            }
        });
    }

    /**
     * Extract colors from node
     * @private
     */
    extractColorsFromNode(node, colorsObj) {
        if (node.fills && node.fills[0]?.type === 'SOLID') {
            const colorName = this.sanitizeTokenName(node.name);
            colorsObj[colorName] = this.rgbaToHex(node.fills[0].color);
        }

        if (node.children) {
            node.children.forEach(child => this.extractColorsFromNode(child, colorsObj));
        }
    }

    /**
     * Extract typography from node
     * @private
     */
    extractTypographyFromNode(node, typographyObj) {
        if (node.style) {
            const styleName = this.sanitizeTokenName(node.name);
            typographyObj[styleName] = {
                fontFamily: node.style.fontFamily || 'inherit',
                fontSize: `${node.style.fontSize}px` || '16px',
                fontWeight: node.style.fontWeight || 400,
                lineHeight: node.style.lineHeightPx ? `${node.style.lineHeightPx}px` : '1.5'
            };
        }

        if (node.children) {
            node.children.forEach(child => this.extractTypographyFromNode(child, typographyObj));
        }
    }

    /**
     * Extract spacing from node
     * @private
     */
    extractSpacingFromNode(node, spacingObj) {
        // Look for nodes with specific spacing values
        if (node.name && /^\d+/.test(node.name)) {
            const spacingName = this.sanitizeTokenName(node.name);
            spacingObj[spacingName] = `${node.absoluteBoundingBox?.width || 16}px`;
        }
    }

    /**
     * Extract from components
     * @private
     */
    extractFromComponents(components, tokens) {
        Object.values(components).forEach(component => {
            const name = (component.name || '').toLowerCase();

            // Extract button styles
            if (name.includes('button')) {
                if (component.cornerRadius) {
                    tokens.borderRadius.button = `${component.cornerRadius}px`;
                }
            }

            // Extract card styles
            if (name.includes('card')) {
                if (component.cornerRadius) {
                    tokens.borderRadius.card = `${component.cornerRadius}px`;
                }
            }
        });
    }

    /**
     * Transform Figma design tokens to application theme format
     * @private
     */
    transformToTheme(tokens, options = {}) {
        const theme = {};

        // Map colors
        theme.primaryColor = this.findColorByName(tokens.colors, ['primary', 'brand', 'main']) || '#0f172a';
        theme.secondaryColor = this.findColorByName(tokens.colors, ['secondary', 'accent']) || '#64748b';
        theme.backgroundColor = this.findColorByName(tokens.colors, ['background', 'bg', 'surface']) || '#ffffff';
        theme.textColor = this.findColorByName(tokens.colors, ['text', 'foreground', 'fg']) || '#0f172a';
        theme.successColor = this.findColorByName(tokens.colors, ['success', 'green']) || '#10b981';
        theme.warningColor = this.findColorByName(tokens.colors, ['warning', 'yellow', 'amber']) || '#f59e0b';
        theme.errorColor = this.findColorByName(tokens.colors, ['error', 'danger', 'red']) || '#ef4444';
        theme.borderColor = this.findColorByName(tokens.colors, ['border', 'divider']) || '#e2e8f0';

        // Map typography
        const headingStyle = this.findTypographyByName(tokens.typography, ['heading', 'h1', 'title']);
        const bodyStyle = this.findTypographyByName(tokens.typography, ['body', 'paragraph', 'text']);

        if (headingStyle) {
            theme.headingFont = headingStyle.fontFamily || "'Outfit', sans-serif";
            theme.headingWeight = headingStyle.fontWeight || '700';
        }

        if (bodyStyle) {
            theme.bodyFont = bodyStyle.fontFamily || "'Inter', sans-serif";
            theme.fontSize = bodyStyle.fontSize || '16px';
            theme.bodyWeight = bodyStyle.fontWeight || '400';
            theme.lineHeight = bodyStyle.lineHeight || '1.6';
            theme.letterSpacing = bodyStyle.letterSpacing || 'normal';
        }

        // Map border radius
        const borderRadius = Object.values(tokens.borderRadius)[0] || '12px';
        theme.borderRadius = borderRadius;

        // Map shadows
        const shadow = Object.values(tokens.shadows)[0];
        if (shadow) {
            theme.shadowColor = shadow.color || 'rgba(0, 0, 0, 0.1)';
        }

        // Apply custom overrides from options
        if (options.overrides) {
            Object.assign(theme, options.overrides);
        }

        return theme;
    }

    /**
     * Find color by name patterns
     * @private
     */
    findColorByName(colors, patterns) {
        for (const pattern of patterns) {
            for (const [name, value] of Object.entries(colors)) {
                if (name.toLowerCase().includes(pattern)) {
                    return value;
                }
            }
        }
        return null;
    }

    /**
     * Find typography by name patterns
     * @private
     */
    findTypographyByName(typography, patterns) {
        for (const pattern of patterns) {
            for (const [name, value] of Object.entries(typography)) {
                if (name.toLowerCase().includes(pattern)) {
                    return value;
                }
            }
        }
        return null;
    }

    /**
     * Convert Figma RGBA to hex
     * @private
     */
    rgbaToHex(color) {
        if (!color) return '#000000';

        const r = Math.round((color.r || 0) * 255);
        const g = Math.round((color.g || 0) * 255);
        const b = Math.round((color.b || 0) * 255);
        const a = color.a !== undefined ? color.a : 1;

        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

        // Include alpha if not fully opaque
        if (a < 1) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            return `${hex}${alphaHex}`;
        }

        return hex;
    }

    /**
     * Sanitize token name for use as key
     * @private
     */
    sanitizeTokenName(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Process fonts for web loading
     * @private
     */
    async processFonts(theme) {
        const fonts = [];
        const instructions = [];

        try {
            // Process heading font
            if (theme.headingFont) {
                const headingFontConfig = await fontLoader.processFigmaFont(theme.headingFont);
                fonts.push({
                    name: 'Heading Font',
                    original: theme.headingFont,
                    processed: headingFontConfig.fontFamily,
                    config: headingFontConfig
                });

                // Update theme with processed font
                theme.headingFont = headingFontConfig.fontFamily;

                // Add instructions
                instructions.push({
                    font: 'Heading Font',
                    ...fontLoader.getFontInstructions(headingFontConfig)
                });
            }

            // Process body font
            if (theme.bodyFont) {
                const bodyFontConfig = await fontLoader.processFigmaFont(theme.bodyFont);
                fonts.push({
                    name: 'Body Font',
                    original: theme.bodyFont,
                    processed: bodyFontConfig.fontFamily,
                    config: bodyFontConfig
                });

                // Update theme with processed font
                theme.bodyFont = bodyFontConfig.fontFamily;

                // Add instructions
                instructions.push({
                    font: 'Body Font',
                    ...fontLoader.getFontInstructions(bodyFontConfig)
                });
            }

            // Process general font family
            if (theme.fontFamily) {
                const fontConfig = await fontLoader.processFigmaFont(theme.fontFamily);
                fonts.push({
                    name: 'Font Family',
                    original: theme.fontFamily,
                    processed: fontConfig.fontFamily,
                    config: fontConfig
                });

                // Update theme with processed font
                theme.fontFamily = fontConfig.fontFamily;

                // Add instructions
                instructions.push({
                    font: 'Font Family',
                    ...fontLoader.getFontInstructions(fontConfig)
                });
            }

            return { fonts, instructions };

        } catch (error) {
            logger.error('[FigmaImporter] Font processing failed', {
                error: error.message
            });
            return { fonts, instructions };
        }
    }

    /**
     * Validate Figma access token
     * @static
     */
    static async validateToken(accessToken) {
        try {
            const response = await axios.get('https://api.figma.com/v1/me', {
                headers: { 'X-Figma-Token': accessToken }
            });
            return { valid: true, user: response.data };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * Extract file key from Figma URL
     * @static
     */
    static extractFileKeyFromUrl(url) {
        // Figma URL format: https://www.figma.com/file/{fileKey}/{fileName}
        const match = url.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }
}

module.exports = FigmaThemeImporter;
