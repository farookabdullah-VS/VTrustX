/**
 * Social Listening Module - Joi Validation Schemas
 */

const Joi = require('joi');

// ============================================================================
// SOURCES
// ============================================================================

const createSourceSchema = Joi.object({
    platform: Joi.string()
        .valid('twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'youtube', 'google_reviews', 'news_rss', 'aggregator')
        .required(),
    name: Joi.string().min(1).max(255).required(),
    connection_type: Joi.string()
        .valid('direct_api', 'aggregator', 'rss', 'csv_import')
        .required(),
    credentials: Joi.object().optional(),
    config: Joi.object().optional(),
    sync_interval_minutes: Joi.number().integer().min(5).max(1440).optional()
});

const updateSourceSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    config: Joi.object().optional(),
    status: Joi.string().valid('active', 'paused', 'error', 'disconnected').optional(),
    sync_interval_minutes: Joi.number().integer().min(5).max(1440).optional()
}).min(1);

// ============================================================================
// QUERIES
// ============================================================================

const createQuerySchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    keywords: Joi.array().items(Joi.string()).required(),
    excluded_keywords: Joi.array().items(Joi.string()).optional(),
    languages: Joi.array().items(Joi.string().length(2)).optional(), // ISO 639-1 codes
    platforms: Joi.array()
        .items(Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'youtube', 'google_reviews', 'news_rss'))
        .optional()
});

const updateQuerySchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
    excluded_keywords: Joi.array().items(Joi.string()).optional(),
    languages: Joi.array().items(Joi.string().length(2)).optional(),
    platforms: Joi.array()
        .items(Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'youtube', 'google_reviews', 'news_rss'))
        .optional(),
    is_active: Joi.boolean().optional()
}).min(1);

// ============================================================================
// MENTIONS
// ============================================================================

const updateMentionSchema = Joi.object({
    status: Joi.string().valid('new', 'reviewed', 'actioned', 'archived').optional(),
    assigned_to: Joi.number().integer().allow(null).optional()
}).min(1);

const createResponseSchema = Joi.object({
    response_text: Joi.string().min(1).max(5000).required(),
    response_type: Joi.string().valid('manual', 'ai_generated', 'template').optional(),
    send_immediately: Joi.boolean().optional()
});

// ============================================================================
// COMPETITORS
// ============================================================================

const createCompetitorSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    keywords: Joi.array().items(Joi.string()).optional(),
    logo_url: Joi.string().uri().optional()
});

const updateCompetitorSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    keywords: Joi.array().items(Joi.string()).optional(),
    logo_url: Joi.string().uri().allow(null).optional()
}).min(1);

// ============================================================================
// ALERTS
// ============================================================================

const createAlertSchema = Joi.object({
    name: Joi.string().min(1).max(255).required(),
    rule_type: Joi.string()
        .valid('sentiment_threshold', 'volume_spike', 'keyword_match', 'influencer_mention', 'competitor_spike')
        .required(),
    conditions: Joi.object().required(), // Rule-specific conditions
    actions: Joi.array()
        .items(Joi.string().valid('notification', 'ticket', 'email', 'ctl_alert'))
        .min(1)
        .required(),
    platforms: Joi.array()
        .items(Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'youtube', 'google_reviews', 'news_rss'))
        .optional(),
    cooldown_minutes: Joi.number().integer().min(1).max(1440).optional()
});

const updateAlertSchema = Joi.object({
    name: Joi.string().min(1).max(255).optional(),
    conditions: Joi.object().optional(),
    actions: Joi.array()
        .items(Joi.string().valid('notification', 'ticket', 'email', 'ctl_alert'))
        .optional(),
    platforms: Joi.array()
        .items(Joi.string().valid('twitter', 'facebook', 'instagram', 'linkedin', 'reddit', 'youtube', 'google_reviews', 'news_rss'))
        .optional(),
    is_active: Joi.boolean().optional(),
    cooldown_minutes: Joi.number().integer().min(1).max(1440).optional()
}).min(1);

module.exports = {
    createSourceSchema,
    updateSourceSchema,
    createQuerySchema,
    updateQuerySchema,
    updateMentionSchema,
    createResponseSchema,
    createCompetitorSchema,
    updateCompetitorSchema,
    createAlertSchema,
    updateAlertSchema
};
