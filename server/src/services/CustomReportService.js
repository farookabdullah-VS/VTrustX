/**
 * Custom Report Service
 *
 * Manages custom reports with drag-and-drop visual designer
 * Features:
 * - Create/read/update/delete custom reports
 * - Widget management (add, update, remove, reposition)
 * - Report sharing and access control
 * - Data fetching for widgets based on configuration
 * - Template library management
 * - Report snapshots (point-in-time captures)
 */

const { query } = require('../infrastructure/database/db');
const crypto = require('crypto');
const logger = require('../infrastructure/logger');

class CustomReportService {
    /**
     * Create a new custom report
     */
    static async createReport(tenantId, userId, reportData) {
        const {
            name,
            description,
            layout = { widgets: [], columns: 12, rowHeight: 80 },
            filters = { dateRange: 'last_30_days', formIds: [], customFilters: [] },
            category = 'custom',
            tags = [],
            isTemplate = false,
            templateCategory = null
        } = reportData;

        try {
            const result = await query(
                `INSERT INTO custom_reports
                (tenant_id, name, description, layout, filters, category, tags, is_template, template_category, created_by, last_modified_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
                RETURNING *`,
                [
                    tenantId,
                    name,
                    description || null,
                    JSON.stringify(layout),
                    JSON.stringify(filters),
                    category,
                    JSON.stringify(tags),
                    isTemplate,
                    templateCategory,
                    userId
                ]
            );

            logger.info('[CustomReportService] Report created', {
                reportId: result.rows[0].id,
                tenantId,
                userId
            });

            return this.formatReport(result.rows[0]);
        } catch (error) {
            logger.error('[CustomReportService] Failed to create report', {
                error: error.message,
                tenantId,
                userId
            });
            throw error;
        }
    }

