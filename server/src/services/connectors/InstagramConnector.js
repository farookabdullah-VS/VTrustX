/**
 * Instagram Connector
 *
 * Fetches media and comments from an Instagram Business/Creator account
 * using the Meta (Instagram) Graph API.
 *
 * Required credentials:
 *   access_token          – User access token with instagram_basic,
 *                           instagram_manage_comments scopes
 *   instagram_account_id  – Instagram Business Account ID (numeric string)
 *
 * Rate limit: ~200 calls/hour per token (same as Facebook Graph API).
 */

'use strict';

const axios = require('axios');
const logger = require('../../infrastructure/logger');

const GRAPH_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_MEDIA = 30;
const MAX_COMMENTS_PER_MEDIA = 50;

class InstagramConnector {
    constructor(credentials = {}, config = {}) {
        if (!credentials.access_token) throw new Error('Instagram: access_token is required');
        if (!credentials.instagram_account_id) throw new Error('Instagram: instagram_account_id is required');

        this.token = credentials.access_token;
        this.igUserId = credentials.instagram_account_id;
        this.config = config;
    }

    /**
     * Verify the token and account are accessible.
     * @returns {{ ok, accountId, username, followers }}
     */
    async testConnection() {
        const data = await this._get(`/${this.igUserId}`, {
            fields: 'id,name,username,followers_count'
        });
        return {
            ok: true,
            accountId: data.id,
            username: data.username,
            followers: data.followers_count || 0
        };
    }

    /**
     * Fetch recent media and their comments.
     *
     * @param {object}   opts
     * @param {Date}     opts.since    – Only fetch media published after this date
     * @param {string[]} opts.keywords – Filter content to items containing any keyword
     * @param {number}   opts.limit    – Max mentions to return
     * @returns {NormalizedMention[]}
     */
    async fetchMentions({ since = null, keywords = [], limit = 200 }) {
        const sinceDate = since ? new Date(since) : null;
        const mentions = [];

        // 1. Fetch recent media
        const mediaItems = await this._fetchMedia();

        for (const media of mediaItems) {
            if (mentions.length >= limit) break;

            // Skip if older than since
            const mediaDate = new Date(media.timestamp);
            if (sinceDate && mediaDate < sinceDate) continue;

            // Add the media post itself
            const mediaMention = this._normalizeMedia(media);
            if (this._matches(mediaMention.content, keywords)) {
                mentions.push(mediaMention);
            }

            // 2. Fetch comments on each media item
            const comments = await this._fetchComments(media.id);
            for (const comment of comments) {
                if (mentions.length >= limit) break;
                const commentDate = new Date(comment.timestamp);
                if (sinceDate && commentDate < sinceDate) continue;

                const cm = this._normalizeComment(comment, media);
                if (this._matches(cm.content, keywords)) mentions.push(cm);
            }
        }

        // 3. Fetch media where the account is tagged (mentions by others)
        const taggedMedia = await this._fetchTaggedMedia(sinceDate);
        for (const tagged of taggedMedia) {
            if (mentions.length >= limit) break;
            const mention = this._normalizeTaggedMedia(tagged);
            if (this._matches(mention.content, keywords)) mentions.push(mention);
        }

        logger.info('[InstagramConnector] Fetch complete', {
            igUserId: this.igUserId,
            mediaScanned: mediaItems.length,
            mentionsFound: mentions.length
        });
        return mentions;
    }

    // -----------------------------------------------------------------------

    async _fetchMedia() {
        const data = await this._get(`/${this.igUserId}/media`, {
            fields: [
                'id', 'caption', 'timestamp', 'media_type',
                'like_count', 'comments_count', 'permalink', 'media_url',
                'thumbnail_url', 'username'
            ].join(','),
            limit: MAX_MEDIA
        });
        return (data && data.data) ? data.data : [];
    }

    async _fetchComments(mediaId) {
        try {
            const data = await this._get(`/${mediaId}/comments`, {
                fields: 'id,text,username,timestamp,like_count,replies{id,text,username,timestamp,like_count}',
                limit: MAX_COMMENTS_PER_MEDIA
            });
            const comments = (data && data.data) ? data.data : [];
            // Flatten replies
            const all = [];
            for (const c of comments) {
                all.push(c);
                if (c.replies && c.replies.data) {
                    all.push(...c.replies.data.map(r => ({ ...r, parent_comment_id: c.id })));
                }
            }
            return all;
        } catch (err) {
            // Comments may be disabled; treat as empty
            logger.debug('[InstagramConnector] Comments fetch skipped', {
                mediaId,
                reason: err.message
            });
            return [];
        }
    }

    async _fetchTaggedMedia(sinceDate) {
        try {
            const data = await this._get(`/${this.igUserId}/tags`, {
                fields: 'id,caption,timestamp,media_type,like_count,comments_count,permalink,username',
                limit: 20
            });
            const items = (data && data.data) ? data.data : [];
            return sinceDate
                ? items.filter(m => new Date(m.timestamp) >= sinceDate)
                : items;
        } catch (err) {
            logger.debug('[InstagramConnector] Tags fetch skipped', { reason: err.message });
            return [];
        }
    }

    _normalizeMedia(media) {
        return {
            external_id: media.id,
            post_type: 'post',
            content: media.caption || '',
            content_url: media.permalink || `https://instagram.com/p/${media.id}`,
            media_urls: [media.media_url || media.thumbnail_url].filter(Boolean),
            author_name: media.username || 'Instagram User',
            author_handle: media.username || null,
            author_avatar_url: null,
            author_followers: 0,
            author_verified: false,
            likes: media.like_count || 0,
            shares: 0,
            comments: media.comments_count || 0,
            reach: 0,
            published_at: new Date(media.timestamp),
            raw_data: media
        };
    }

    _normalizeComment(comment, parentMedia) {
        return {
            external_id: comment.id,
            post_type: 'comment',
            content: comment.text || '',
            content_url: parentMedia.permalink
                ? `${parentMedia.permalink}c/${comment.id}/`
                : null,
            media_urls: [],
            author_name: comment.username || 'Unknown',
            author_handle: comment.username || null,
            author_avatar_url: null,
            author_followers: 0,
            author_verified: false,
            likes: comment.like_count || 0,
            shares: 0,
            comments: 0,
            reach: 0,
            published_at: new Date(comment.timestamp),
            parent_external_id: parentMedia.id,
            raw_data: comment
        };
    }

    _normalizeTaggedMedia(media) {
        return {
            external_id: `tagged_${media.id}`,
            post_type: 'mention',
            content: media.caption || '',
            content_url: media.permalink || null,
            media_urls: [],
            author_name: media.username || 'Unknown',
            author_handle: media.username || null,
            author_avatar_url: null,
            author_followers: 0,
            author_verified: false,
            likes: media.like_count || 0,
            shares: 0,
            comments: media.comments_count || 0,
            reach: 0,
            published_at: new Date(media.timestamp),
            raw_data: media
        };
    }

    _matches(text, keywords) {
        if (!keywords || keywords.length === 0) return true;
        if (!text) return false;
        const lower = text.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    }

    async _get(path, params = {}) {
        const response = await axios.get(`${BASE_URL}${path}`, {
            params: { ...params, access_token: this.token },
            timeout: 15000
        });
        return response.data;
    }
}

module.exports = InstagramConnector;
