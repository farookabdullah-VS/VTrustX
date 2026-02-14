const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Webhook Service
 *
 * Handles webhook subscription management and event delivery:
 * - Webhook subscription CRUD operations
 * - Event triggering and delivery
 * - Retry logic with exponential backoff
 * - HMAC signature generation for security
 * - Delivery logging and status tracking
 *
 * Supported Events:
 * - response.received
 * - response.completed
 * - distribution.sent
 * - distribution.completed
 * - workflow.triggered
 */
class WebhookService {
    /**
     * Create a new webhook subscription
     *
     * @param {number} tenantId - Tenant ID
     * @param {object} webhookData - Webhook configuration
     * @returns {Promise<object>} - Created webhook subscription
     */
    static async createWebhook(tenantId, webhookData) {
        try {
            const {
                name,
                url,
                events = [],
                headers = {},
                retryConfig = { max_attempts: 3, backoff_multiplier: 2 }
            } = webhookData;

            // Validate URL
            if (!url || !url.startsWith('http')) {
                throw new Error('Invalid webhook URL. Must start with http:// or https://');
            }

            // Validate events
            const validEvents = [
                'response.received',
                'response.completed',
                'distribution.sent',
                'distribution.completed',
                'workflow.triggered',
                'form.created',
                'form.updated'
            ];

            const invalidEvents = events.filter(event => !validEvents.includes(event));
            if (invalidEvents.length > 0) {
                throw new Error(`Invalid events: ${invalidEvents.join(', ')}`);
            }

            // Generate webhook secret for HMAC signatures
            const secret = crypto.randomBytes(32).toString('hex');

            const result = await query(
                `INSERT INTO webhook_subscriptions
                (tenant_id, name, url, events, secret, headers, retry_config)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [
                    tenantId,
                    name,
                    url,
                    JSON.stringify(events),
                    secret,
                    JSON.stringify(headers),
                    JSON.stringify(retryConfig)
                ]
            );

            const webhook = result.rows[0];

            logger.info('[WebhookService] Webhook created', {
                webhookId: webhook.id,
                tenantId,
                events
            });

            return {
                ...webhook,
                events: JSON.parse(webhook.events),
                headers: JSON.parse(webhook.headers),
                retry_config: JSON.parse(webhook.retry_config)
            };
        } catch (error) {
            logger.error('[WebhookService] Failed to create webhook', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Trigger a webhook event
     *
     * @param {number} tenantId - Tenant ID
     * @param {string} eventType - Event type (e.g., 'response.received')
     * @param {object} payload - Event payload data
     * @returns {Promise<void>}
     */
    static async triggerEvent(tenantId, eventType, payload) {
        try {
            // Get all active webhooks subscribed to this event
            const result = await query(
                `SELECT * FROM webhook_subscriptions
                WHERE tenant_id = $1
                AND is_active = true
                AND events @> $2::jsonb`,
                [tenantId, JSON.stringify([eventType])]
            );

            const webhooks = result.rows;

            if (webhooks.length === 0) {
                logger.debug('[WebhookService] No webhooks subscribed to event', {
                    tenantId,
                    eventType
                });
                return;
            }

            logger.info('[WebhookService] Triggering webhooks', {
                tenantId,
                eventType,
                webhookCount: webhooks.length
            });

            // Queue deliveries for all subscribed webhooks
            for (const webhook of webhooks) {
                await this.queueDelivery(webhook, eventType, payload);
            }
        } catch (error) {
            logger.error('[WebhookService] Failed to trigger event', {
                error: error.message,
                tenantId,
                eventType
            });
            // Don't throw - webhook failures shouldn't block main operations
        }
    }

    /**
     * Queue a webhook delivery
     *
     * @param {object} webhook - Webhook subscription
     * @param {string} eventType - Event type
     * @param {object} payload - Event payload
     * @returns {Promise<object>} - Delivery record
     */
    static async queueDelivery(webhook, eventType, payload) {
        try {
            const result = await query(
                `INSERT INTO webhook_deliveries
                (webhook_subscription_id, tenant_id, event_type, payload, status)
                VALUES ($1, $2, $3, $4, 'pending')
                RETURNING *`,
                [
                    webhook.id,
                    webhook.tenant_id,
                    eventType,
                    JSON.stringify(payload)
                ]
            );

            const delivery = result.rows[0];

            // Attempt delivery immediately (fire-and-forget)
            this.attemptDelivery(delivery.id).catch(err => {
                logger.error('[WebhookService] Delivery attempt failed', {
                    error: err.message,
                    deliveryId: delivery.id
                });
            });

            return delivery;
        } catch (error) {
            logger.error('[WebhookService] Failed to queue delivery', {
                error: error.message,
                webhookId: webhook.id,
                eventType
            });
            throw error;
        }
    }

    /**
     * Attempt webhook delivery
     *
     * @param {number} deliveryId - Delivery ID
     * @returns {Promise<void>}
     */
    static async attemptDelivery(deliveryId) {
        try {
            // Get delivery and webhook info
            const result = await query(
                `SELECT
                    wd.*,
                    ws.url,
                    ws.secret,
                    ws.headers,
                    ws.retry_config
                FROM webhook_deliveries wd
                JOIN webhook_subscriptions ws ON wd.webhook_subscription_id = ws.id
                WHERE wd.id = $1`,
                [deliveryId]
            );

            if (result.rows.length === 0) {
                throw new Error('Delivery not found');
            }

            const delivery = result.rows[0];
            const payload = JSON.parse(delivery.payload);
            const customHeaders = JSON.parse(delivery.headers || '{}');
            const retryConfig = JSON.parse(delivery.retry_config);

            // Generate HMAC signature
            const timestamp = Date.now();
            const signature = this.generateSignature(
                delivery.secret,
                timestamp,
                payload
            );

            // Prepare request headers
            const headers = {
                'Content-Type': 'application/json',
                'X-VTrustX-Signature': signature,
                'X-VTrustX-Timestamp': timestamp.toString(),
                'X-VTrustX-Event': delivery.event_type,
                'X-VTrustX-Delivery-ID': delivery.id.toString(),
                ...customHeaders
            };

            // Update delivery status to 'retrying'
            await query(
                `UPDATE webhook_deliveries
                SET status = 'retrying', attempt_count = attempt_count + 1
                WHERE id = $1`,
                [deliveryId]
            );

            // Send webhook request
            const startTime = Date.now();
            const response = await axios.post(delivery.url, payload, {
                headers,
                timeout: 30000, // 30 second timeout
                validateStatus: () => true // Don't throw on non-2xx status
            });

            const duration = Date.now() - startTime;

            // Check if delivery was successful
            const isSuccess = response.status >= 200 && response.status < 300;

            if (isSuccess) {
                // Mark as success
                await query(
                    `UPDATE webhook_deliveries
                    SET status = 'success',
                        response_status = $1,
                        response_body = $2,
                        delivered_at = NOW()
                    WHERE id = $3`,
                    [response.status, response.data ? JSON.stringify(response.data).substring(0, 1000) : null, deliveryId]
                );

                // Update webhook last_triggered_at
                await query(
                    `UPDATE webhook_subscriptions
                    SET last_triggered_at = NOW()
                    WHERE id = $1`,
                    [delivery.webhook_subscription_id]
                );

                logger.info('[WebhookService] Delivery successful', {
                    deliveryId,
                    status: response.status,
                    duration
                });
            } else {
                // Handle failure
                const shouldRetry = delivery.attempt_count < retryConfig.max_attempts;

                if (shouldRetry) {
                    // Calculate next retry time with exponential backoff
                    const backoffSeconds = Math.pow(retryConfig.backoff_multiplier, delivery.attempt_count) * 60;
                    const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

                    await query(
                        `UPDATE webhook_deliveries
                        SET status = 'failed',
                            response_status = $1,
                            response_body = $2,
                            error_message = $3,
                            next_retry_at = $4
                        WHERE id = $5`,
                        [
                            response.status,
                            response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
                            `HTTP ${response.status}: ${response.statusText}`,
                            nextRetryAt,
                            deliveryId
                        ]
                    );

                    logger.warn('[WebhookService] Delivery failed, will retry', {
                        deliveryId,
                        status: response.status,
                        attemptCount: delivery.attempt_count + 1,
                        nextRetryAt
                    });
                } else {
                    // Max retries reached
                    await query(
                        `UPDATE webhook_deliveries
                        SET status = 'failed',
                            response_status = $1,
                            response_body = $2,
                            error_message = $3
                        WHERE id = $4`,
                        [
                            response.status,
                            response.data ? JSON.stringify(response.data).substring(0, 1000) : null,
                            `HTTP ${response.status}: Max retries reached`,
                            deliveryId
                        ]
                    );

                    logger.error('[WebhookService] Delivery failed permanently', {
                        deliveryId,
                        status: response.status,
                        attempts: delivery.attempt_count + 1
                    });
                }
            }
        } catch (error) {
            // Network error or timeout
            logger.error('[WebhookService] Delivery attempt error', {
                error: error.message,
                deliveryId
            });

            await query(
                `UPDATE webhook_deliveries
                SET status = 'failed',
                    error_message = $1
                WHERE id = $2`,
                [error.message, deliveryId]
            );
        }
    }

    /**
     * Generate HMAC signature for webhook payload
     *
     * @param {string} secret - Webhook secret
     * @param {number} timestamp - Unix timestamp
     * @param {object} payload - Payload data
     * @returns {string} - HMAC signature
     */
    static generateSignature(secret, timestamp, payload) {
        const message = `${timestamp}.${JSON.stringify(payload)}`;
        return crypto.createHmac('sha256', secret).update(message).digest('hex');
    }

    /**
     * Verify webhook signature (for incoming webhooks)
     *
     * @param {string} secret - Webhook secret
     * @param {string} signature - Provided signature
     * @param {number} timestamp - Provided timestamp
     * @param {object} payload - Payload data
     * @returns {boolean} - True if signature is valid
     */
    static verifySignature(secret, signature, timestamp, payload) {
        const expectedSignature = this.generateSignature(secret, timestamp, payload);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * List webhooks for tenant
     *
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<array>} - List of webhooks
     */
    static async listWebhooks(tenantId) {
        try {
            const result = await query(
                `SELECT id, name, url, events, is_active, last_triggered_at, created_at
                FROM webhook_subscriptions
                WHERE tenant_id = $1
                ORDER BY created_at DESC`,
                [tenantId]
            );

            return result.rows.map(webhook => ({
                ...webhook,
                events: JSON.parse(webhook.events)
            }));
        } catch (error) {
            logger.error('[WebhookService] Failed to list webhooks', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get webhook details
     *
     * @param {number} webhookId - Webhook ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @returns {Promise<object>} - Webhook details with secret
     */
    static async getWebhook(webhookId, tenantId) {
        try {
            const result = await query(
                `SELECT * FROM webhook_subscriptions
                WHERE id = $1 AND tenant_id = $2`,
                [webhookId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Webhook not found');
            }

            const webhook = result.rows[0];

            return {
                ...webhook,
                events: JSON.parse(webhook.events),
                headers: JSON.parse(webhook.headers),
                retry_config: JSON.parse(webhook.retry_config)
            };
        } catch (error) {
            logger.error('[WebhookService] Failed to get webhook', {
                error: error.message,
                webhookId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update webhook
     *
     * @param {number} webhookId - Webhook ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @param {object} updates - Fields to update
     * @returns {Promise<object>} - Updated webhook
     */
    static async updateWebhook(webhookId, tenantId, updates) {
        try {
            const allowedFields = ['name', 'url', 'events', 'headers', 'is_active'];
            const setClauses = [];
            const params = [];
            let paramIndex = 1;

            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key)) {
                    setClauses.push(`${key} = $${paramIndex}`);
                    params.push(['events', 'headers'].includes(key) ? JSON.stringify(value) : value);
                    paramIndex++;
                }
            }

            if (setClauses.length === 0) {
                throw new Error('No valid fields to update');
            }

            params.push(webhookId, tenantId);

            const result = await query(
                `UPDATE webhook_subscriptions
                SET ${setClauses.join(', ')}, updated_at = NOW()
                WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
                RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error('Webhook not found');
            }

            const webhook = result.rows[0];

            logger.info('[WebhookService] Webhook updated', {
                webhookId,
                tenantId
            });

            return {
                ...webhook,
                events: JSON.parse(webhook.events),
                headers: JSON.parse(webhook.headers)
            };
        } catch (error) {
            logger.error('[WebhookService] Failed to update webhook', {
                error: error.message,
                webhookId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete webhook
     *
     * @param {number} webhookId - Webhook ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @returns {Promise<object>} - Success status
     */
    static async deleteWebhook(webhookId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM webhook_subscriptions
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [webhookId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error('Webhook not found');
            }

            logger.info('[WebhookService] Webhook deleted', {
                webhookId,
                tenantId
            });

            return { success: true };
        } catch (error) {
            logger.error('[WebhookService] Failed to delete webhook', {
                error: error.message,
                webhookId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get webhook delivery logs
     *
     * @param {number} webhookId - Webhook ID
     * @param {number} tenantId - Tenant ID (for authorization)
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<array>} - Delivery logs
     */
    static async getDeliveryLogs(webhookId, tenantId, limit = 50) {
        try {
            const result = await query(
                `SELECT wd.*
                FROM webhook_deliveries wd
                JOIN webhook_subscriptions ws ON wd.webhook_subscription_id = ws.id
                WHERE wd.webhook_subscription_id = $1 AND ws.tenant_id = $2
                ORDER BY wd.created_at DESC
                LIMIT $3`,
                [webhookId, tenantId, limit]
            );

            return result.rows.map(log => ({
                ...log,
                payload: JSON.parse(log.payload)
            }));
        } catch (error) {
            logger.error('[WebhookService] Failed to get delivery logs', {
                error: error.message,
                webhookId,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = WebhookService;
