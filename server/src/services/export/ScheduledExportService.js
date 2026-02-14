/**
 * Scheduled Export Service
 *
 * Manages recurring exports with flexible schedules (daily, weekly, monthly)
 * Features:
 * - Cron-based scheduling
 * - Email delivery
 * - Cloud storage upload (Google Drive, Dropbox)
 * - Template support with branding
 * - Automatic cleanup of old exports
 */

const { query } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger');
const ExportService = require('./ExportService');
const emailService = require('../emailService');
const { uploadToGoogleDrive, uploadToDropbox } = require('./CloudStorageService');

class ScheduledExportService {
  constructor() {
    this.exportService = new ExportService();
  }

  /**
   * Create a scheduled export
   * @param {Object} config - Schedule configuration
   * @returns {Promise<Object>} Created schedule
   */
  async createSchedule(config) {
    try {
      const {
        tenantId,
        userId,
        name,
        description,
        formId,
        exportType, // 'raw', 'analytics', 'spss', 'sql'
        format, // 'xlsx', 'csv', 'pdf', 'pptx', etc.
        schedule, // 'daily', 'weekly', 'monthly', or cron expression
        scheduleTime, // HH:MM format
        dayOfWeek, // 0-6 for weekly (0 = Sunday)
        dayOfMonth, // 1-31 for monthly
        options, // Export options (template, filters, etc.)
        delivery, // { email: true, emailRecipients: [], cloudStorage: 'gdrive' | 'dropbox' }
        isActive
      } = config;

      // Validate required fields
      if (!tenantId || !userId || !formId || !exportType || !format || !schedule) {
        throw new Error('Missing required fields');
      }

      // Build cron expression from schedule
      const cronExpression = this.buildCronExpression(schedule, scheduleTime, dayOfWeek, dayOfMonth);

      // Insert scheduled export
      const result = await query(
        `INSERT INTO scheduled_exports (
          tenant_id, user_id, name, description, form_id,
          export_type, format, schedule_type, cron_expression,
          schedule_time, day_of_week, day_of_month,
          options, delivery_config, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *`,
        [
          tenantId, userId, name, description, formId,
          exportType, format, schedule, cronExpression,
          scheduleTime, dayOfWeek, dayOfMonth,
          JSON.stringify(options || {}),
          JSON.stringify(delivery || {}),
          isActive !== false
        ]
      );

      const scheduleRecord = result.rows[0];

      logger.info('[ScheduledExportService] Schedule created', {
        scheduleId: scheduleRecord.id,
        tenantId,
        formId,
        schedule,
        cronExpression
      });

      return scheduleRecord;

    } catch (error) {
      logger.error('[ScheduledExportService] Failed to create schedule', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update a scheduled export
   */
  async updateSchedule(scheduleId, updates) {
    try {
      // Build SET clause dynamically
      const fields = [];
      const values = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'description', 'export_type', 'format',
        'schedule_type', 'schedule_time', 'day_of_week', 'day_of_month',
        'options', 'delivery_config', 'is_active'
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          fields.push(`${key} = $${paramIndex++}`);
          values.push(key === 'options' || key === 'delivery_config' ? JSON.stringify(value) : value);
        }
      }

      if (fields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Rebuild cron expression if schedule changed
      if (updates.schedule_type || updates.schedule_time || updates.day_of_week || updates.day_of_month) {
        const existing = await this.getSchedule(scheduleId);
        const cronExpression = this.buildCronExpression(
          updates.schedule_type || existing.schedule_type,
          updates.schedule_time || existing.schedule_time,
          updates.day_of_week !== undefined ? updates.day_of_week : existing.day_of_week,
          updates.day_of_month !== undefined ? updates.day_of_month : existing.day_of_month
        );
        fields.push(`cron_expression = $${paramIndex++}`);
        values.push(cronExpression);
      }

      fields.push(`updated_at = NOW()`);
      values.push(scheduleId);

      const result = await query(
        `UPDATE scheduled_exports SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      logger.info('[ScheduledExportService] Schedule updated', { scheduleId });

      return result.rows[0];

    } catch (error) {
      logger.error('[ScheduledExportService] Failed to update schedule', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete a scheduled export
   */
  async deleteSchedule(scheduleId) {
    try {
      await query('DELETE FROM scheduled_exports WHERE id = $1', [scheduleId]);

      logger.info('[ScheduledExportService] Schedule deleted', { scheduleId });

      return true;
    } catch (error) {
      logger.error('[ScheduledExportService] Failed to delete schedule', {
        scheduleId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a scheduled export by ID
   */
  async getSchedule(scheduleId) {
    const result = await query('SELECT * FROM scheduled_exports WHERE id = $1', [scheduleId]);
    return result.rows[0] || null;
  }

  /**
   * List all scheduled exports for a tenant
   */
  async listSchedules(tenantId, options = {}) {
    const { isActive, formId, limit = 100, offset = 0 } = options;

    let whereClause = 'WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${paramIndex++}`;
      params.push(isActive);
    }

    if (formId) {
      whereClause += ` AND form_id = $${paramIndex++}`;
      params.push(formId);
    }

    params.push(limit, offset);

    const result = await query(
      `SELECT * FROM scheduled_exports ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return result.rows;
  }

  /**
   * Execute a scheduled export
   */
  async executeSchedule(scheduleId) {
    try {
      const schedule = await this.getSchedule(scheduleId);

      if (!schedule) {
        throw new Error(`Schedule ${scheduleId} not found`);
      }

      if (!schedule.is_active) {
        logger.warn('[ScheduledExportService] Schedule is inactive', { scheduleId });
        return null;
      }

      logger.info('[ScheduledExportService] Executing schedule', {
        scheduleId,
        formId: schedule.form_id,
        exportType: schedule.export_type
      });

      // Create export job
      const jobId = await this.exportService.createExportJob(
        schedule.tenant_id,
        schedule.user_id,
        schedule.form_id,
        schedule.export_type,
        schedule.format,
        schedule.options || {},
        {} // filters
      );

      // Process export
      const exportResult = await this.exportService.processExport(jobId);

      // Update last run time
      await query(
        'UPDATE scheduled_exports SET last_run_at = NOW(), last_status = $1 WHERE id = $2',
        ['success', scheduleId]
      );

      // Handle delivery
      if (schedule.delivery_config) {
        await this.handleDelivery(exportResult, schedule);
      }

      logger.info('[ScheduledExportService] Schedule executed successfully', {
        scheduleId,
        jobId,
        fileUrl: exportResult.fileUrl
      });

      return exportResult;

    } catch (error) {
      logger.error('[ScheduledExportService] Schedule execution failed', {
        scheduleId,
        error: error.message
      });

      // Update last status
      await query(
        'UPDATE scheduled_exports SET last_run_at = NOW(), last_status = $1, last_error = $2 WHERE id = $3',
        ['error', error.message, scheduleId]
      );

      throw error;
    }
  }

  /**
   * Handle delivery of export file
   */
  async handleDelivery(exportResult, schedule) {
    try {
      const deliveryConfig = schedule.delivery_config || {};

      // Email delivery
      if (deliveryConfig.email && deliveryConfig.emailRecipients?.length > 0) {
        await this.sendEmailDelivery(exportResult, schedule, deliveryConfig.emailRecipients);
      }

      // Cloud storage upload
      if (deliveryConfig.cloudStorage) {
        await this.uploadToCloudStorage(exportResult, schedule, deliveryConfig.cloudStorage);
      }

    } catch (error) {
      logger.error('[ScheduledExportService] Delivery failed', {
        scheduleId: schedule.id,
        error: error.message
      });
      // Don't throw - delivery failure shouldn't fail the export
    }
  }

  /**
   * Send export via email
   */
  async sendEmailDelivery(exportResult, schedule, recipients) {
    try {
      const formName = schedule.name || `Form ${schedule.form_id}`;
      const attachmentPath = exportResult.filePath;

      for (const recipient of recipients) {
        await emailService.sendEmail({
          tenantId: schedule.tenant_id,
          to: recipient,
          subject: `Scheduled Export: ${formName}`,
          html: `
            <h2>Scheduled Export Report</h2>
            <p>Your scheduled export "${schedule.name}" has completed successfully.</p>
            <ul>
              <li><strong>Form:</strong> ${formName}</li>
              <li><strong>Export Type:</strong> ${schedule.export_type}</li>
              <li><strong>Format:</strong> ${schedule.format.toUpperCase()}</li>
              <li><strong>Generated:</strong> ${new Date().toLocaleString()}</li>
            </ul>
            <p>Please find the export file attached.</p>
            <p style="color: #666; font-size: 12px;">This is an automated scheduled export from VTrustX.</p>
          `,
          attachments: [
            {
              filename: exportResult.fileName,
              path: attachmentPath
            }
          ]
        });
      }

      logger.info('[ScheduledExportService] Email delivery sent', {
        scheduleId: schedule.id,
        recipients: recipients.length
      });

    } catch (error) {
      logger.error('[ScheduledExportService] Email delivery failed', {
        scheduleId: schedule.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Upload export to cloud storage
   */
  async uploadToCloudStorage(exportResult, schedule, storageType) {
    try {
      const filePath = exportResult.filePath;
      const fileName = exportResult.fileName;

      let uploadUrl;

      switch (storageType) {
        case 'gdrive':
        case 'google_drive':
          uploadUrl = await uploadToGoogleDrive(filePath, fileName, schedule.tenant_id);
          break;

        case 'dropbox':
          uploadUrl = await uploadToDropbox(filePath, fileName, schedule.tenant_id);
          break;

        default:
          throw new Error(`Unsupported cloud storage type: ${storageType}`);
      }

      logger.info('[ScheduledExportService] Cloud storage upload successful', {
        scheduleId: schedule.id,
        storageType,
        uploadUrl
      });

      return uploadUrl;

    } catch (error) {
      logger.error('[ScheduledExportService] Cloud storage upload failed', {
        scheduleId: schedule.id,
        storageType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Build cron expression from schedule parameters
   */
  buildCronExpression(scheduleType, time = '00:00', dayOfWeek = null, dayOfMonth = null) {
    // Parse time (HH:MM)
    const [hour, minute] = time.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        // Every day at specified time
        return `${minute} ${hour} * * *`;

      case 'weekly':
        // Every week on specified day at specified time
        const dow = dayOfWeek !== null ? dayOfWeek : 1; // Default to Monday
        return `${minute} ${hour} * * ${dow}`;

      case 'monthly':
        // Every month on specified day at specified time
        const dom = dayOfMonth !== null ? dayOfMonth : 1; // Default to 1st
        return `${minute} ${hour} ${dom} * *`;

      case 'custom':
        // Allow custom cron expression (passed as time parameter)
        return time;

      default:
        throw new Error(`Invalid schedule type: ${scheduleType}`);
    }
  }

  /**
   * Get schedules due for execution
   */
  async getDueSchedules() {
    try {
      // Get schedules that are active and haven't run in the last hour
      const result = await query(
        `SELECT * FROM scheduled_exports
         WHERE is_active = true
           AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '50 minutes')
         ORDER BY last_run_at ASC NULLS FIRST`
      );

      return result.rows;

    } catch (error) {
      logger.error('[ScheduledExportService] Failed to get due schedules', {
        error: error.message
      });
      return [];
    }
  }
}

module.exports = ScheduledExportService;
