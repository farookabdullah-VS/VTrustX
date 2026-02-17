/**
 * LinkedIn Connector
 *
 * Fetches organization posts and their comments via the LinkedIn API v2.
 *
 * Required credentials:
 *   access_token     – OAuth 2.0 user token with r_organization_social scope
 *   organization_id  – LinkedIn Organization ID (numeric, e.g. "12345678")
 *
 * Required OAuth scopes:
 *   r_organization_social  – Read company posts and reactions/comments
 *   w_organization_social  – Write responses (optional, for reply feature)
 *
 * Rate limits: LinkedIn enforces per-member and per-app daily quotas.
 * Conservative estimate: 60 reads/hour per token.
 */

'use strict';

const axios = require('axios');
const logger = require('../../infrastructure/logger');

const BASE_URL = 'https://api.linkedin.com/v2';
const MAX_POSTS = 20;
const MAX_COMMENTS_PER_POST = 50;

class LinkedInConnector {
    constructor(credentials = {}, config = {}) {
        if (!credentials.access_token) throw new Error('LinkedIn: access_token is required');
        if (!credentials.organization_id) throw new Error('LinkedIn: organization_id is required');

        this.token = credentials.access_token;
        this.orgId = credentials.organization_id;
        this.orgUrn = `urn:li:organization:${credentials.organization_id}`;
        this.config = config;
    }

    /**
     * Verify the token is valid by fetching the authenticated member profile.
     * @returns {{ ok, name, id }}
     */
    async testConnection() {
        const data = await this._get('/me', {
            projection: '(id,localizedFirstName,localizedLastName)'
        });
        return {
            ok: true,
            id: data.id,
            name: `${data.localizedFirstName} ${data.localizedLastName}`
        };
    }

    /**
     * Fetch organization posts and their comments.
     *
     * @param {object}   opts
     * @param {Date}     opts.since    – Only fetch content published after this date (ms epoch)
     * @param {string[]} opts.keywords – Filter content to items containing any keyword
     * @param {number}   opts.limit    – Max mentions to return
     * @returns {NormalizedMention[]}
     */
    async fetchMentions({ since = null, keywords = [], limit = 100 }) {
        const sinceMs = since ? new Date(since).getTime() : 0;
        const mentions = [];

        // Fetch organization UGC posts
        const posts = await this._fetchOrgPosts();

        for (const post of posts) {
            if (mentions.length >= limit) break;

            const createdAt = post.created ? post.created.time : 0;
            if (createdAt && createdAt < sinceMs) continue;

            const postMention = this._normalizePost(post);
            if (this._matches(postMention.content, keywords)) {
                mentions.push(postMention);
            }

            // Fetch comments on this post
            const comments = await this._fetchPostComments(post.id);
            for (const comment of comments) {
                if (mentions.length >= limit) break;
                const commentCreatedAt = comment.created ? comment.created.time : 0;
                if (commentCreatedAt && commentCreatedAt < sinceMs) continue;

                const cm = this._normalizeComment(comment, post);
                if (this._matches(cm.content, keywords)) mentions.push(cm);
            }
        }

        logger.info('[LinkedInConnector] Fetch complete', {
            orgId: this.orgId,
            postsScanned: posts.length,
            mentionsFound: mentions.length
        });
        return mentions;
    }

    // -----------------------------------------------------------------------

    async _fetchOrgPosts() {
        try {
            // UGC Posts authored by the organization
            const data = await this._get('/ugcPosts', {
                q: 'authors',
                authors: `List(${this.orgUrn})`,
                sortBy: 'CREATED',
                count: MAX_POSTS
            });
            return (data && data.elements) ? data.elements : [];
        } catch (err) {
            logger.warn('[LinkedInConnector] UGC posts fetch failed, trying shares', {
                error: err.message
            });
            // Fallback: try /shares endpoint (older API)
            try {
                const data = await this._get('/shares', {
                    q: 'owners',
                    owners: this.orgUrn,
                    sortBy: 'CREATED',
                    count: MAX_POSTS
                });
                return (data && data.elements) ? data.elements : [];
            } catch (fallbackErr) {
                logger.error('[LinkedInConnector] Both post fetch methods failed', {
                    error: fallbackErr.message
                });
                return [];
            }
        }
    }

