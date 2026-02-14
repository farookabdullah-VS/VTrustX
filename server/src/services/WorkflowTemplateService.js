/**
 * Workflow Template Service
 *
 * Manages pre-built workflow templates for common use cases
 * - Template creation and management
 * - Template marketplace (public templates)
 * - Template instantiation (create workflow from template)
 * - Template categories and tagging
 */

const db = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class WorkflowTemplateService {
    /**
     * Get all available templates for a tenant
     * Includes public templates + tenant's private templates
     */
    async listTemplates(tenantId, filters = {}) {
        try {
            const { category, search, tags, limit = 50, offset = 0 } = filters;

            let query = `
                SELECT *
                FROM workflow_templates
                WHERE (is_public = true OR tenant_id = $1)
            `;

            const params = [tenantId];
            let paramIndex = 2;

            if (category) {
                query += ` AND category = $${paramIndex++}`;
                params.push(category);
            }

            if (search) {
                query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR use_case ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            if (tags && tags.length > 0) {
                query += ` AND tags && $${paramIndex++}::text[]`;
                params.push(tags);
            }

            query += ` ORDER BY usage_count DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
            params.push(limit, offset);

            const result = await db.query(query, params);

            return result.rows;

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to list templates', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get a single template by ID
     */
    async getTemplate(templateId, tenantId) {
        try {
            const result = await db.query(
                `SELECT * FROM workflow_templates
                 WHERE id = $1 AND (is_public = true OR tenant_id = $2)`,
                [templateId, tenantId]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to get template', {
                error: error.message,
                templateId
            });
            throw error;
        }
    }

    /**
     * Create a new workflow template
     */
    async createTemplate(config, creatorTenantId = null) {
        try {
            const {
                name,
                description,
                category,
                use_case,
                workflow_definition,
                icon,
                tags,
                is_public = false
            } = config;

            const result = await db.query(
                `INSERT INTO workflow_templates
                 (name, description, category, use_case, workflow_definition, icon, tags, is_public, tenant_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING *`,
                [
                    name,
                    description,
                    category,
                    use_case,
                    JSON.stringify(workflow_definition),
                    icon,
                    tags || [],
                    is_public,
                    is_public ? null : creatorTenantId
                ]
            );

            logger.info('[WorkflowTemplateService] Template created', {
                templateId: result.rows[0].id,
                name,
                is_public
            });

            return result.rows[0];

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to create template', {
                error: error.message,
                name: config.name
            });
            throw error;
        }
    }

    /**
     * Update a template
     */
    async updateTemplate(templateId, updates, tenantId) {
        try {
            // Verify ownership (only template creator can update)
            const existing = await db.query(
                'SELECT tenant_id, is_public FROM workflow_templates WHERE id = $1',
                [templateId]
            );

            if (existing.rows.length === 0) {
                throw new Error('Template not found');
            }

            // Public templates can only be updated by system (tenant_id = null in practice)
            if (existing.rows[0].is_public && tenantId) {
                throw new Error('Cannot update public templates');
            }

            // Private templates can only be updated by owner
            if (!existing.rows[0].is_public && existing.rows[0].tenant_id !== tenantId) {
                throw new Error('Access denied');
            }

            const updateFields = [];
            const params = [templateId];
            let paramIndex = 2;

            const allowedFields = ['name', 'description', 'category', 'use_case', 'workflow_definition', 'icon', 'tags'];

            for (const field of allowedFields) {
                if (updates[field] !== undefined) {
                    updateFields.push(`${field} = $${paramIndex++}`);
                    params.push(field === 'workflow_definition' ? JSON.stringify(updates[field]) : updates[field]);
                }
            }

            if (updateFields.length === 0) {
                return existing.rows[0];
            }

            updateFields.push(`updated_at = NOW()`);

            const query = `
                UPDATE workflow_templates
                SET ${updateFields.join(', ')}
                WHERE id = $1
                RETURNING *
            `;

            const result = await db.query(query, params);

            logger.info('[WorkflowTemplateService] Template updated', {
                templateId,
                tenantId
            });

            return result.rows[0];

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to update template', {
                error: error.message,
                templateId
            });
            throw error;
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId, tenantId) {
        try {
            // Verify ownership
            const existing = await db.query(
                'SELECT tenant_id, is_public FROM workflow_templates WHERE id = $1',
                [templateId]
            );

            if (existing.rows.length === 0) {
                throw new Error('Template not found');
            }

            if (existing.rows[0].is_public) {
                throw new Error('Cannot delete public templates');
            }

            if (existing.rows[0].tenant_id !== tenantId) {
                throw new Error('Access denied');
            }

            await db.query('DELETE FROM workflow_templates WHERE id = $1', [templateId]);

            logger.info('[WorkflowTemplateService] Template deleted', {
                templateId,
                tenantId
            });

            return true;

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to delete template', {
                error: error.message,
                templateId
            });
            throw error;
        }
    }

    /**
     * Create a workflow from a template
     */
    async instantiateTemplate(templateId, tenantId, customizations = {}) {
        try {
            // Get template
            const template = await this.getTemplate(templateId, tenantId);

            if (!template) {
                throw new Error('Template not found');
            }

            // Parse workflow definition
            const workflowDef = typeof template.workflow_definition === 'string'
                ? JSON.parse(template.workflow_definition)
                : template.workflow_definition;

            // Apply customizations
            const workflowConfig = {
                tenant_id: tenantId,
                name: customizations.name || `${template.name} (Copy)`,
                description: customizations.description || template.description,
                trigger_event: workflowDef.trigger_event,
                conditions: customizations.conditions || workflowDef.conditions || [],
                actions: customizations.actions || workflowDef.actions || [],
                is_active: customizations.is_active !== undefined ? customizations.is_active : true
            };

            // Create workflow
            const result = await db.query(
                `INSERT INTO workflows
                 (tenant_id, name, description, trigger_event, conditions, actions, is_active, form_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [
                    workflowConfig.tenant_id,
                    workflowConfig.name,
                    workflowConfig.description,
                    workflowConfig.trigger_event,
                    JSON.stringify(workflowConfig.conditions),
                    JSON.stringify(workflowConfig.actions),
                    workflowConfig.is_active,
                    customizations.form_id || null
                ]
            );

            // Increment template usage count
            await db.query(
                'UPDATE workflow_templates SET usage_count = usage_count + 1 WHERE id = $1',
                [templateId]
            );

            logger.info('[WorkflowTemplateService] Workflow created from template', {
                templateId,
                workflowId: result.rows[0].id,
                tenantId
            });

            return result.rows[0];

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to instantiate template', {
                error: error.message,
                templateId,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get template categories with counts
     */
    async getCategories(tenantId) {
        try {
            const result = await db.query(
                `SELECT
                    category,
                    COUNT(*) as template_count,
                    SUM(usage_count) as total_usage
                 FROM workflow_templates
                 WHERE is_public = true OR tenant_id = $1
                 GROUP BY category
                 ORDER BY template_count DESC`,
                [tenantId]
            );

            return result.rows;

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to get categories', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Seed default templates (called on initialization)
     */
    async seedDefaultTemplates() {
        try {
            // Check if templates already exist
            const existing = await db.query(
                'SELECT COUNT(*) as count FROM workflow_templates WHERE is_public = true'
            );

            if (parseInt(existing.rows[0].count) > 0) {
                logger.info('[WorkflowTemplateService] Default templates already seeded');
                return;
            }

            logger.info('[WorkflowTemplateService] Seeding default templates...');

            const defaultTemplates = [
                {
                    name: 'NPS Detractor Alert',
                    description: 'Automatically create support tickets and notify team when customers give low NPS scores',
                    category: 'customer_service',
                    use_case: 'Follow up with unhappy customers',
                    icon: 'alert-triangle',
                    tags: ['nps', 'detractor', 'support', 'customer-service'],
                    workflow_definition: {
                        trigger_event: 'submission_completed',
                        conditions: [
                            { logic: 'AND' },
                            { field: 'submission.data.q_nps', operator: '<=', value: 6 }
                        ],
                        actions: [
                            {
                                type: 'create_ticket',
                                config: {
                                    title: 'NPS Detractor: {{submission.data.q_name}}',
                                    description: 'Customer gave NPS score of {{submission.data.q_nps}}. Feedback: {{submission.data.q_feedback}}',
                                    priority: 'high'
                                },
                                critical: true
                            },
                            {
                                type: 'send_email',
                                config: {
                                    to: 'support@company.com',
                                    subject: 'NPS Alert: Detractor Response',
                                    body: 'Detractor alert for {{submission.data.q_name}} (score: {{submission.data.q_nps}})'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'NPS Promoter Thank You',
                    description: 'Send thank you email and request review from customers who give high NPS scores',
                    category: 'marketing',
                    use_case: 'Build advocacy with promoters',
                    icon: 'heart',
                    tags: ['nps', 'promoter', 'advocacy', 'reviews'],
                    workflow_definition: {
                        trigger_event: 'submission_completed',
                        conditions: [
                            { logic: 'AND' },
                            { field: 'submission.data.q_nps', operator: '>=', value: 9 }
                        ],
                        actions: [
                            {
                                type: 'send_email',
                                config: {
                                    to: '{{submission.data.q_email}}',
                                    subject: 'Thank you for your feedback!',
                                    body: 'Hi {{submission.data.q_name}}, we\'re thrilled you rated us {{submission.data.q_nps}}/10! Would you consider leaving us a review?'
                                }
                            },
                            {
                                type: 'update_contact',
                                config: {
                                    contactId: '{{submission.contactId}}',
                                    updates: {
                                        segment: 'promoter',
                                        last_nps_score: '{{submission.data.q_nps}}'
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'Low CSAT Follow-up',
                    description: 'Create tickets and notify manager when customer satisfaction score is below 3',
                    category: 'customer_service',
                    use_case: 'Address customer dissatisfaction',
                    icon: 'frown',
                    tags: ['csat', 'customer-service', 'satisfaction'],
                    workflow_definition: {
                        trigger_event: 'submission_completed',
                        conditions: [
                            { logic: 'AND' },
                            { field: 'submission.data.q_csat', operator: '<', value: 3 }
                        ],
                        actions: [
                            {
                                type: 'create_ticket',
                                config: {
                                    title: 'Low CSAT: {{submission.data.q_name}}',
                                    description: 'CSAT score: {{submission.data.q_csat}}/5. Comments: {{submission.data.q_comments}}',
                                    priority: 'high'
                                }
                            },
                            {
                                type: 'send_notification',
                                config: {
                                    userId: 'manager',
                                    title: 'Low CSAT Alert',
                                    message: 'Customer {{submission.data.q_name}} gave CSAT score of {{submission.data.q_csat}}',
                                    type: 'warning'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'Negative Sentiment Alert',
                    description: 'Automatically flag and escalate responses with negative sentiment',
                    category: 'customer_service',
                    use_case: 'AI-powered sentiment monitoring',
                    icon: 'alert-circle',
                    tags: ['sentiment', 'ai', 'negative-feedback'],
                    workflow_definition: {
                        trigger_event: 'negative_sentiment_detected',
                        conditions: [
                            { logic: 'AND' },
                            { field: 'sentiment.score', operator: '<=', value: -0.5 }
                        ],
                        actions: [
                            {
                                type: 'create_ticket',
                                config: {
                                    title: 'Negative Sentiment: {{submission.customerName}}',
                                    description: 'Sentiment score: {{sentiment.score}}. Response: {{sentiment.text}}',
                                    priority: 'high'
                                }
                            },
                            {
                                type: 'add_tag',
                                config: {
                                    entity: 'submission',
                                    entityId: '{{submission.id}}',
                                    tag: 'negative_sentiment'
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'New Lead Notification',
                    description: 'Notify sales team when a high-value lead submits a form',
                    category: 'sales',
                    use_case: 'Real-time lead alerts',
                    icon: 'user-plus',
                    tags: ['sales', 'leads', 'notifications'],
                    workflow_definition: {
                        trigger_event: 'submission_completed',
                        conditions: [
                            { logic: 'AND' },
                            { field: 'submission.data.q_company_size', operator: '>=', value: 100 }
                        ],
                        actions: [
                            {
                                type: 'send_notification',
                                config: {
                                    userId: 'sales_team',
                                    title: 'New High-Value Lead',
                                    message: '{{submission.data.q_company}} ({{submission.data.q_company_size}} employees) submitted a form',
                                    type: 'info'
                                }
                            },
                            {
                                type: 'webhook',
                                config: {
                                    url: 'https://crm.company.com/api/leads',
                                    method: 'POST',
                                    body: {
                                        name: '{{submission.data.q_name}}',
                                        email: '{{submission.data.q_email}}',
                                        company: '{{submission.data.q_company}}',
                                        size: '{{submission.data.q_company_size}}'
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    name: 'Survey Abandonment Recovery',
                    description: 'Send reminder email when user starts but doesn\'t complete survey',
                    category: 'marketing',
                    use_case: 'Increase survey completion rates',
                    icon: 'mail',
                    tags: ['survey', 'abandonment', 'email', 'completion'],
                    workflow_definition: {
                        trigger_event: 'survey_abandoned',
                        conditions: [],
                        actions: [
                            {
                                type: 'delay',
                                config: {
                                    duration: 86400000  // Wait 24 hours
                                }
                            },
                            {
                                type: 'send_email',
                                config: {
                                    to: '{{respondent.email}}',
                                    subject: 'Complete your feedback survey',
                                    body: 'Hi {{respondent.name}}, we noticed you started our survey but didn\'t finish. Your feedback is important to us!'
                                }
                            }
                        ]
                    }
                }
            ];

            for (const template of defaultTemplates) {
                await this.createTemplate({ ...template, is_public: true });
            }

            logger.info('[WorkflowTemplateService] Default templates seeded successfully', {
                count: defaultTemplates.length
            });

        } catch (error) {
            logger.error('[WorkflowTemplateService] Failed to seed default templates', {
                error: error.message
            });
            // Don't throw - seeding is optional
        }
    }
}

// Export singleton instance
module.exports = new WorkflowTemplateService();