    /**
     * Get report by ID
     */
    static async getReport(reportId, tenantId, userId = null) {
        try {
            const result = await query(
                `SELECT r.*,
                    u1.username as created_by_username,
                    u2.username as last_modified_by_username,
                    COUNT(DISTINCT w.id) as widget_count
                FROM custom_reports r
                LEFT JOIN users u1 ON r.created_by = u1.id
                LEFT JOIN users u2 ON r.last_modified_by = u2.id
                LEFT JOIN report_widgets w ON r.id = w.report_id
                WHERE r.id = $1 AND r.tenant_id = $2
                GROUP BY r.id, u1.username, u2.username`,
                [reportId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Report ${reportId} not found`);
            }

            // Increment view count
            if (userId) {
                await query(
                    `UPDATE custom_reports
                    SET view_count = view_count + 1, last_viewed_at = NOW()
                    WHERE id = $1`,
                    [reportId]
                );
            }

            // Get widgets
            const widgets = await this.getReportWidgets(reportId);

            const report = this.formatReport(result.rows[0]);
            report.widgets = widgets;

            return report;
        } catch (error) {
            logger.error('[CustomReportService] Failed to get report', {
                error: error.message,
                reportId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * List reports for tenant
     */
    static async listReports(tenantId, options = {}) {
        const {
            category = null,
            tags = [],
            isTemplate = null,
            createdBy = null,
            search = null,
            limit = 50,
            offset = 0
        } = options;

        try {
            let conditions = ['r.tenant_id = $1'];
            let params = [tenantId];
            let paramIndex = 2;

            if (category) {
                conditions.push(`r.category = $${paramIndex}`);
                params.push(category);
                paramIndex++;
            }

            if (tags.length > 0) {
                conditions.push(`r.tags ?| $${paramIndex}`);
                params.push(tags);
                paramIndex++;
            }

            if (isTemplate !== null) {
                conditions.push(`r.is_template = $${paramIndex}`);
                params.push(isTemplate);
                paramIndex++;
            }

            if (createdBy) {
                conditions.push(`r.created_by = $${paramIndex}`);
                params.push(createdBy);
                paramIndex++;
            }

            if (search) {
                conditions.push(`(r.name ILIKE $${paramIndex} OR r.description ILIKE $${paramIndex})`);
                params.push(`%${search}%`);
                paramIndex++;
            }

            params.push(limit, offset);

            const result = await query(
                `SELECT r.*,
                    u1.username as created_by_username,
                    COUNT(DISTINCT w.id) as widget_count
                FROM custom_reports r
                LEFT JOIN users u1 ON r.created_by = u1.id
                LEFT JOIN report_widgets w ON r.id = w.report_id
                WHERE ${conditions.join(' AND ')}
                GROUP BY r.id, u1.username
                ORDER BY r.updated_at DESC
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                params
            );

            return result.rows.map(row => this.formatReport(row));
        } catch (error) {
            logger.error('[CustomReportService] Failed to list reports', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Update report
     */
    static async updateReport(reportId, tenantId, userId, updates) {
        const allowedFields = [
            'name', 'description', 'layout', 'filters', 'category',
            'tags', 'is_public', 'password_protected', 'password_hash'
        ];

        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(field => {
            if (allowedFields.includes(field)) {
                setClauses.push(`${field} = $${paramIndex}`);

                // JSON fields need to be stringified
                if (['layout', 'filters', 'tags'].includes(field)) {
                    params.push(JSON.stringify(updates[field]));
                } else {
                    params.push(updates[field]);
                }
                paramIndex++;
            }
        });

        if (setClauses.length === 0) {
            throw new Error('No valid fields to update');
        }

        // Add updated_at and last_modified_by
        setClauses.push(`updated_at = NOW()`);
        setClauses.push(`last_modified_by = $${paramIndex}`);
        params.push(userId);
        paramIndex++;

        // Add WHERE conditions
        params.push(reportId, tenantId);

        try {
            const result = await query(
                `UPDATE custom_reports
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
                RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error(`Report ${reportId} not found`);
            }

            logger.info('[CustomReportService] Report updated', {
                reportId,
                tenantId,
                userId
            });

            return this.formatReport(result.rows[0]);
        } catch (error) {
            logger.error('[CustomReportService] Failed to update report', {
                error: error.message,
                reportId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Delete report
     */
    static async deleteReport(reportId, tenantId) {
        try {
            const result = await query(
                `DELETE FROM custom_reports
                WHERE id = $1 AND tenant_id = $2
                RETURNING id`,
                [reportId, tenantId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Report ${reportId} not found`);
            }

            logger.info('[CustomReportService] Report deleted', {
                reportId,
                tenantId
            });

            return { success: true, reportId };
        } catch (error) {
            logger.error('[CustomReportService] Failed to delete report', {
                error: error.message,
                reportId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Add widget to report
     */
    static async addWidget(reportId, tenantId, widgetData) {
        const {
            widgetKey,
            widgetType,
            position,
            config,
            dataSource,
            localFilters = {},
            title,
            subtitle,
            showTitle = true,
            style = {}
        } = widgetData;

        try {
            // Verify report exists and belongs to tenant
            await this.verifyReportAccess(reportId, tenantId);

            const result = await query(
                `INSERT INTO report_widgets
                (report_id, widget_key, widget_type, position, config, data_source, local_filters, title, subtitle, show_title, style)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *`,
                [
                    reportId,
                    widgetKey,
                    widgetType,
                    JSON.stringify(position),
                    JSON.stringify(config),
                    JSON.stringify(dataSource),
                    JSON.stringify(localFilters),
                    title || null,
                    subtitle || null,
                    showTitle,
                    JSON.stringify(style)
                ]
            );

            logger.info('[CustomReportService] Widget added', {
                reportId,
                widgetId: result.rows[0].id,
                widgetType
            });

            return this.formatWidget(result.rows[0]);
        } catch (error) {
            logger.error('[CustomReportService] Failed to add widget', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Update widget
     */
    static async updateWidget(widgetId, reportId, tenantId, updates) {
        const allowedFields = [
            'position', 'config', 'data_source', 'local_filters',
            'title', 'subtitle', 'show_title', 'style'
        ];

        const setClauses = [];
        const params = [];
        let paramIndex = 1;

        Object.keys(updates).forEach(field => {
            if (allowedFields.includes(field)) {
                setClauses.push(`${field} = $${paramIndex}`);

                // JSON fields need to be stringified
                if (['position', 'config', 'data_source', 'local_filters', 'style'].includes(field)) {
                    params.push(JSON.stringify(updates[field]));
                } else {
                    params.push(updates[field]);
                }
                paramIndex++;
            }
        });

        if (setClauses.length === 0) {
            throw new Error('No valid fields to update');
        }

        setClauses.push(`updated_at = NOW()`);

        params.push(widgetId, reportId);

        try {
            // Verify report access
            await this.verifyReportAccess(reportId, tenantId);

            const result = await query(
                `UPDATE report_widgets
                SET ${setClauses.join(', ')}
                WHERE id = $${paramIndex} AND report_id = $${paramIndex + 1}
                RETURNING *`,
                params
            );

            if (result.rows.length === 0) {
                throw new Error(`Widget ${widgetId} not found in report ${reportId}`);
            }

            logger.info('[CustomReportService] Widget updated', {
                widgetId,
                reportId
            });

            return this.formatWidget(result.rows[0]);
        } catch (error) {
            logger.error('[CustomReportService] Failed to update widget', {
                error: error.message,
                widgetId,
                reportId
            });
            throw error;
        }
    }

    /**
     * Delete widget
     */
    static async deleteWidget(widgetId, reportId, tenantId) {
        try {
            // Verify report access
            await this.verifyReportAccess(reportId, tenantId);

            const result = await query(
                `DELETE FROM report_widgets
                WHERE id = $1 AND report_id = $2
                RETURNING id`,
                [widgetId, reportId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Widget ${widgetId} not found in report ${reportId}`);
            }

            logger.info('[CustomReportService] Widget deleted', {
                widgetId,
                reportId
            });

            return { success: true, widgetId };
        } catch (error) {
            logger.error('[CustomReportService] Failed to delete widget', {
                error: error.message,
                widgetId,
                reportId
            });
            throw error;
        }
    }

    /**
     * Get all widgets for a report
     */
    static async getReportWidgets(reportId) {
        try {
            const result = await query(
                `SELECT * FROM report_widgets
                WHERE report_id = $1
                ORDER BY position->>'y', position->>'x'`,
                [reportId]
            );

            return result.rows.map(row => this.formatWidget(row));
        } catch (error) {
            logger.error('[CustomReportService] Failed to get widgets', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Generate public share token
     */
    static async generateShareToken(reportId, tenantId, userId) {
        try {
            const token = crypto.randomBytes(32).toString('hex');

            await query(
                `UPDATE custom_reports
                SET is_public = true, public_token = $1, last_modified_by = $2, updated_at = NOW()
                WHERE id = $3 AND tenant_id = $4`,
                [token, userId, reportId, tenantId]
            );

            logger.info('[CustomReportService] Share token generated', {
                reportId,
                tenantId
            });

            return { token, publicUrl: `/reports/public/${token}` };
        } catch (error) {
            logger.error('[CustomReportService] Failed to generate share token', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Share report with user
     */
    static async shareWithUser(reportId, tenantId, sharedByUserId, shareData) {
        const {
            sharedWithUserId = null,
            sharedWithEmail = null,
            accessLevel = 'view',
            expiresAt = null,
            message = null
        } = shareData;

        try {
            // Verify report access
            await this.verifyReportAccess(reportId, tenantId);

            const shareToken = crypto.randomBytes(32).toString('hex');

            const result = await query(
                `INSERT INTO report_shares
                (report_id, shared_with_user_id, shared_with_email, access_level, expires_at, share_token, shared_by, message)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [
                    reportId,
                    sharedWithUserId,
                    sharedWithEmail,
                    accessLevel,
                    expiresAt,
                    shareToken,
                    sharedByUserId,
                    message
                ]
            );

            logger.info('[CustomReportService] Report shared', {
                reportId,
                sharedWithUserId,
                sharedWithEmail
            });

            return {
                shareId: result.rows[0].id,
                shareToken,
                shareUrl: `/reports/shared/${shareToken}`
            };
        } catch (error) {
            logger.error('[CustomReportService] Failed to share report', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Create report snapshot
     */
    static async createSnapshot(reportId, tenantId, userId, snapshotData) {
        const { snapshotName, snapshotNote, data, filtersApplied } = snapshotData;

        try {
            // Verify report access
            await this.verifyReportAccess(reportId, tenantId);

            const result = await query(
                `INSERT INTO report_snapshots
                (report_id, snapshot_data, filters_applied, created_by, snapshot_name, snapshot_note)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *`,
                [
                    reportId,
                    JSON.stringify(data),
                    JSON.stringify(filtersApplied),
                    userId,
                    snapshotName,
                    snapshotNote
                ]
            );

            logger.info('[CustomReportService] Snapshot created', {
                reportId,
                snapshotId: result.rows[0].id
            });

            return this.formatSnapshot(result.rows[0]);
        } catch (error) {
            logger.error('[CustomReportService] Failed to create snapshot', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Get report snapshots
     */
    static async getSnapshots(reportId, tenantId) {
        try {
            // Verify report access
            await this.verifyReportAccess(reportId, tenantId);

            const result = await query(
                `SELECT s.*, u.username as created_by_username
                FROM report_snapshots s
                LEFT JOIN users u ON s.created_by = u.id
                WHERE s.report_id = $1
                ORDER BY s.created_at DESC`,
                [reportId]
            );

            return result.rows.map(row => this.formatSnapshot(row));
        } catch (error) {
            logger.error('[CustomReportService] Failed to get snapshots', {
                error: error.message,
                reportId
            });
            throw error;
        }
    }

    /**
     * Helper: Verify report access
     */
    static async verifyReportAccess(reportId, tenantId) {
        const result = await query(
            `SELECT id FROM custom_reports WHERE id = $1 AND tenant_id = $2`,
            [reportId, tenantId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Report ${reportId} not found or access denied`);
        }

        return true;
    }

    /**
     * Helper: Format report object
     */
    static formatReport(row) {
        return {
            id: row.id,
            tenantId: row.tenant_id,
            name: row.name,
            description: row.description,
            layout: typeof row.layout === 'string' ? JSON.parse(row.layout) : row.layout,
            filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters,
            category: row.category,
            tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
            isPublic: row.is_public,
            publicToken: row.public_token,
            passwordProtected: row.password_protected,
            isTemplate: row.is_template,
            templateCategory: row.template_category,
            createdBy: row.created_by,
            createdByUsername: row.created_by_username,
            lastModifiedBy: row.last_modified_by,
            lastModifiedByUsername: row.last_modified_by_username,
            viewCount: row.view_count,
            lastViewedAt: row.last_viewed_at,
            widgetCount: parseInt(row.widget_count || 0),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Helper: Format widget object
     */
    static formatWidget(row) {
        return {
            id: row.id,
            reportId: row.report_id,
            widgetKey: row.widget_key,
            widgetType: row.widget_type,
            position: typeof row.position === 'string' ? JSON.parse(row.position) : row.position,
            config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config,
            dataSource: typeof row.data_source === 'string' ? JSON.parse(row.data_source) : row.data_source,
            localFilters: typeof row.local_filters === 'string' ? JSON.parse(row.local_filters) : row.local_filters,
            title: row.title,
            subtitle: row.subtitle,
            showTitle: row.show_title,
            style: typeof row.style === 'string' ? JSON.parse(row.style) : row.style,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    /**
     * Helper: Format snapshot object
     */
    static formatSnapshot(row) {
        return {
            id: row.id,
            reportId: row.report_id,
            snapshotData: typeof row.snapshot_data === 'string' ? JSON.parse(row.snapshot_data) : row.snapshot_data,
            filtersApplied: typeof row.filters_applied === 'string' ? JSON.parse(row.filters_applied) : row.filters_applied,
            createdBy: row.created_by,
            createdByUsername: row.created_by_username,
            snapshotName: row.snapshot_name,
            snapshotNote: row.snapshot_note,
            createdAt: row.created_at
        };
    }
}

module.exports = CustomReportService;