    async _fetchPostComments(postId) {
        try {
            // Encode post URN for URL path
            const encodedUrn = encodeURIComponent(postId);
            const data = await this._get(`/socialActions/${encodedUrn}/comments`, {
                count: MAX_COMMENTS_PER_POST
            });
            return (data && data.elements) ? data.elements : [];
        } catch (err) {
            logger.debug('[LinkedInConnector] Comments fetch skipped', {
                postId,
                reason: err.message
            });
            return [];
        }
    }

    _normalizePost(post) {
        // Extract text from LinkedIn's complex content structure
        const content = this._extractPostText(post);
        const postId = post.id;
        const createdMs = post.created ? post.created.time : Date.now();

        return {
            external_id: postId,
            post_type: 'post',
            content,
            content_url: `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}/`,
            media_urls: [],
            author_name: this._extractAuthorName(post),
            author_handle: this.orgId,
            author_avatar_url: null,
            author_followers: 0,
            author_verified: false,
            likes: this._extractLikes(post),
            shares: 0,
            comments: post.statistics
                ? (post.statistics.commentsSummary
                    ? post.statistics.commentsSummary.totalFirstLevelComments : 0)
                : 0,
            reach: post.statistics
                ? (post.statistics.impressionCount || 0)
                : 0,
            published_at: new Date(createdMs),
            raw_data: post
        };
    }

    _normalizeComment(comment, parentPost) {
        const content = comment.message
            ? (comment.message.text || '')
            : '';
        const createdMs = comment.created ? comment.created.time : Date.now();
        const authorName = this._extractCommentAuthorName(comment);

        return {
            external_id: comment.id || `comment_${createdMs}`,
            post_type: 'comment',
            content,
            content_url: `https://www.linkedin.com/feed/update/${encodeURIComponent(parentPost.id)}/`,
            media_urls: [],
            author_name: authorName,
            author_handle: null,
            author_avatar_url: null,
            author_followers: 0,
            author_verified: false,
            likes: comment.likesSummary ? comment.likesSummary.totalLikes : 0,
            shares: 0,
            comments: 0,
            reach: 0,
            published_at: new Date(createdMs),
            parent_external_id: parentPost.id,
            raw_data: comment
        };
    }

    _extractPostText(post) {
        // UGC Post structure
        if (post.specificContent) {
            const sc = post.specificContent['com.linkedin.ugc.ShareContent'];
            if (sc && sc.shareCommentary) return sc.shareCommentary.text || '';
        }
        // Share structure (older API)
        if (post.text) return post.text.text || '';
        return '';
    }

    _extractAuthorName(post) {
        if (post.author) {
            const urn = post.author;
            if (urn.includes('organization')) return `Organization:${this.orgId}`;
            if (urn.includes('person')) return `Person:${urn.split(':').pop()}`;
        }
        return 'LinkedIn Organization';
    }

    _extractCommentAuthorName(comment) {
        if (comment.actor) {
            const actor = comment.actor;
            if (actor.includes('person')) return `Member:${actor.split(':').pop()}`;
        }
        return 'LinkedIn Member';
    }

    _extractLikes(post) {
        if (post.socialDetail && post.socialDetail.totalSocialActivityCounts) {
            return post.socialDetail.totalSocialActivityCounts.numLikes || 0;
        }
        return 0;
    }

    _matches(text, keywords) {
        if (!keywords || keywords.length === 0) return true;
        if (!text) return false;
        const lower = text.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    }

    async _get(path, params = {}) {
        const response = await axios.get(`${BASE_URL}${path}`, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                'X-Restli-Protocol-Version': '2.0.0'
            },
            params,
            timeout: 15000
        });
        return response.data;
    }
}

module.exports = LinkedInConnector;
