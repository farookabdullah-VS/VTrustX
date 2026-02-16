/**
 * Report Templates API Routes
 *
 * Provides endpoints for managing and using report templates:
 * - Browse templates by category
 * - Get template details
 * - Create reports from templates
 * - Create custom templates (for admins)
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');
const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');

/**
 * GET /api/report-templates
 * Get all available report templates
 *
 * Query params:
 * - category: Filter by category (survey, delivery, sentiment, mixed)
 * - search: Search in name and description
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;

    let sql = 'SELECT * FROM report_templates WHERE is_public = true';
    const params = [];
    let paramIndex = 1;

    // Filter by category
    if (category && category !== 'all') {
      sql += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    // Search filter
    if (search) {
      sql += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Order by usage count (most popular first)
    sql += ' ORDER BY usage_count DESC, name ASC';

    const result = await query(sql, params);

    logger.info('Report templates fetched', {
      userId: req.user.id,
      count: result.rows.length,
      category,
      search
    });

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch report templates', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch report templates' });
  }
});

/**
 * GET /api/report-templates/:id
 * Get a specific template by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM report_templates WHERE id = $1 AND is_public = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    logger.info('Report template fetched', {
      userId: req.user.id,
      templateId: id
    });

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Failed to fetch report template', {
      error: error.message,
      userId: req.user.id,
      templateId: req.params.id
    });
    res.status(500).json({ error: 'Failed to fetch report template' });
  }
});

/**
 * POST /api/report-templates/:templateId/create-report
 * Create a new report from a template
 *
 * Body:
 * - surveyId: The survey/form to use for the report
 * - title: Custom title for the report (optional)
 */
router.post('/:templateId/create-report', authenticate, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { surveyId, title } = req.body;
    const tenantId = req.user.tenant_id;

    if (!surveyId) {
      return res.status(400).json({ error: 'surveyId is required' });
    }

    // Get the template
    const templateResult = await query(
      'SELECT * FROM report_templates WHERE id = $1 AND is_public = true',
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = templateResult.rows[0];

    // Verify the survey exists and belongs to this tenant
    const surveyResult = await query(
      'SELECT id, title FROM forms WHERE id = $1 AND tenant_id = $2',
      [surveyId, tenantId]
    );

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' });
    }

    const survey = surveyResult.rows[0];

    // Generate report title
    const reportTitle = title || `${template.name} - ${survey.title}`;

    // Create the report
    const reportResult = await query(
      `INSERT INTO reports (tenant_id, title, form_id, layout, widgets, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        reportTitle,
        surveyId,
        template.layout,
        template.widgets,
        req.user.id
      ]
    );

    // Increment template usage count
    await query(
      'UPDATE report_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [templateId]
    );

    logger.info('Report created from template', {
      userId: req.user.id,
      tenantId,
      templateId,
      reportId: reportResult.rows[0].id,
      surveyId
    });

    res.json({
      success: true,
      report: reportResult.rows[0],
      message: 'Report created successfully from template'
    });
  } catch (error) {
    logger.error('Failed to create report from template', {
      error: error.message,
      userId: req.user.id,
      templateId: req.params.templateId
    });
    res.status(500).json({ error: 'Failed to create report from template' });
  }
});

/**
 * POST /api/report-templates
 * Create a new custom template (Admin only)
 *
 * Body:
 * - name: Template name
 * - description: Template description
 * - category: Template category
 * - layout: Grid layout configuration
 * - widgets: Widget configurations
 * - thumbnail_url: Preview image URL (optional)
 * - is_public: Whether template is public (optional)
 */
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { name, description, category, layout, widgets, thumbnail_url, is_public } = req.body;

    // Validation
    if (!name || !category || !layout || !widgets) {
      return res.status(400).json({
        error: 'Missing required fields: name, category, layout, widgets'
      });
    }

    // Validate category
    const validCategories = ['survey', 'delivery', 'sentiment', 'mixed'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`
      });
    }

    // Create template
    const result = await query(
      `INSERT INTO report_templates
       (name, description, category, layout, widgets, thumbnail_url, is_public, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        name,
        description,
        category,
        JSON.stringify(layout),
        JSON.stringify(widgets),
        thumbnail_url,
        is_public || false,
        req.user.id
      ]
    );

    logger.info('Custom report template created', {
      userId: req.user.id,
      templateId: result.rows[0].id,
      name,
      category
    });

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Template created successfully'
    });
  } catch (error) {
    logger.error('Failed to create custom template', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PUT /api/report-templates/:id
 * Update a template (Admin only)
 */
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, layout, widgets, thumbnail_url, is_public } = req.body;

    // Check if template exists
    const existingResult = await query(
      'SELECT * FROM report_templates WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(description);
      paramIndex++;
    }

    if (category !== undefined) {
      const validCategories = ['survey', 'delivery', 'sentiment', 'mixed'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (layout !== undefined) {
      updates.push(`layout = $${paramIndex}`);
      params.push(JSON.stringify(layout));
      paramIndex++;
    }

    if (widgets !== undefined) {
      updates.push(`widgets = $${paramIndex}`);
      params.push(JSON.stringify(widgets));
      paramIndex++;
    }

    if (thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramIndex}`);
      params.push(thumbnail_url);
      paramIndex++;
    }

    if (is_public !== undefined) {
      updates.push(`is_public = $${paramIndex}`);
      params.push(is_public);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add template ID as last parameter
    params.push(id);

    const sql = `UPDATE report_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const result = await query(sql, params);

    logger.info('Report template updated', {
      userId: req.user.id,
      templateId: id
    });

    res.json({
      success: true,
      template: result.rows[0],
      message: 'Template updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update template', {
      error: error.message,
      userId: req.user.id,
      templateId: req.params.id
    });
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/report-templates/:id
 * Delete a template (Admin only)
 */
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM report_templates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    logger.info('Report template deleted', {
      userId: req.user.id,
      templateId: id
    });

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete template', {
      error: error.message,
      userId: req.user.id,
      templateId: req.params.id
    });
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

/**
 * GET /api/report-templates/categories
 * Get all template categories with counts
 */
router.get('/meta/categories', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT
         category,
         COUNT(*) as count,
         MAX(usage_count) as most_used_count
       FROM report_templates
       WHERE is_public = true
       GROUP BY category
       ORDER BY category`
    );

    logger.info('Template categories fetched', {
      userId: req.user.id
    });

    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to fetch template categories', {
      error: error.message,
      userId: req.user.id
    });
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router;
