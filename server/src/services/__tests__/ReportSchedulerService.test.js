/**
 * Unit tests for ReportSchedulerService
 */

const ReportSchedulerService = require('../ReportSchedulerService');
const { query } = require('../../infrastructure/database/db');
const ReportExportService = require('../ReportExportService');
const EmailService = require('../emailService');

// Mock dependencies
jest.mock('../../infrastructure/database/db');
jest.mock('../ReportExportService');
jest.mock('../emailService');
jest.mock('../../infrastructure/logger');

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((expression, callback) => ({
    start: jest.fn(),
    stop: jest.fn()
  }))
}));

describe('ReportSchedulerService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should load and schedule active reports', async () => {
      const mockSchedules = [
        {
          id: 1,
          report_id: 'report-123',
          tenant_id: 1,
          schedule_type: 'daily',
          schedule_config: { time: '09:00' },
          recipients: ['user@example.com'],
          is_active: true
        },
        {
          id: 2,
          report_id: 'report-456',
          tenant_id: 1,
          schedule_type: 'weekly',
          schedule_config: { time: '10:00', dayOfWeek: 1 },
          recipients: ['admin@example.com'],
          is_active: true
        }
      ];

      query.mockResolvedValue({ rows: mockSchedules });

      await ReportSchedulerService.initialize();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        undefined
      );

      // Should create cron jobs for each schedule
      const cron = require('node-cron');
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    test('should skip inactive schedules', async () => {
      query.mockResolvedValue({
        rows: [
          { id: 1, is_active: true, schedule_type: 'daily', schedule_config: { time: '09:00' } },
          { id: 2, is_active: false, schedule_type: 'daily', schedule_config: { time: '10:00' } }
        ]
      });

      await ReportSchedulerService.initialize();

      const cron = require('node-cron');
      // Should only schedule the active one
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    test('should handle empty schedules', async () => {
      query.mockResolvedValue({ rows: [] });

      await ReportSchedulerService.initialize();

      const cron = require('node-cron');
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('scheduleReport', () => {
    const mockSchedule = {
      id: 1,
      report_id: 'report-123',
      tenant_id: 1,
      schedule_type: 'daily',
      schedule_config: { time: '09:00' },
      recipients: ['user@example.com'],
      format: 'pdf',
      is_active: true
    };

    test('should create cron job for daily schedule', () => {
      ReportSchedulerService.scheduleReport(mockSchedule);

      const cron = require('node-cron');
      expect(cron.schedule).toHaveBeenCalledWith(
        expect.stringMatching(/\d+ \d+ \* \* \*/), // Daily cron pattern
        expect.any(Function)
      );
    });

    test('should create cron job for weekly schedule', () => {
      const weeklySchedule = {
        ...mockSchedule,
        schedule_type: 'weekly',
        schedule_config: { time: '09:00', dayOfWeek: 1 }
      };

      ReportSchedulerService.scheduleReport(weeklySchedule);

      const cron = require('node-cron');
      expect(cron.schedule).toHaveBeenCalled();
    });

    test('should store job reference', () => {
      ReportSchedulerService.scheduleReport(mockSchedule);

      // Job should be stored in jobs map
      expect(ReportSchedulerService.jobs.has(mockSchedule.id)).toBe(true);
    });
  });

  describe('executeScheduledReport', () => {
    const mockSchedule = {
      id: 1,
      report_id: 'report-123',
      tenant_id: 1,
      title: 'Daily Report',
      recipients: ['user@example.com', 'admin@example.com'],
      format: 'pdf'
    };

    beforeEach(() => {
      query.mockResolvedValue({ rows: [mockSchedule] });
      ReportExportService.exportToPDF = jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/report.pdf',
        filename: 'report.pdf'
      });
      EmailService.prototype.send = jest.fn().mockResolvedValue(true);
    });

    test('should execute scheduled report', async () => {
      await ReportSchedulerService.executeScheduledReport(1);

      expect(query).toHaveBeenCalled();
      expect(ReportExportService.exportToPDF).toHaveBeenCalledWith(
        'report-123',
        1
      );
    });

    test('should export report in correct format', async () => {
      await ReportSchedulerService.executeScheduledReport(1);

      expect(ReportExportService.exportToPDF).toHaveBeenCalled();
    });

    test('should send email to all recipients', async () => {
      await ReportSchedulerService.executeScheduledReport(1);

      expect(EmailService.prototype.send).toHaveBeenCalledTimes(2);
      expect(EmailService.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('Daily Report')
        })
      );
      expect(EmailService.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@example.com'
        })
      );
    });

    test('should include download link in email', async () => {
      await ReportSchedulerService.executeScheduledReport(1);

      expect(EmailService.prototype.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://storage.example.com/report.pdf')
        })
      );
    });

    test('should handle export errors', async () => {
      ReportExportService.exportToPDF.mockRejectedValue(new Error('Export failed'));

      await expect(
        ReportSchedulerService.executeScheduledReport(1)
      ).rejects.toThrow('Export failed');
    });

    test('should handle email errors', async () => {
      EmailService.prototype.send.mockRejectedValue(new Error('Email failed'));

      await expect(
        ReportSchedulerService.executeScheduledReport(1)
      ).rejects.toThrow();
    });

    test('should support PowerPoint format', async () => {
      const pptxSchedule = {
        ...mockSchedule,
        format: 'pptx'
      };

      query.mockResolvedValue({ rows: [pptxSchedule] });
      ReportExportService.exportToPowerPoint = jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/report.pptx'
      });

      await ReportSchedulerService.executeScheduledReport(1);

      expect(ReportExportService.exportToPowerPoint).toHaveBeenCalled();
    });
  });

  describe('getCronExpression', () => {
    test('should generate daily cron expression', () => {
      const schedule = {
        schedule_type: 'daily',
        schedule_config: { time: '09:30' }
      };

      const cron = ReportSchedulerService.getCronExpression(schedule);

      expect(cron).toBe('30 9 * * *');
    });

    test('should generate weekly cron expression', () => {
      const schedule = {
        schedule_type: 'weekly',
        schedule_config: { time: '14:00', dayOfWeek: 1 } // Monday
      };

      const cron = ReportSchedulerService.getCronExpression(schedule);

      expect(cron).toBe('0 14 * * 1');
    });

    test('should generate monthly cron expression', () => {
      const schedule = {
        schedule_type: 'monthly',
        schedule_config: { time: '08:00', dayOfMonth: 1 }
      };

      const cron = ReportSchedulerService.getCronExpression(schedule);

      expect(cron).toContain('8');
      expect(cron).toContain('1');
    });

    test('should handle custom cron expressions', () => {
      const schedule = {
        schedule_type: 'custom',
        schedule_config: { expression: '0 0 * * 0' } // Every Sunday at midnight
      };

      const cron = ReportSchedulerService.getCronExpression(schedule);

      expect(cron).toBe('0 0 * * 0');
    });
  });

  describe('getSchedule', () => {
    test('should fetch schedule by ID', async () => {
      const mockSchedule = {
        id: 1,
        report_id: 'report-123',
        schedule_type: 'daily'
      };

      query.mockResolvedValue({ rows: [mockSchedule] });

      const result = await ReportSchedulerService.getSchedule(1);

      expect(result).toEqual(mockSchedule);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1]
      );
    });

    test('should return null for non-existent schedule', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await ReportSchedulerService.getSchedule(999);

      expect(result).toBeNull();
    });
  });

  describe('cancelSchedule', () => {
    test('should stop and remove scheduled job', () => {
      const mockJob = {
        stop: jest.fn()
      };

      ReportSchedulerService.jobs.set(1, mockJob);

      ReportSchedulerService.cancelSchedule(1);

      expect(mockJob.stop).toHaveBeenCalled();
      expect(ReportSchedulerService.jobs.has(1)).toBe(false);
    });

    test('should handle non-existent job', () => {
      expect(() => {
        ReportSchedulerService.cancelSchedule(999);
      }).not.toThrow();
    });
  });
});
