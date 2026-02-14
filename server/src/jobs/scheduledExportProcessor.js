/**
 * Scheduled Export Processor
 *
 * Cron job that runs every hour to execute scheduled exports
 * Checks for exports that are due and processes them automatically
 */

const cron = require('node-cron');
const logger = require('../infrastructure/logger');
const ScheduledExportService = require('../services/export/ScheduledExportService');

const scheduledExportService = new ScheduledExportService();

// Flag to prevent multiple executions
let isRunning = false;

/**
 * Process all due scheduled exports
 */
async function processDueExports() {
  if (isRunning) {
    logger.warn('[ScheduledExportProcessor] Already running, skipping');
    return;
  }

  isRunning = true;

  try {
    logger.info('[ScheduledExportProcessor] Starting scheduled export processing');

    // Get all active schedules
    const schedules = await scheduledExportService.getDueSchedules();

    if (schedules.length === 0) {
      logger.info('[ScheduledExportProcessor] No due exports found');
      return;
    }

    logger.info('[ScheduledExportProcessor] Found due exports', {
      count: schedules.length
    });

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Check if schedule matches current time based on cron expression
        if (!shouldRun(schedule)) {
          continue;
        }

        logger.info('[ScheduledExportProcessor] Executing schedule', {
          scheduleId: schedule.id,
          name: schedule.name,
          formId: schedule.form_id
        });

        await scheduledExportService.executeSchedule(schedule.id);
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push({
          scheduleId: schedule.id,
          error: error.message
        });

        logger.error('[ScheduledExportProcessor] Schedule execution failed', {
          scheduleId: schedule.id,
          name: schedule.name,
          error: error.message,
          stack: error.stack
        });
      }
    }

    logger.info('[ScheduledExportProcessor] Processing complete', results);

  } catch (error) {
    logger.error('[ScheduledExportProcessor] Processor error', {
      error: error.message,
      stack: error.stack
    });
  } finally {
    isRunning = false;
  }
}

/**
 * Check if schedule should run now based on cron expression
 */
function shouldRun(schedule) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();
  const currentDate = now.getDate();

  // Parse cron expression (minute hour day-of-month month day-of-week)
  const cronParts = schedule.cron_expression.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronParts;

  // Check minute
  if (minute !== '*' && parseInt(minute) !== currentMinute) {
    return false;
  }

  // Check hour
  if (hour !== '*' && parseInt(hour) !== currentHour) {
    return false;
  }

  // Check day of month
  if (dayOfMonth !== '*' && parseInt(dayOfMonth) !== currentDate) {
    return false;
  }

  // Check day of week
  if (dayOfWeek !== '*' && parseInt(dayOfWeek) !== currentDay) {
    return false;
  }

  // Additional check: don't run if it ran in the last 50 minutes
  if (schedule.last_run_at) {
    const lastRun = new Date(schedule.last_run_at);
    const timeSinceLastRun = now - lastRun;
    const fiftyMinutes = 50 * 60 * 1000;

    if (timeSinceLastRun < fiftyMinutes) {
      logger.debug('[ScheduledExportProcessor] Schedule ran recently, skipping', {
        scheduleId: schedule.id,
        lastRunAt: schedule.last_run_at,
        timeSinceLastRun: Math.floor(timeSinceLastRun / 1000 / 60) + ' minutes'
      });
      return false;
    }
  }

  return true;
}

/**
 * Start the scheduled export processor
 */
function start() {
  // Run every hour at :00 minutes
  const cronExpression = '0 * * * *';

  cron.schedule(cronExpression, async () => {
    await processDueExports();
  });

  logger.info('[ScheduledExportProcessor] Cron job started', {
    schedule: cronExpression,
    description: 'Runs every hour at :00'
  });

  // Also run immediately on startup (after 10 seconds delay)
  setTimeout(() => {
    processDueExports().catch(err => {
      logger.error('[ScheduledExportProcessor] Initial run failed', {
        error: err.message
      });
    });
  }, 10000);
}

/**
 * Stop the scheduled export processor
 */
function stop() {
  // Stop all cron jobs
  cron.getTasks().forEach(task => task.stop());
  logger.info('[ScheduledExportProcessor] Cron job stopped');
}

module.exports = {
  start,
  stop,
  processDueExports
};
