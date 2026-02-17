/**
 * Facebook Connector
 *
 * Fetches posts and comments from a Facebook Page via the Meta Graph API.
 *
 * Required credentials:
 *   page_access_token  – Page-level access token (long-lived recommended)
 *   page_id            – Numeric or named Facebook Page ID
 *
 * Rate limit: ~200 calls/hour per token.
 */

'use strict';

const axios = require('axios');
const logger = require('../../infrastructure/logger');

const GRAPH_VERSION = 'v19.0';
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_POSTS = 25;
const MAX_COMMENTS_PER_POST = 100;

class FacebookConnector {
    constructor(credentials = {}, config = {}) {
        if (!credentials.page_access_token) throw new Error('Facebook: page_access_token is required');
        if (!credentials.page_id) throw new Error('Facebook: page_id is required');

        this.token = credentials.page_access_token;
        this.pageId = credentials.page_id;
        this.config = config;
    }

    /**
     * Verify the token and page are accessible.
     * @returns {{ ok, pageId, pageName, followers }}
     */
    async testConnection() {
        const data = await this._get(`/${this.pageId}`, { fields: 'id,name,fan_count' });
        return {
            ok: true,
            pageId: data.id,
            pageName: data.name,
            followers: data.fan_count || 0
        };
    }

    /**
     * Fetch posts and comments from the Page feed.
     *
     * @param {object}   opts
     * @param {Date}     opts.since    – Fetch only content published after this date
     * @param {string[]} opts.keywords – Filter to items containing any keyword (empty = no filter)
     * @param {number}   opts.limit    – Max mentions to return
     * @returns {NormalizedMention[]}
     */
    async fetchMentions({ since = null, keywords = [], limit = 200 }) {
        const sinceTs = since ? Math.floor(new Date(since).getTime() / 1000) : undefined;
        const mentions = [];

        const posts = await this._fetchFeed(sinceTs);

        for (const post of posts) {
            if (mentions.length >= limit) break;

            const postMention = this._normalizePost(post);
            if (this._matches(postMention.content, keywords)) {
                mentions.push(postMention);
            }

            const commentsData = post.comments && post.comments.data ? post.comments.data : [];
            for (const comment of commentsData) {
                if (mentions.length >= limit) break;
                const cm = this._normalizeComment(comment, post);
                if (this._matches(cm.content, keywords)) mentions.push(cm);
            }
        }

        logger.info('[FacebookConnector] Fetch complete', {
            pageId: this.pageId,
            postsScanned: posts.length,
            mentionsFound: mentions.length
        });
        return mentions;
    }

    // -----------------------------------------------------------------------

    async _fetchFeed(sinceTs) {
        const params = {
            fields: [
                'id', 'message', 'story', 'created_time', 'permalink_url',
                'from', 'full_picture',
                `comments.limit(${MAX_COMMENTS_PER_POST}){id,message,from,created_time,like_count}`,
                'likes.summary(true)',
                'shares'
            ].join(','),
            limit: MAX_POSTS
        };
        if (sinceTs) params.since = sinceTs;

        const data = await this._get(`/${this.pageId}/feed`, params);
        return (data && data.data) ? data.data : [];
    }

    _normalizePost(post) {
        return {
            external_id: post.id,
            post_type: 'post',
            content: post.message || post.story || '',
            content_url: post.permalink_url || `https://facebook.com/${post.id}`,
            media_urls: post.full_picture ? [post.full_picture] : [],
            author_name: post.from ? post.from.name : 'Facebook Page',
            author_handle: post.from ? post.from.id : this.pageId,
            author_avatar_url: post.from
                ? `https://graph.facebook.com/${post.from.id}/picture?type=square`
                : null,
            author_followers: 0,
            author_verified: false,
            likes: post.likes && post.likes.summary ? post.likes.summary.total_count : 0,
            shares: post.shares ? post.shares.count : 0,
            comments: post.comments && post.comments.summary
                ? post.comments.summary.total_count : 0,
            reach: 0,
            published_at: new Date(post.created_time),
            raw_data: post
        };
    }

    _normalizeComment(comment, parentPost) {
        return {
            external_id: comment.id,
            post_type: 'comment',
            content: comment.message || '',
            content_url: `https://facebook.com/${comment.id}`,
            media_urls: [],
            author_name: comment.from ? comment.from.name : 'Unknown',
            author_handle: comment.from ? comment.from.id : null,
            author_avatar_url: comment.from
                ? `https://graph.facebook.com/${comment.from.id}/picture?type=square`
                : null,
            author_followers: 0,
            author_verified: false,
            likes: comment.like_count || 0,
            shares: 0,
            comments: 0,
            reach: 0,
            published_at: new Date(comment.created_time),
            parent_external_id: parentPost.id,
            raw_data: comment
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

module.exports = FacebookConnector;
