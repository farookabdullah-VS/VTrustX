const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

/**
 * Template Service
 * Handles template rendering with text and media placeholders
 * Supports channel-specific formatting (email HTML, SMS text, WhatsApp)
 */
class TemplateService {
    /**
     * Render template with context variables and media assets
     * @param {string} template - Template text with placeholders
     * @param {object} context - Variables to replace (e.g., {name: 'John', link: 'https://...'})
     * @param {array} mediaAssets - Array of media asset objects
     * @param {string} channel - Target channel: 'email', 'sms', 'whatsapp'
     * @param {object} options - Additional options (htmlTemplate, baseUrl)
     * @returns {object} - Rendered content { text, html, attachments, mediaUrls }
     */
    async renderTemplate(template, context = {}, mediaAssets = [], channel = 'email', options = {}) {
        try {
            let renderedText = template;
            let renderedHtml = options.htmlTemplate || null;
            const attachments = [];
            const mediaUrls = [];

            // 1. Replace text placeholders: {{name}}, {{link}}, etc.
            renderedText = this.replaceTextPlaceholders(renderedText, context);
            if (renderedHtml) {
                renderedHtml = this.replaceTextPlaceholders(renderedHtml, context);
            }

            // 2. Process media placeholders: {{image:1}}, {{video:2}}, etc.
            const mediaResult = await this.processMediaPlaceholders(
                renderedText,
                renderedHtml,
                mediaAssets,
                channel,
                options
            );

            renderedText = mediaResult.text;
            renderedHtml = mediaResult.html;
            attachments.push(...mediaResult.attachments);
            mediaUrls.push(...mediaResult.mediaUrls);

            return {
                text: renderedText,
                html: renderedHtml,
                attachments,
                mediaUrls,
                channel
            };
        } catch (error) {
            logger.error('[TemplateService] Failed to render template', { error: error.message, channel });
            throw error;
        }
    }

    /**
     * Replace text placeholders in template
     * Supports: {{name}}, {{link}}, {{email}}, {{phone}}, etc.
     */
    replaceTextPlaceholders(template, context) {
        if (!template) return template;

        let result = template;

        // Replace all {{variable}} placeholders
        Object.keys(context).forEach(key => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            const value = context[key] || '';
            result = result.replace(regex, value);
        });

        // Handle remaining unreplaced placeholders (set to empty)
        // BUT preserve media placeholders like {{image:123}}, {{video:456}}, etc.
        result = result.replace(/{{(?!(?:image|video|document|audio):)\w+}}/g, '');

