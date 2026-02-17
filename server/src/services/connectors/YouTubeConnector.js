/**
 * YouTube Connector
 *
 * Fetches video comments from a YouTube channel via the YouTube Data API v3.
 *
 * Required credentials:
 *   api_key     – YouTube Data API v3 key (for public data access)
 *   channel_id  – YouTube channel ID (e.g. "UCxxxxxxxxxxxxxxxx")
 *
 * Optional config:
 *   search_keywords – Additional keyword-based video search (costs 100 quota units/search)
 *
 * YouTube API quota:
 *   10,000 units/day per project.
 *   commentThreads.list  = 1 unit/call
 *   search.list          = 100 units/call
 *   channels.list        = 1 unit/call
 *   videos.list          = 1 unit/call
 *
 * Strategy:
 *   1. Get all recent comment threads for the channel (1 unit each call, up to 100 results).
 *   2. Optionally search for videos by keyword, then fetch comments (used sparingly).
 */

'use strict';

const axios = require('axios');
const logger = require('../../infrastructure/logger');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const MAX_COMMENT_RESULTS = 100;   // Per API call (max allowed)
const MAX_SEARCH_RESULTS = 20;     // Videos to search per keyword

class YouTubeConnector {
    constructor(credentials = {}, config = {}) {
        if (!credentials.api_key) throw new Error('YouTube: api_key is required');
        if (!credentials.channel_id) throw new Error('YouTube: channel_id is required');

        this.apiKey = credentials.api_key;
        this.channelId = credentials.channel_id;
        this.config = config;
    }

    /**
     * Verify the API key and channel ID are valid.
     * @returns {{ ok, channelId, channelTitle, subscriberCount }}
     */
    async testConnection() {
        const data = await this._get('/channels', {
            id: this.channelId,
            part: 'snippet,statistics',
            key: this.apiKey
        });

        if (!data.items || data.items.length === 0) {
            throw new Error(`YouTube: channel not found (id: ${this.channelId})`);
        }

        const ch = data.items[0];
        return {
            ok: true,
            channelId: ch.id,
            channelTitle: ch.snippet.title,
            subscriberCount: parseInt(ch.statistics.subscriberCount || 0, 10)
        };
    }

    /**
     * Fetch recent comments from the channel.
     *
     * @param {object}   opts
     * @param {Date}     opts.since    – Only return comments published after this date
     * @param {string[]} opts.keywords – Filter comments to those containing any keyword
     * @param {number}   opts.limit    – Max mentions to return
     * @returns {NormalizedMention[]}
     */
    async fetchMentions({ since = null, keywords = [], limit = 200 }) {
        const sinceDate = since ? new Date(since) : null;
        const mentions = [];

        // Strategy 1: allThreadsRelatedToChannelId
        // Returns all comment threads on all videos owned by the channel.
        const threads = await this._fetchChannelCommentThreads(sinceDate);

        for (const thread of threads) {
            if (mentions.length >= limit) break;

            const topComment = thread.snippet.topLevelComment;
            const mention = this._normalizeCommentThread(thread, topComment);

            if (this._matches(mention.content, keywords)) {
                mentions.push(mention);
            }

            // Include reply comments if present
            if (thread.replies && thread.replies.comments) {
                for (const reply of thread.replies.comments) {
                    if (mentions.length >= limit) break;
                    const replyMention = this._normalizeReply(reply, topComment);
                    if (this._matches(replyMention.content, keywords)) {
                        mentions.push(replyMention);
                    }
                }
            }
        }

        // Strategy 2: Keyword search for videos (only if keywords provided and quota allows)
        // Each search costs 100 quota units — use sparingly
        if (keywords.length > 0 && mentions.length < limit && this.config.enable_keyword_search) {
            const keywordMentions = await this._fetchByKeywords(keywords, sinceDate, limit - mentions.length);
            mentions.push(...keywordMentions);
        }

        logger.info('[YouTubeConnector] Fetch complete', {
            channelId: this.channelId,
            threadsScanned: threads.length,
            mentionsFound: mentions.length
        });
        return mentions;
    }

    // -----------------------------------------------------------------------

