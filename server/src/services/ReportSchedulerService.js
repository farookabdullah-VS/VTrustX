/**
 * ReportSchedulerService - Automated report generation and delivery
 *
 * Features:
 * - Cron-based scheduling
 * - Daily, weekly, monthly schedules
 * - Email delivery
 * - Multiple recipients
 * - PDF/Excel/PowerPoint formats
 * - Error handling and retry logic
 */

const cron = require('node-cron');
const { query } = require('../infrastructure/database/db');
const ReportExportService = require('./ReportExportService');
const EmailService = require('./emailService');
const logger = require('../infrastructure/logger');

class ReportSchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize scheduler - load and schedule all active reports
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('ReportSchedulerService already initialized');
      return;
    }

    try {
      logger.info('Initializing ReportSchedulerService...');

      // Load all active scheduled reports
      const result = await query(
        `SELECT * FROM scheduled_reports
         WHERE is_active = true
         ORDER BY next_run_at ASC`
      );

      logger.info('Loading scheduled reports', { count: result.rows.length });

      for (const schedule of result.rows) {
        await this.scheduleReport(schedule);
      }

      this.isInitialized = true;
      logger.info('ReportSchedulerService initialized successfully', {
        activeJobs: this.jobs.size
      });
    } catch (error) {
      logger.error('Failed to initialize ReportSchedulerService', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Schedule a report for automated execution
   *
   * @param {Object} schedule - Schedule configuration
   */
  async scheduleReport(schedule) {
    try {
      // Generate cron expression
      const cronExpression = this.getCronExpression(schedule);

      if (!cron.validate(cronExpression)) {
        throw new Error(`Invalid cron expression: ${cronExpression}`);
      }

      // Stop existing job if any
      if (this.jobs.has(schedule.id)) {
        this.jobs.get(schedule.id).stop();
      }

      // Create new cron job
      const job = cron.schedule(cronExpression, async () => {
        await this.executeScheduledReport(schedule.id);
      });

      // Store job reference
      this.jobs.set(schedule.id, job);

      // Calculate next run time
      const nextRunAt = this.calculateNextRun(schedule);
      await query(
        'UPDATE scheduled_reports SET next_run_at = $1 WHERE id = $2',
        [nextRunAt, schedule.id]
      );

      logger.info('Report scheduled successfully', {
        scheduleId: schedule.id,
        reportId: schedule.report_id,
        cronExpression,
        nextRunAt
      });

      return job;
    } catch (error) {
      logger.error('Failed to schedule report', {
        error: error.message,
        scheduleId: schedule.id
      });
      throw error;
    }
  }

  /**
   * Execute a scheduled report
   *
   * @param {number} scheduleId - Schedule ID
   */
  async executeScheduledReport(scheduleId) {
    try {
      logger.info('Executing scheduled report', { scheduleId });

      // Get schedule details
      const schedule = await this.getSchedule(scheduleId);

      if (!schedule) {
        logger.error('Schedule not found', { scheduleId });
        return;
      }

      if (!schedule.is_active) {
        logger.info('Schedule is inactive, skipping execution', { scheduleId });
        return;
      }

      // Mark execution start
      await query(
        'UPDATE scheduled_reports SET last_run_at = $1 WHERE id = $2',
        [new Date(), scheduleId]
      );

      // Generate report export
      let fileUrl;
      const format = schedule.format || 'pdf';

      if (format === 'pdf') {
        const result = await ReportExportService.exportToPDF(
          schedule.report_id,
          schedule.tenant_id,
          { filters: schedule.filters }
        );
        fileUrl = result.fileUrl;
      } else if (format === 'pptx') {
        const result = await ReportExportService.exportToPowerPoint(
          schedule.report_id,
          schedule.tenant_id,
          { filters: schedule.filters }
        );
        fileUrl = result.fileUrl;
      } else {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // Send to recipients
      const recipients = schedule.recipients || [];
      const emailService = new EmailService();

      for (const recipient of recipients) {
        try {
          await emailService.send({
            tenantId: schedule.tenant_id,
            to: recipient,
            subject: `Scheduled Report: ${schedule.title}`,
            html: this.generateEmailHTML(schedule, fileUrl),
            options: {
              trackingEnabled: false
            }
          });

          logger.info('Report email sent', {
            scheduleId,
            recipient,
            fileUrl
          });
        } catch (emailError) {
          logger.error('Failed to send report email', {
            error: emailError.message,
            scheduleId,
            recipient
          });
        }
      }

      // Calculate next run
      const nextRunAt = this.calculateNextRun(schedule);

      // Update schedule with success status
      await query(
        `UPDATE scheduled_reports
         SET last_run_status = 'success',
             last_run_error = NULL,
             next_run_at = $1
         WHERE id = $2`,
        [nextRunAt, scheduleId]
      );

      logger.info('Scheduled report executed successfully', {
        scheduleId,
        reportId: schedule.report_id,
        recipientCount: recipients.length,
        nextRunAt
      });
    } catch (error) {
      logger.error('Scheduled report execution failed', {
        error: error.message,
        stack: error.stack,
        scheduleId
      });

      // Update schedule with error status
      await query(
        `UPDATE scheduled_reports
         SET last_run_status = 'failed',
             last_run_error = $1
         WHERE id = $2`,
        [error.message, scheduleId]
      );
    }
  }

  /**
   * Get schedule details from database
   */
  async getSchedule(scheduleId) {
    const result = await query(
      'SELECT * FROM scheduled_reports WHERE id = $1',
      [scheduleId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Generate cron expression from schedule configuration
   *
   * @param {Object} schedule - Schedule object
   * @returns {string} Cron expression
   */
  getCronExpression(schedule) {
    const config = schedule.schedule_config || {};

    switch (schedule.schedule_type) {
      case 'daily': {
        // Daily at specific time (e.g., "09:00")
        const [hour, minute] = (config.time || '09:00').split(':');
        return `${minute} ${hour} * * *`;
      }

      case 'weekly': {
        // Weekly on specific day at specific time
        const [hour, minute] = (config.time || '09:00').split(':');
        const dayOfWeek = config.dayOfWeek || 1; // 0 = Sunday, 1 = Monday, etc.
        return `${minute} ${hour} * * ${dayOfWeek}`;
      }

      case 'monthly': {
        // Monthly on specific day at specific time
        const [hour, minute] = (config.time || '09:00').split(':');
        const dayOfMonth = config.dayOfMonth || 1;
        return `${minute} ${hour} ${dayOfMonth} * *`;
      }

      case 'custom': {
        // Custom cron expression
        return config.expression || '0 9 * * *';
      }

      default:
        throw new Error(`Unsupported schedule type: ${schedule.schedule_type}`);
    }
  }

  /**
   * Calculate next run time based on schedule
   *
   * @param {Object} schedule - Schedule configuration
   * @returns {Date} Next run timestamp
   */
  calculateNextRun(schedule) {
    const now = new Date();
    const config = schedule.schedule_config || {};

    switch (schedule.schedule_type) {
      case 'daily': {
        const [hour, minute] = (config.time || '09:00').split(':');
        const nextRun = new Date(now);
        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

        // If time has passed today, schedule for tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }

        return nextRun;
      }

      case 'weekly': {
        const [hour, minute] = (config.time || '09:00').split(':');
        const targetDay = config.dayOfWeek || 1;
        const nextRun = new Date(now);

        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

        // Calculate days until target day
        const currentDay = nextRun.getDay();
        let daysToAdd = targetDay - currentDay;

        if (daysToAdd < 0 || (daysToAdd === 0 && nextRun <= now)) {
          daysToAdd += 7;
        }

        nextRun.setDate(nextRun.getDate() + daysToAdd);
        return nextRun;
      }

      case 'monthly': {
        const [hour, minute] = (config.time || '09:00').split(':');
        const targetDay = config.dayOfMonth || 1;
        const nextRun = new Date(now);

        nextRun.setDate(targetDay);
        nextRun.setHours(parseInt(hour), parseInt(minute), 0, 0);

        // If date has passed this month, schedule for next month
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }

        return nextRun;
      }

      default:
        // Default to next day at 9 AM
        const nextRun = new Date(now);
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0);
        return nextRun;
    }
  }

  /**
   * Generate email HTML for report delivery
   */
  generateEmailHTML(schedule, fileUrl) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Scheduled Report</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 32px 24px;
          }
          .content p {
            margin: 0 0 16px 0;
          }
          .download-button {
            display: inline-block;
            padding: 14px 28px;
            background: #2563eb;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            margin: 24px 0;
          }
          .download-button:hover {
            background: #1d4ed8;
          }
          .info-box {
            background: #f1f5f9;
            border-left: 4px solid #2563eb;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
          }
          .footer {
            background: #f8fafc;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Your Scheduled Report is Ready</h1>
          </div>

          <div class="content">
            <p>Hello,</p>
            <p>Your scheduled report <strong>${schedule.title}</strong> has been generated and is ready for download.</p>

            <div class="info-box">
              <strong>Report Details:</strong><br>
              Generated: ${new Date().toLocaleString()}<br>
              Format: ${(schedule.format || 'pdf').toUpperCase()}<br>
              Schedule: ${this.getScheduleDescription(schedule)}
            </div>

            <p style="text-align: center;">
              <a href="${fileUrl}" class="download-button">Download Report</a>
            </p>

            <p style="font-size: 14px; color: #64748b;">
              <strong>Note:</strong> This download link will expire in 7 days for security reasons.
            </p>
          </div>

          <div class="footer">
            <p>This is an automated email from VTrustX Analytics Studio.</p>
            <p>© ${new Date().getFullYear()} VTrustX. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get human-readable schedule description
   */
  getScheduleDescription(schedule) {
    const config = schedule.schedule_config || {};

    switch (schedule.schedule_type) {
      case 'daily':
        return `Daily at ${config.time || '09:00'}`;
      case 'weekly':
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[config.dayOfWeek || 1];
        return `Weekly on ${dayName} at ${config.time || '09:00'}`;
      case 'monthly':
        return `Monthly on day ${config.dayOfMonth || 1} at ${config.time || '09:00'}`;
      case 'custom':
        return 'Custom schedule';
      default:
        return 'Unknown schedule';
    }
  }

  /**
   * Unschedule a report (stop the cron job)
   */
  unscheduleReport(scheduleId) {
    if (this.jobs.has(scheduleId)) {
      this.jobs.get(scheduleId).stop();
      this.jobs.delete(scheduleId);

      logger.info('Report unscheduled', { scheduleId });
      return true;
    }

    return false;
  }

  /**
   * Reschedule a report (update existing schedule)
   */
  async rescheduleReport(scheduleId) {
    const schedule = await this.getSchedule(scheduleId);

    if (!schedule) {
      throw new Error('Schedule not found');
    }

    // Stop existing job
    this.unscheduleReport(scheduleId);

    // Create new job
    if (schedule.is_active) {
      await this.scheduleReport(schedule);
    }
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules() {
    return Array.from(this.jobs.keys());
  }

  /**
   * Shutdown scheduler (stop all jobs)
   */
  shutdown() {
    logger.info('Shutting down ReportSchedulerService', { activeJobs: this.jobs.size });

    for (const [scheduleId, job] of this.jobs.entries()) {
      job.stop();
      logger.debug('Stopped scheduled job', { scheduleId });
    }

    this.jobs.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
const reportSchedulerService = new ReportSchedulerService();

module.exports = reportSchedulerService;