        return result;
    }

    /**
     * Process media placeholders and return channel-specific format
     * Supports: {{image:1}}, {{video:2}}, {{document:3}}, {{audio:4}}
     */
    async processMediaPlaceholders(text, html, mediaAssets, channel, options) {
        const attachments = [];
        const mediaUrls = [];
        let processedText = text;
        let processedHtml = html;

        // Build media map by ID
        const mediaMap = {};
        mediaAssets.forEach(asset => {
            mediaMap[asset.id] = asset;
        });

        // Find all media placeholders
        const mediaRegex = /{{(image|video|document|audio):(\d+)}}/g;
        let match;

        while ((match = mediaRegex.exec(text)) !== null) {
            const [fullMatch, mediaType, mediaId] = match;
            const asset = mediaMap[parseInt(mediaId)];

            if (!asset) {
                logger.warn('[TemplateService] Media asset not found', { mediaId });
                continue;
            }

            // Get signed URL for asset
            const assetUrl = asset.cdn_url || asset.storage_path;

            if (channel === 'email') {
                // Email: Inline images as CID, attachments for others
                if (mediaType === 'image') {
                    const cid = `image${mediaId}@rayix.com`;

                    // Add to attachments for inline embedding
                    attachments.push({
                        filename: asset.original_name,
                        path: assetUrl,
                        cid: cid,
                        contentType: asset.mimetype
                    });

                    // Replace in HTML with <img> tag
                    if (processedHtml) {
                        const imgTag = `<img src="cid:${cid}" alt="${asset.original_name}" style="max-width: 100%; height: auto;" />`;
                        processedHtml = processedHtml.replace(fullMatch, imgTag);
                    }

                    // Replace in text with link
                    processedText = processedText.replace(fullMatch, `[Image: ${asset.original_name}]`);
                } else {
                    // Other media types as attachments
                    attachments.push({
                        filename: asset.original_name,
                        path: assetUrl,
                        contentType: asset.mimetype
                    });

                    // Replace in text/html with attachment notice
                    const attachmentNotice = `[Attachment: ${asset.original_name}]`;
                    processedText = processedText.replace(fullMatch, attachmentNotice);
                    if (processedHtml) {
                        processedHtml = processedHtml.replace(fullMatch, `<p>${attachmentNotice}</p>`);
                    }
                }
            } else if (channel === 'whatsapp') {
                // WhatsApp: Send media as separate message
                if (['image', 'video', 'document', 'audio'].includes(mediaType)) {
                    mediaUrls.push({
                        type: mediaType,
                        url: assetUrl,
                        filename: asset.original_name,
                        mimetype: asset.mimetype
                    });

                    // Replace in text with notice
                    processedText = processedText.replace(fullMatch, `[${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}: ${asset.original_name}]`);
                }
            } else if (channel === 'sms') {
                // SMS: No media support, replace with link or remove
                processedText = processedText.replace(fullMatch, assetUrl);
            }
        }

        return {
            text: processedText,
            html: processedHtml,
            attachments,
            mediaUrls
        };
    }

    /**
     * Get media asset by ID
     */
    async getMediaAsset(assetId, tenantId) {
        try {
            const result = await query(
                'SELECT * FROM media_assets WHERE id = $1 AND tenant_id = $2',
                [assetId, tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[TemplateService] Failed to get media asset', { error: error.message, assetId });
            throw error;
        }
    }

    /**
     * Get multiple media assets by IDs
     */
    async getMediaAssets(assetIds, tenantId) {
        try {
            if (!assetIds || assetIds.length === 0) {
                return [];
            }

            const result = await query(
                'SELECT * FROM media_assets WHERE id = ANY($1) AND tenant_id = $2',
                [assetIds, tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[TemplateService] Failed to get media assets', { error: error.message });
            throw error;
        }
    }

    /**
     * Extract media IDs from template
     */
    extractMediaIds(template) {
        const mediaRegex = /{{(?:image|video|document|audio):(\d+)}}/g;
        const mediaIds = [];
        let match;

        while ((match = mediaRegex.exec(template)) !== null) {
            mediaIds.push(parseInt(match[1]));
        }

        return [...new Set(mediaIds)]; // Remove duplicates
    }

    /**
     * Validate template syntax
     */
    validateTemplate(template) {
        const errors = [];

        // Check for unclosed placeholders
        const openBraces = (template.match(/{{/g) || []).length;
        const closeBraces = (template.match(/}}/g) || []).length;

        if (openBraces !== closeBraces) {
            errors.push('Unclosed placeholder: {{ and }} count mismatch');
        }

        // Check for invalid placeholder syntax
        const invalidPlaceholders = template.match(/{{[^}]*$/g);
        if (invalidPlaceholders) {
            errors.push(`Invalid placeholder syntax: ${invalidPlaceholders.join(', ')}`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get available placeholder variables
     */
    getAvailablePlaceholders() {
        return {
            text: [
                { name: 'name', description: 'Recipient name' },
                { name: 'email', description: 'Recipient email' },
                { name: 'phone', description: 'Recipient phone' },
                { name: 'link', description: 'Survey/form link' },
                { name: 'company', description: 'Company name' },
                { name: 'custom1', description: 'Custom field 1' },
                { name: 'custom2', description: 'Custom field 2' },
                { name: 'custom3', description: 'Custom field 3' }
            ],
            media: [
                { name: 'image:ID', description: 'Inline image (use asset ID)' },
                { name: 'video:ID', description: 'Video attachment (use asset ID)' },
                { name: 'document:ID', description: 'Document attachment (use asset ID)' },
                { name: 'audio:ID', description: 'Audio attachment (use asset ID)' }
            ]
        };
    }
}

// Export singleton instance
const templateService = new TemplateService();
module.exports = templateService;