    async _fetchChannelCommentThreads(sinceDate) {
        try {
            const params = {
                allThreadsRelatedToChannelId: this.channelId,
                part: 'snippet,replies',
                order: 'time',
                maxResults: MAX_COMMENT_RESULTS,
                key: this.apiKey
            };
            if (sinceDate) {
                params.publishedAfter = sinceDate.toISOString();
            }

            const data = await this._get('/commentThreads', params);
            return (data && data.items) ? data.items : [];
        } catch (err) {
            logger.warn('[YouTubeConnector] Comment threads fetch failed', {
                error: err.message
            });
            return [];
        }
    }

    async _fetchByKeywords(keywords, sinceDate, maxResults) {
        const mentions = [];

        // Limit to first 2 keywords to conserve quota (100 units per search)
        const searchKeywords = keywords.slice(0, 2);

        for (const keyword of searchKeywords) {
            if (mentions.length >= maxResults) break;

            try {
                const searchParams = {
                    q: keyword,
                    channelId: this.channelId,
                    type: 'video',
                    order: 'date',
                    part: 'snippet',
                    maxResults: MAX_SEARCH_RESULTS,
                    key: this.apiKey
                };
                if (sinceDate) searchParams.publishedAfter = sinceDate.toISOString();

                const searchData = await this._get('/search', searchParams);
                const videos = (searchData && searchData.items) ? searchData.items : [];

                // Fetch comments for each video
                for (const video of videos) {
                    if (mentions.length >= maxResults) break;

                    const videoId = video.id.videoId;
                    try {
                        const threadData = await this._get('/commentThreads', {
                            videoId,
                            part: 'snippet',
                            order: 'time',
                            maxResults: 20,
                            key: this.apiKey
                        });
                        const threads = (threadData && threadData.items) ? threadData.items : [];
                        for (const thread of threads) {
                            if (mentions.length >= maxResults) break;
                            const topComment = thread.snippet.topLevelComment;
                            const mention = this._normalizeCommentThread(thread, topComment);
                            if (!mentions.some(m => m.external_id === mention.external_id)) {
                                mentions.push(mention);
                            }
                        }
                    } catch (videoErr) {
                        logger.debug('[YouTubeConnector] Video comments fetch skipped', {
                            videoId,
                            reason: videoErr.message
                        });
                    }
                }
            } catch (err) {
                logger.warn('[YouTubeConnector] Keyword search failed', {
                    keyword,
                    error: err.message
                });
            }
        }
        return mentions;
    }

    _normalizeCommentThread(thread, topComment) {
        const snippet = topComment.snippet;
        return {
            external_id: topComment.id,
            post_type: 'comment',
            content: snippet.textDisplay || snippet.textOriginal || '',
            content_url: `https://youtube.com/watch?v=${snippet.videoId}&lc=${topComment.id}`,
            media_urls: [],
            author_name: snippet.authorDisplayName || 'YouTube User',
            author_handle: snippet.authorChannelUrl
                ? snippet.authorChannelUrl.split('/').pop()
                : null,
            author_avatar_url: snippet.authorProfileImageUrl || null,
            author_followers: 0,
            author_verified: false,
            likes: snippet.likeCount || 0,
            shares: 0,
            comments: thread.snippet.totalReplyCount || 0,
            reach: 0,
            published_at: new Date(snippet.publishedAt),
            raw_data: thread
        };
    }

    _normalizeReply(reply, parentComment) {
        const snippet = reply.snippet;
        return {
            external_id: reply.id,
            post_type: 'comment',
            content: snippet.textDisplay || snippet.textOriginal || '',
            content_url: `https://youtube.com/watch?v=${snippet.videoId}&lc=${reply.id}`,
            media_urls: [],
            author_name: snippet.authorDisplayName || 'YouTube User',
            author_handle: snippet.authorChannelUrl
                ? snippet.authorChannelUrl.split('/').pop()
                : null,
            author_avatar_url: snippet.authorProfileImageUrl || null,
            author_followers: 0,
            author_verified: false,
            likes: snippet.likeCount || 0,
            shares: 0,
            comments: 0,
            reach: 0,
            published_at: new Date(snippet.publishedAt),
            parent_external_id: parentComment.id,
            raw_data: reply
        };
    }

    _matches(text, keywords) {
        if (!keywords || keywords.length === 0) return true;
        if (!text) return false;
        // YouTube returns HTML entities in text; do a basic decode
        const decoded = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        const lower = decoded.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    }

    async _get(path, params = {}) {
        const response = await axios.get(`${BASE_URL}${path}`, {
            params,
            timeout: 15000
        });
        return response.data;
    }
}

module.exports = YouTubeConnector;
