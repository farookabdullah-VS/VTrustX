'use strict';

/**
 * RSS / Atom Feed Connector
 *
 * Monitors one or more RSS/Atom feed URLs for new items.
 * Zero external dependencies — uses Node's built-in https/http modules
 * plus a lightweight inline XML extractor.
 *
 * Config shape (stored in sl_sources.credentials):
 *   {
 *     feedUrls:   string[]  – one or more RSS/Atom feed URLs
 *   }
 *
 * Config shape (stored in sl_sources.config / searchParams):
 *   {
 *     keywords:   string[]  – optional; only keep items containing these terms
 *     maxItems:   number    – max items per feed per run (default 50)
 *   }
 */

const BasePlatformConnector = require('./BasePlatformConnector');
const https = require('https');
const http  = require('http');
const logger = require('../../infrastructure/logger');

// ---------------------------------------------------------------------------
// Lightweight inline XML helpers (no external dependency)
// ---------------------------------------------------------------------------

/**
 * Extract all occurrences of <tagName>…</tagName> from an XML string.
 * Works for simple leaf nodes (no nested tags with the same name).
 */
function extractAll(xml, tagName) {
    const results = [];
    const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
    let m;
    while ((m = re.exec(xml)) !== null) {
        results.push(m[1].trim());
    }
    return results;
}

/** Extract first occurrence, or '' */
function extractFirst(xml, tagName) {
    return extractAll(xml, tagName)[0] || '';
}

/** Strip CDATA wrappers and HTML/XML tags from a string */
function stripMarkup(str) {
    return str
        .replace(/<!\[CDATA\[([\s\S]*?)]]>/gi, '$1') // unwrap CDATA
        .replace(/<[^>]+>/g, ' ')                     // strip HTML tags
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&apos;/gi, "'")
        .replace(/&#\d+;/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Very light RSS/Atom XML split-into-items parser.
 * Handles <item> (RSS 2.0) and <entry> (Atom 1.0) elements.
 */
function parseItems(xml) {
    // Try <item> (RSS) first, fall back to <entry> (Atom)
    const itemTag = xml.includes('<item') ? 'item' : 'entry';
    const blocks = extractAll(xml, itemTag);

    return blocks.map(block => {
        // title
        const title = stripMarkup(extractFirst(block, 'title')) ||
                      stripMarkup(extractFirst(block, 'summary'));

        // link — RSS uses <link>URL</link> or <link href="URL"/>; Atom uses <link href="">
        let link = extractFirst(block, 'link');
        if (!link || link.length > 500) {
            const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["']/i);
            link = hrefMatch ? hrefMatch[1] : '';
        }
        link = stripMarkup(link).trim();

        // description / content
        const description = stripMarkup(
            extractFirst(block, 'description') ||
            extractFirst(block, 'content:encoded') ||
            extractFirst(block, 'content') ||
            extractFirst(block, 'summary')
        );

        // author
        const author = stripMarkup(
            extractFirst(block, 'author') ||
            extractFirst(block, 'dc:creator') ||
            extractFirst(block, 'name')          // <author><name>…</name></author>
        );

        // guid / id
        const guid = stripMarkup(
            extractFirst(block, 'guid') ||
            extractFirst(block, 'id')
        ) || link;

        // published date
        const pubDateRaw =
            extractFirst(block, 'pubDate') ||
            extractFirst(block, 'published') ||
            extractFirst(block, 'updated') ||
            extractFirst(block, 'dc:date');
        const pubDate = pubDateRaw ? new Date(pubDateRaw) : new Date();

        // categories / tags
        const categories = extractAll(block, 'category')
            .map(c => stripMarkup(c))
            .filter(Boolean);

        return { title, link, description, author, guid, pubDate, categories };
    });
}

/**
 * Fetch a URL and return the raw response body as a string.
 * Follows a single redirect (301/302).
 */
function fetchUrl(url, timeout = 15000) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;

        const req = lib.get(url, {
            headers: {
                'User-Agent': 'VTrustX-RSS-Monitor/1.0',
                'Accept': 'application/rss+xml, application/atom+xml, text/xml, application/xml, */*'
            },
            timeout
        }, (res) => {
            // Follow one redirect
            if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
                fetchUrl(res.headers.location, timeout).then(resolve).catch(reject);
                res.resume();
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`HTTP ${res.statusCode} for ${url}`));
                res.resume();
                return;
            }

            let body = '';
            res.setEncoding('utf8');
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => resolve(body));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
        req.on('error', reject);
    });
}

