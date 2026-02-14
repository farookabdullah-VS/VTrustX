/**
 * Scheduled Exports API Routes
 *
 * Endpoints for creating and managing recurring export schedules
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');
const ScheduledExportService = require('../../services/export/ScheduledExportService');
const Joi = require('joi');

const scheduledExportService = new ScheduledExportService();

// Validation schemas
const createScheduleSchema = Joi.object({
  name: Joi.string().required().max(255),
  description: Joi.string().optional().allow(''),
  formId: Joi.number().integer().required(),
  exportType: Joi.string().required().valid('raw', 'analytics', 'spss', 'sql'),
  format: Joi.string().required().valid('xlsx', 'csv', 'pdf', 'pptx', 'docx', 'sav'),
  schedule: Joi.string().required().valid('daily', 'weekly', 'monthly', 'custom'),
  scheduleTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).optional(),
  dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
  options: Joi.object().optional(),
  delivery: Joi.object({
    email: Joi.boolean().optional(),
    emailRecipients: Joi.array().items(Joi.string().email()).optional(),
    cloudStorage: Joi.string().valid('gdrive', 'google_drive', 'dropbox').optional()
  }).optional(),
  isActive: Joi.boolean().optional()
});

const updateScheduleSchema = Joi.object({
  name: Joi.string().optional().max(255),
  description: Joi.string().optional().allow(''),
  exportType: Joi.string().optional().valid('raw', 'analytics', 'spss', 'sql'),
  format: Joi.string().optional().valid('xlsx', 'csv', 'pdf', 'pptx', 'docx', 'sav'),
  schedule_type: Joi.string().optional().valid('daily', 'weekly', 'monthly', 'custom'),
  schedule_time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  day_of_week: Joi.number().integer().min(0).max(6).optional(),
  day_of_month: Joi.number().integer().min(1).max(31).optional(),
  options: Joi.object().optional(),
  delivery_config: Joi.object().optional(),
  is_active: Joi.boolean().optional()
});

/**
 * POST /api/scheduled-exports
 * Create a new scheduled export
 */
router.post('/', authenticate, async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createScheduleSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    const config = {
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      ...value
    };

    const schedule = await scheduledExportService.createSchedule(config);

    logger.info('[ScheduledExports] Schedule created', {
      scheduleId: schedule.id,
      tenantId: req.user.tenant_id,
      userId: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Scheduled export created successfully',
      data: schedule
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to create schedule', {
      error: error.message,
      tenantId: req.user.tenant_id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to create scheduled export',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/scheduled-exports
 * List all scheduled exports for the tenant
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { isActive, formId, limit, offset } = req.query;

    const options = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      formId: formId ? parseInt(formId) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    const schedules = await scheduledExportService.listSchedules(
      req.user.tenant_id,
      options
    );

    res.json({
      success: true,
      data: schedules,
      count: schedules.length
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to list schedules', {
      error: error.message,
      tenantId: req.user.tenant_id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to list scheduled exports',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/scheduled-exports/:id
 * Get a specific scheduled export
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID'
      });
    }

    const schedule = await scheduledExportService.getSchedule(scheduleId);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Check tenant access
    if (schedule.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to get schedule', {
      error: error.message,
      scheduleId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to get scheduled export',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * PUT /api/scheduled-exports/:id
 * Update a scheduled export
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID'
      });
    }

    // Validate request body
    const { error, value } = updateScheduleSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details[0].message
      });
    }

    // Check schedule exists and tenant has access
    const existing = await scheduledExportService.getSchedule(scheduleId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (existing.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updated = await scheduledExportService.updateSchedule(scheduleId, value);

    logger.info('[ScheduledExports] Schedule updated', {
      scheduleId,
      tenantId: req.user.tenant_id
    });

    res.json({
      success: true,
      message: 'Scheduled export updated successfully',
      data: updated
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to update schedule', {
      error: error.message,
      scheduleId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to update scheduled export',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * DELETE /api/scheduled-exports/:id
 * Delete a scheduled export
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID'
      });
    }

    // Check schedule exists and tenant has access
    const existing = await scheduledExportService.getSchedule(scheduleId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (existing.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await scheduledExportService.deleteSchedule(scheduleId);

    logger.info('[ScheduledExports] Schedule deleted', {
      scheduleId,
      tenantId: req.user.tenant_id
    });

    res.json({
      success: true,
      message: 'Scheduled export deleted successfully'
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to delete schedule', {
      error: error.message,
      scheduleId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled export',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/scheduled-exports/:id/execute
 * Manually execute a scheduled export
 */
router.post('/:id/execute', authenticate, async (req, res) => {
  try {
    const scheduleId = parseInt(req.params.id);

    if (isNaN(scheduleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid schedule ID'
      });
    }

    // Check schedule exists and tenant has access
    const existing = await scheduledExportService.getSchedule(scheduleId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    if (existing.tenant_id !== req.user.tenant_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Execute asynchronously
    scheduledExportService.executeSchedule(scheduleId).catch(err => {
      logger.error('[ScheduledExports] Manual execution failed', {
        scheduleId,
        error: err.message
      });
    });

    logger.info('[ScheduledExports] Manual execution triggered', {
      scheduleId,
      tenantId: req.user.tenant_id
    });

    res.json({
      success: true,
      message: 'Scheduled export execution triggered'
    });

  } catch (error) {
    logger.error('[ScheduledExports] Failed to execute schedule', {
      error: error.message,
      scheduleId: req.params.id
    });

    res.status(500).json({
      success: false,
      message: 'Failed to execute scheduled export',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
