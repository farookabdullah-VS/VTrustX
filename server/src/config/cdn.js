/**
 * CDN Configuration
 * Manages static asset serving through CDN
 */

const logger = require('../infrastructure/logger');

class CDNConfig {
    constructor() {
        this.enabled = process.env.CDN_ENABLED === 'true';
        this.provider = process.env.CDN_PROVIDER || 'cloudflare'; // cloudflare, cloudfront, custom
        this.baseUrl = process.env.CDN_BASE_URL || '';
        this.assetPath = process.env.CDN_ASSET_PATH || '/assets';

        // Cache control settings (in seconds)
        this.cacheControl = {
            images: 31536000, // 1 year
            fonts: 31536000, // 1 year
            scripts: 31536000, // 1 year (with versioning)
            styles: 31536000, // 1 year (with versioning)
            documents: 86400, // 1 day
            default: 3600 // 1 hour
        };

        if (this.enabled && !this.baseUrl) {
            logger.warn('[CDN] CDN is enabled but CDN_BASE_URL is not configured');
        }
    }

    /**
     * Get CDN URL for an asset
     */
    getAssetUrl(assetPath) {
        if (!this.enabled || !this.baseUrl) {
            return assetPath; // Return local path
        }

        // Remove leading slash if present
        const cleanPath = assetPath.startsWith('/') ? assetPath.substring(1) : assetPath;

        // Construct CDN URL
        return `${this.baseUrl}/${cleanPath}`;
    }

    /**
     * Get cache control header for file type
     */
    getCacheControl(filePath) {
        const ext = filePath.split('.').pop().toLowerCase();

        // Image files
        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) {
            return `public, max-age=${this.cacheControl.images}, immutable`;
        }

        // Font files
        if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext)) {
            return `public, max-age=${this.cacheControl.fonts}, immutable`;
        }

        // JavaScript files
        if (['js', 'mjs'].includes(ext)) {
            return `public, max-age=${this.cacheControl.scripts}, immutable`;
        }

        // CSS files
        if (['css'].includes(ext)) {
            return `public, max-age=${this.cacheControl.styles}, immutable`;
        }

        // Document files
        if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
            return `public, max-age=${this.cacheControl.documents}`;
        }

        // Default
        return `public, max-age=${this.cacheControl.default}`;
    }

    /**
     * Express middleware to add cache control headers
     */
    cacheMiddleware() {
        return (req, res, next) => {
            // Only apply to static assets
            if (req.path.startsWith('/assets') || req.path.startsWith('/static')) {
                const cacheControl = this.getCacheControl(req.path);
                res.setHeader('Cache-Control', cacheControl);

                // Additional headers for CDN optimization
                res.setHeader('X-Content-Type-Options', 'nosniff');

                // ETag support for conditional requests
                res.setHeader('ETag', `"${Date.now()}"`);
            }

            next();
        };
    }

    /**
     * Get CDN configuration for client-side
     */
    getClientConfig() {
        return {
            enabled: this.enabled,
            baseUrl: this.baseUrl,
            assetPath: this.assetPath
        };
    }

    /**
     * Purge CDN cache for specific paths
     */
    async purgeCached(paths) {
        if (!this.enabled) {
            logger.info('[CDN] CDN not enabled, skipping cache purge');
            return { success: true, message: 'CDN not enabled' };
        }

        try {
            switch (this.provider) {
                case 'cloudflare':
                    return await this.purgeCloudflare(paths);
                case 'cloudfront':
                    return await this.purgeCloudFront(paths);
                case 'custom':
                    return await this.purgeCustom(paths);
                default:
                    throw new Error(`Unsupported CDN provider: ${this.provider}`);
            }
        } catch (error) {
            logger.error('[CDN] Failed to purge cache', { error: error.message, paths });
            throw error;
        }
    }

    /**
     * Purge Cloudflare cache
     */
    async purgeCloudflare(paths) {
        const zoneId = process.env.CLOUDFLARE_ZONE_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        if (!zoneId || !apiToken) {
            throw new Error('Cloudflare credentials not configured');
        }

        const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    files: paths.map(path => `${this.baseUrl}/${path}`)
                })
            }
        );

        const result = await response.json();

        if (!result.success) {
            throw new Error(`Cloudflare purge failed: ${JSON.stringify(result.errors)}`);
        }

        logger.info('[CDN] Cloudflare cache purged', { paths: paths.length });
        return { success: true, provider: 'cloudflare', paths: paths.length };
    }

    /**
     * Purge CloudFront cache
     */
    async purgeCloudFront(paths) {
        // Requires AWS SDK - implement if using CloudFront
        logger.warn('[CDN] CloudFront cache purge not implemented yet');
        return { success: false, message: 'CloudFront purge not implemented' };
    }

    /**
     * Purge custom CDN cache
     */
    async purgeCustom(paths) {
        const customPurgeUrl = process.env.CDN_PURGE_URL;
        const customApiKey = process.env.CDN_PURGE_API_KEY;

        if (!customPurgeUrl) {
            throw new Error('Custom CDN purge URL not configured');
        }

        const response = await fetch(customPurgeUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${customApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ paths })
        });

        if (!response.ok) {
            throw new Error(`Custom CDN purge failed: ${response.statusText}`);
        }

        logger.info('[CDN] Custom CDN cache purged', { paths: paths.length });
        return { success: true, provider: 'custom', paths: paths.length };
    }
}

// Singleton instance
const cdnConfig = new CDNConfig();

// Log CDN status on startup
if (cdnConfig.enabled) {
    logger.info('[CDN] CDN enabled', {
        provider: cdnConfig.provider,
        baseUrl: cdnConfig.baseUrl
    });
} else {
    logger.info('[CDN] CDN disabled, serving assets locally');
}

module.exports = cdnConfig;