// ---------------------------------------------------------------------------
// RSSConnector class
// ---------------------------------------------------------------------------

class RSSConnector extends BasePlatformConnector {
    constructor(config) {
        super({ ...config, platform: 'rss' });

        // feedUrls can live in credentials or config
        const feedUrls = config.credentials?.feedUrls ||
                         config.config?.feedUrls ||
                         config.searchParams?.feedUrls || [];

        this.feedUrls  = Array.isArray(feedUrls) ? feedUrls : [feedUrls].filter(Boolean);
        this.keywords  = (config.searchParams?.keywords || config.config?.keywords || [])
                            .map(k => k.toLowerCase());
        this.maxItems  = parseInt(config.config?.maxItems || config.searchParams?.maxItems) || 50;
    }

    // -----------------------------------------------------------------------
    // testConnection
    // -----------------------------------------------------------------------
    async testConnection() {
        if (this.feedUrls.length === 0) {
            return { success: false, message: 'No feed URLs configured' };
        }

        const url = this.feedUrls[0];
        try {
            const body = await fetchUrl(url, 10000);
            if (!body.includes('<rss') && !body.includes('<feed') && !body.includes('<channel')) {
                return { success: false, message: `${url} does not appear to be an RSS/Atom feed` };
            }
            const items = parseItems(body);
            return {
                success: true,
                message: `Connected — found ${items.length} items in first feed`,
                platform: 'rss',
                feedCount: this.feedUrls.length
            };
        } catch (err) {
            return { success: false, message: err.message };
        }
    }

    // -----------------------------------------------------------------------
    // fetchMentions
    // -----------------------------------------------------------------------
    /**
     * @param {object} options
     * @param {Date}   [options.since]  – only return items published after this date
     * @param {number} [options.limit]
     */
    async fetchMentions(options = {}) {
        const since    = options.since ? new Date(options.since) : null;
        const limit    = Math.min(options.limit || this.maxItems, 200);
        const mentions = [];

        for (const url of this.feedUrls) {
            try {
                const body  = await fetchUrl(url);
                const items = parseItems(body);

                for (const item of items) {
                    if (mentions.length >= limit) break;

                    // Date filter
                    if (since && item.pubDate <= since) continue;

                    // Keyword filter (if configured)
                    if (this.keywords.length > 0) {
                        const text = `${item.title} ${item.description}`.toLowerCase();
                        const match = this.keywords.some(kw => text.includes(kw));
                        if (!match) continue;
                    }

                    mentions.push(this._normalize(item, url));
                }
            } catch (err) {
                logger.warn('[RSSConnector] Failed to fetch feed', { url, error: err.message });
                // Continue with remaining feeds rather than failing the whole run
            }
        }

        return mentions;
    }

    // -----------------------------------------------------------------------
    // Normalize an RSS item to the standard mention shape
    // -----------------------------------------------------------------------
    _normalize(item, feedUrl) {
        const content = item.description
            ? `${item.title}: ${item.description}`.substring(0, 2000)
            : item.title;

        // Derive a best-effort author handle from the author string or feed domain
        const feedDomain = (() => {
            try { return new URL(feedUrl).hostname.replace('www.', ''); } catch { return 'rss'; }
        })();

        const authorName   = item.author || feedDomain;
        const authorHandle = authorName.toLowerCase().replace(/[^a-z0-9_.]/g, '');

        return {
            platform:        'rss',
            external_id:     item.guid || item.link,
            url:             item.link || feedUrl,
            content,
            title:           item.title,
            author_name:     authorName,
            author_handle:   authorHandle || feedDomain,
            author_verified: false,
            author_followers: 0,
            published_at:    item.pubDate,
            likes_count:     0,
            comments_count:  0,
            shares_count:    0,
            engagement_score: 0,
            sentiment_score:  null,
            media_type:      'text',
            media_urls:      [],
            topics:          item.categories.slice(0, 10),
            language:        null,
            source_url:      feedUrl,
            raw_data:        { guid: item.guid, categories: item.categories }
        };
    }

    // -----------------------------------------------------------------------
    // getSupportedPlatform (static helper used by ConnectorFactory)
    // -----------------------------------------------------------------------
    static getSupportedPlatform() {
        return 'rss';
    }
}

module.exports = RSSConnector;
