/**
 * Advanced Contact Management Service
 *
 * Provides enhanced contact management capabilities:
 * - Custom fields management
 * - Dynamic segmentation
 * - Tagging system
 * - Contact timeline/activities
 * - Import/export operations
 * - Duplicate detection and merging
 * - Suppression list management
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const { v4: uuidv4 } = require('uuid');

class AdvancedContactService {
    /**
     * Create or update custom field definition
     * @param {number} tenantId - Tenant ID
     * @param {object} fieldData - Field definition
     * @returns {Promise<object>} - Created/updated field
     */
    static async createCustomField(tenantId, fieldData) {
        try {
            const {
                field_key,
                field_label,
                field_type,
                field_options,
                is_required,
                display_order
            } = fieldData;

            // Check if field already exists
            const existing = await query(
                'SELECT id FROM custom_field_definitions WHERE tenant_id = $1 AND field_key = $2',
                [tenantId, field_key]
            );

            let result;
            if (existing.rows.length > 0) {
                // Update existing
                result = await query(
                    `UPDATE custom_field_definitions
                    SET field_label = $1, field_type = $2, field_options = $3,
                        is_required = $4, display_order = $5, updated_at = NOW()
                    WHERE id = $6
                    RETURNING *`,
                    [
                        field_label,
                        field_type,
                        JSON.stringify(field_options || {}),
                        is_required || false,
                        display_order || 0,
                        existing.rows[0].id
                    ]
                );
            } else {
                // Insert new
                result = await query(
                    `INSERT INTO custom_field_definitions
                    (tenant_id, field_key, field_label, field_type, field_options, is_required, display_order)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *`,
                    [
                        tenantId,
                        field_key,
                        field_label,
                        field_type,
                        JSON.stringify(field_options || {}),
                        is_required || false,
                        display_order || 0
                    ]
                );
            }

            logger.info('[AdvancedContactService] Custom field created/updated', {
                tenantId,
                field_key
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to create custom field', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get all custom field definitions for tenant
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Array>} - Field definitions
     */
    static async getCustomFields(tenantId) {
        try {
            const result = await query(
                `SELECT * FROM custom_field_definitions
                WHERE tenant_id = $1 AND is_active = true
                ORDER BY display_order ASC, field_label ASC`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to get custom fields', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Add tags to contact
     * @param {number} contactId - Contact ID
     * @param {Array<string>} tags - Tags to add
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async addTagsToContact(contactId, tags, tenantId) {
        try {
            // Get current tags
            const contactResult = await query(
                'SELECT tags FROM contacts WHERE id = $1 AND tenant_id = $2',
                [contactId, tenantId]
            );

            if (contactResult.rows.length === 0) {
                throw new Error('Contact not found');
            }

            const currentTags = contactResult.rows[0].tags || [];
            const newTags = [...new Set([...currentTags, ...tags])]; // Remove duplicates

            // Update contact tags
            await query(
                'UPDATE contacts SET tags = $1, updated_at = NOW() WHERE id = $2',
                [newTags, contactId]
            );

            // Update tag usage counts
            for (const tag of tags) {
                await query(
                    `INSERT INTO contact_tags (tenant_id, name, usage_count)
                    VALUES ($1, $2, 1)
                    ON CONFLICT (tenant_id, name)
                    DO UPDATE SET usage_count = contact_tags.usage_count + 1, updated_at = NOW()`,
                    [tenantId, tag]
                );
            }

            logger.info('[AdvancedContactService] Tags added to contact', {
                contactId,
                tags
            });
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to add tags', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Remove tags from contact
     * @param {number} contactId - Contact ID
     * @param {Array<string>} tags - Tags to remove
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async removeTagsFromContact(contactId, tags, tenantId) {
        try {
            // Get current tags
            const contactResult = await query(
                'SELECT tags FROM contacts WHERE id = $1 AND tenant_id = $2',
                [contactId, tenantId]
            );

            if (contactResult.rows.length === 0) {
                throw new Error('Contact not found');
            }

            const currentTags = contactResult.rows[0].tags || [];
            const newTags = currentTags.filter(tag => !tags.includes(tag));

            // Update contact tags
            await query(
                'UPDATE contacts SET tags = $1, updated_at = NOW() WHERE id = $2',
                [newTags, contactId]
            );

            // Update tag usage counts
            for (const tag of tags) {
                await query(
                    `UPDATE contact_tags
                    SET usage_count = GREATEST(usage_count - 1, 0), updated_at = NOW()
                    WHERE tenant_id = $1 AND name = $2`,
                    [tenantId, tag]
                );
            }

            logger.info('[AdvancedContactService] Tags removed from contact', {
                contactId,
                tags
            });
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to remove tags', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Create contact segment
     * @param {number} tenantId - Tenant ID
     * @param {object} segmentData - Segment configuration
     * @returns {Promise<object>} - Created segment
     */
    static async createSegment(tenantId, segmentData) {
        try {
            const {
                name,
                description,
                is_dynamic,
                conditions
            } = segmentData;

            const result = await query(
                `INSERT INTO contact_segments
                (tenant_id, name, description, is_dynamic, conditions)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *`,
                [
                    tenantId,
                    name,
                    description || null,
                    is_dynamic !== false,
                    JSON.stringify(conditions)
                ]
            );

            const segment = result.rows[0];

            // Calculate initial count
            if (is_dynamic !== false) {
                await this.updateSegmentMembers(segment.id, tenantId);
            }

            logger.info('[AdvancedContactService] Segment created', {
                tenantId,
                segmentId: segment.id,
                name
            });

            return segment;
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to create segment', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update segment members based on conditions
     * @param {number} segmentId - Segment ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<number>} - Number of contacts in segment
     */
    static async updateSegmentMembers(segmentId, tenantId) {
        try {
            // Get segment conditions
            const segmentResult = await query(
                'SELECT conditions FROM contact_segments WHERE id = $1 AND tenant_id = $2',
                [segmentId, tenantId]
            );

            if (segmentResult.rows.length === 0) {
                throw new Error('Segment not found');
            }

            const conditions = JSON.parse(segmentResult.rows[0].conditions || '{}');

            // Build dynamic SQL query based on conditions
            const { whereClause, params } = this.buildSegmentQuery(conditions, tenantId);

            // Clear existing members
            await query(
                'DELETE FROM contact_segment_members WHERE segment_id = $1',
                [segmentId]
            );

            // Insert matching contacts
            const insertSQL = `
                INSERT INTO contact_segment_members (segment_id, contact_id)
                SELECT $1, id FROM contacts
                WHERE tenant_id = $2 ${whereClause}
            `;

            await query(insertSQL, [segmentId, tenantId, ...params]);

            // Update contact count
            const countResult = await query(
                'SELECT COUNT(*) as count FROM contact_segment_members WHERE segment_id = $1',
                [segmentId]
            );

            const count = parseInt(countResult.rows[0].count);

            await query(
                'UPDATE contact_segments SET contact_count = $1, last_calculated_at = NOW() WHERE id = $2',
                [count, segmentId]
            );

            logger.info('[AdvancedContactService] Segment updated', {
                segmentId,
                count
            });

            return count;
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to update segment', {
                error: error.message,
                segmentId
            });
            throw error;
        }
    }

    /**
     * Build SQL WHERE clause from segment conditions
     * @param {object} conditions - Segment conditions
     * @param {number} tenantId - Tenant ID
     * @returns {object} - {whereClause, params}
     */
    static buildSegmentQuery(conditions, tenantId) {
        const clauses = [];
        const params = [];
        let paramIndex = 3; // Starting from $3 (segmentId and tenantId are $1 and $2)

        // Tag filters
        if (conditions.tags && conditions.tags.length > 0) {
            clauses.push(`tags && $${paramIndex}::text[]`);
            params.push(conditions.tags);
            paramIndex++;
        }

        // Custom field filters
        if (conditions.custom_fields) {
            for (const [key, value] of Object.entries(conditions.custom_fields)) {
                clauses.push(`custom_fields->>$${paramIndex} = $${paramIndex + 1}`);
                params.push(key, value);
                paramIndex += 2;
            }
        }

        // Lifecycle stage
        if (conditions.lifecycle_stage) {
            clauses.push(`lifecycle_stage = $${paramIndex}`);
            params.push(conditions.lifecycle_stage);
            paramIndex++;
        }

        // Source
        if (conditions.source) {
            clauses.push(`source = $${paramIndex}`);
            params.push(conditions.source);
            paramIndex++;
        }

        // Engagement score range
        if (conditions.engagement_score_min !== undefined) {
            clauses.push(`engagement_score >= $${paramIndex}`);
            params.push(conditions.engagement_score_min);
            paramIndex++;
        }
        if (conditions.engagement_score_max !== undefined) {
            clauses.push(`engagement_score <= $${paramIndex}`);
            params.push(conditions.engagement_score_max);
            paramIndex++;
        }

        // Last contacted date range
        if (conditions.last_contacted_after) {
            clauses.push(`last_contacted_at >= $${paramIndex}`);
            params.push(conditions.last_contacted_after);
            paramIndex++;
        }

        // Suppression filter
        if (conditions.is_suppressed !== undefined) {
            clauses.push(`is_suppressed = $${paramIndex}`);
            params.push(conditions.is_suppressed);
            paramIndex++;
        }

        const whereClause = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';

        return { whereClause, params };
    }

    /**
     * Add activity to contact timeline
     * @param {number} contactId - Contact ID
     * @param {number} tenantId - Tenant ID
     * @param {object} activityData - Activity details
     * @returns {Promise<object>} - Created activity
     */
    static async addActivity(contactId, tenantId, activityData) {
        try {
            const {
                activity_type,
                activity_data,
                related_entity_type,
                related_entity_id
            } = activityData;

            const result = await query(
                `INSERT INTO contact_activities
                (tenant_id, contact_id, activity_type, activity_data, related_entity_type, related_entity_id)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    tenantId,
                    contactId,
                    activity_type,
                    JSON.stringify(activity_data || {}),
                    related_entity_type || null,
                    related_entity_id || null
                ]
            );

            // Update contact last_contacted_at if applicable
            if (['email_sent', 'sms_sent', 'whatsapp_sent', 'telegram_sent'].includes(activity_type)) {
                await query(
                    'UPDATE contacts SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1',
                    [contactId]
                );
            }

            // Update last_responded_at if applicable
            if (activity_type === 'form_submitted') {
                await query(
                    `UPDATE contacts
                    SET last_responded_at = NOW(), response_count = response_count + 1, updated_at = NOW()
                    WHERE id = $1`,
                    [contactId]
                );
            }

            return result.rows[0];
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to add activity', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Get contact timeline
     * @param {number} contactId - Contact ID
     * @param {number} tenantId - Tenant ID
     * @param {number} limit - Number of activities to return
     * @returns {Promise<Array>} - Activities
     */
    static async getContactTimeline(contactId, tenantId, limit = 50) {
        try {
            const result = await query(
                `SELECT * FROM contact_activities
                WHERE contact_id = $1 AND tenant_id = $2
                ORDER BY performed_at DESC
                LIMIT $3`,
                [contactId, tenantId, limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to get timeline', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Detect duplicate contacts
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<Array>} - Array of duplicate groups
     */
    static async detectDuplicates(tenantId) {
        try {
            // Find contacts with matching email or phone
            const result = await query(
                `SELECT
                    COALESCE(email, phone) as key,
                    array_agg(id ORDER BY created_at ASC) as contact_ids,
                    COUNT(*) as count
                FROM contacts
                WHERE tenant_id = $1
                  AND (email IS NOT NULL OR phone IS NOT NULL)
                  AND duplicate_of IS NULL
                GROUP BY COALESCE(email, phone)
                HAVING COUNT(*) > 1
                ORDER BY COUNT(*) DESC
                LIMIT 100`,
                [tenantId]
            );

            return result.rows;
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to detect duplicates', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Merge duplicate contacts
     * @param {number} primaryContactId - Contact to keep
     * @param {Array<number>} duplicateContactIds - Contacts to merge
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async mergeDuplicates(primaryContactId, duplicateContactIds, tenantId) {
        try {
            for (const duplicateId of duplicateContactIds) {
                // Mark as duplicate
                await query(
                    `UPDATE contacts
                    SET duplicate_of = $1, merged_at = NOW(), updated_at = NOW()
                    WHERE id = $2 AND tenant_id = $3`,
                    [primaryContactId, duplicateId, tenantId]
                );

                // Transfer activities to primary contact
                await query(
                    'UPDATE contact_activities SET contact_id = $1 WHERE contact_id = $2',
                    [primaryContactId, duplicateId]
                );

                // Merge custom fields (don't overwrite existing)
                const duplicateResult = await query(
                    'SELECT custom_fields, tags FROM contacts WHERE id = $1',
                    [duplicateId]
                );

                if (duplicateResult.rows.length > 0) {
                    const duplicateFields = duplicateResult.rows[0].custom_fields || {};
                    const duplicateTags = duplicateResult.rows[0].tags || [];

                    // Merge into primary
                    await query(
                        `UPDATE contacts
                        SET custom_fields = custom_fields || $1::jsonb,
                            tags = array(SELECT DISTINCT unnest(tags || $2::text[]))
                        WHERE id = $3`,
                        [JSON.stringify(duplicateFields), duplicateTags, primaryContactId]
                    );
                }
            }

            logger.info('[AdvancedContactService] Contacts merged', {
                primaryContactId,
                duplicateContactIds
            });
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to merge duplicates', {
                error: error.message,
                primaryContactId
            });
            throw error;
        }
    }

    /**
     * Suppress contact (add to do-not-contact list)
     * @param {number} contactId - Contact ID
     * @param {string} reason - Suppression reason
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async suppressContact(contactId, reason, tenantId) {
        try {
            await query(
                `UPDATE contacts
                SET is_suppressed = true, suppression_reason = $1, suppressed_at = NOW(), updated_at = NOW()
                WHERE id = $2 AND tenant_id = $3`,
                [reason, contactId, tenantId]
            );

            logger.info('[AdvancedContactService] Contact suppressed', {
                contactId,
                reason
            });
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to suppress contact', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Unsuppress contact
     * @param {number} contactId - Contact ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    static async unsuppressContact(contactId, tenantId) {
        try {
            await query(
                `UPDATE contacts
                SET is_suppressed = false, suppression_reason = NULL, updated_at = NOW()
                WHERE id = $1 AND tenant_id = $2`,
                [contactId, tenantId]
            );

            logger.info('[AdvancedContactService] Contact unsuppressed', {
                contactId
            });
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to unsuppress contact', {
                error: error.message,
                contactId
            });
            throw error;
        }
    }

    /**
     * Create import job
     * @param {number} tenantId - Tenant ID
     * @param {object} importData - Import configuration
     * @returns {Promise<object>} - Created job
     */
    static async createImportJob(tenantId, importData) {
        try {
            const {
                file_name,
                file_url,
                total_rows,
                mapping
            } = importData;

            const batch_id = uuidv4();

            const result = await query(
                `INSERT INTO contact_import_jobs
                (tenant_id, batch_id, file_name, file_url, total_rows, mapping, status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING *`,
                [
                    tenantId,
                    batch_id,
                    file_name,
                    file_url,
                    total_rows,
                    JSON.stringify(mapping || {})
                ]
            );

            logger.info('[AdvancedContactService] Import job created', {
                tenantId,
                batch_id
            });

            return result.rows[0];
        } catch (error) {
            logger.error('[AdvancedContactService] Failed to create import job', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }
}

module.exports = AdvancedContactService;
