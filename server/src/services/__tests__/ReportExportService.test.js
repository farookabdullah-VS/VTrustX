/**
 * Unit tests for ReportExportService
 */

const ReportExportService = require('../ReportExportService');
const { query } = require('../../infrastructure/database/db');
const StorageService = require('../../infrastructure/storage/StorageService');

// Mock dependencies
jest.mock('../../infrastructure/database/db');
jest.mock('../../infrastructure/storage/StorageService');
jest.mock('../../infrastructure/logger');

// Mock puppeteer (PDF generation)
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      setContent: jest.fn(() => Promise.resolve()),
      pdf: jest.fn(() => Promise.resolve(Buffer.from('mock-pdf-content')))
    })),
    close: jest.fn(() => Promise.resolve())
  }))
}));

// Mock pptxgenjs (PowerPoint generation)
jest.mock('pptxgenjs', () => {
  return jest.fn().mockImplementation(() => ({
    layout: '',
    addSlide: jest.fn(() => ({
      addText: jest.fn()
    })),
    write: jest.fn(() => Promise.resolve(Buffer.from('mock-pptx-content')))
  }));
});

describe('ReportExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportToPDF', () => {
    const mockReport = {
      id: 'report-123',
      title: 'Test Report',
      tenant_id: 1,
      widgets: [
        { type: 'kpi', config: { title: 'Total Sales', value: 50000 } },
        { type: 'chart', config: { type: 'bar', title: 'Sales by Region' } }
      ]
    };

    beforeEach(() => {
      query.mockResolvedValue({ rows: [mockReport] });
      StorageService.uploadBuffer = jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/exports/report-123.pdf',
        filename: 'report-123.pdf',
        size: 1024,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    });

    test('should export report to PDF', async () => {
      const result = await ReportExportService.exportToPDF('report-123', 1);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('expiresAt');
    });

    test('should fetch report data from database', async () => {
      await ReportExportService.exportToPDF('report-123', 1);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([1, 'report-123'])
      );
    });

    test('should upload PDF to storage', async () => {
      await ReportExportService.exportToPDF('report-123', 1);

      expect(StorageService.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('.pdf'),
        'application/pdf'
      );
    });

    test('should throw error if report not found', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(
        ReportExportService.exportToPDF('invalid-id', 1)
      ).rejects.toThrow('Report not found');
    });

    test('should handle export options', async () => {
      const options = {
        orientation: 'landscape',
        includeCharts: true
      };

      await ReportExportService.exportToPDF('report-123', 1, options);

      expect(query).toHaveBeenCalled();
    });

    test('should handle puppeteer errors', async () => {
      const puppeteer = require('puppeteer');
      puppeteer.launch.mockRejectedValueOnce(new Error('Puppeteer failed'));

      await expect(
        ReportExportService.exportToPDF('report-123', 1)
      ).rejects.toThrow();
    });

    test('should handle storage upload errors', async () => {
      StorageService.uploadBuffer.mockRejectedValue(new Error('Storage failed'));

      await expect(
        ReportExportService.exportToPDF('report-123', 1)
      ).rejects.toThrow('Storage failed');
    });
  });

  describe('exportToPowerPoint', () => {
    const mockReport = {
      id: 'report-456',
      title: 'Quarterly Review',
      tenant_id: 1,
      widgets: [
        { type: 'kpi', config: { title: 'Revenue', value: '$1M' } },
        { type: 'chart', config: { type: 'line', title: 'Growth Trend' } }
      ]
    };

    beforeEach(() => {
      query.mockResolvedValue({ rows: [mockReport] });
      StorageService.uploadBuffer = jest.fn().mockResolvedValue({
        url: 'https://storage.example.com/exports/report-456.pptx',
        filename: 'report-456.pptx',
        size: 2048
      });
    });

    test('should export report to PowerPoint', async () => {
      const result = await ReportExportService.exportToPowerPoint('report-456', 1);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('filename');
      expect(result.filename).toContain('.pptx');
    });

    test('should create presentation with pptxgenjs', async () => {
      await ReportExportService.exportToPowerPoint('report-456', 1);

      expect(StorageService.uploadBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining('.pptx'),
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
    });

    test('should handle pptx generation errors', async () => {
      const pptxgen = require('pptxgenjs');
      const mockPptx = {
        layout: '',
        addSlide: jest.fn(),
        write: jest.fn().mockRejectedValue(new Error('PPTX generation failed'))
      };
      pptxgen.mockImplementation(() => mockPptx);

      await expect(
        ReportExportService.exportToPowerPoint('report-456', 1)
      ).rejects.toThrow();
    });
  });

  describe('getReportData', () => {
    test('should fetch report with widgets', async () => {
      const mockReport = {
        id: 'report-789',
        title: 'Test',
        widgets: []
      };

      query.mockResolvedValue({ rows: [mockReport] });

      const result = await ReportExportService.getReportData('report-789', 1);

      expect(result).toEqual(mockReport);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1, 'report-789']
      );
    });

    test('should return null for non-existent report', async () => {
      query.mockResolvedValue({ rows: [] });

      const result = await ReportExportService.getReportData('invalid', 1);

      expect(result).toBeNull();
    });
  });

  describe('generateReportHTML', () => {
    const mockReport = {
      title: 'Test Report',
      widgets: [
        { type: 'kpi', config: { title: 'KPI 1', value: 100 } }
      ]
    };

    test('should generate HTML from report data', async () => {
      const html = await ReportExportService.generateReportHTML(mockReport);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test Report');
    });

    test('should include widgets in HTML', async () => {
      const html = await ReportExportService.generateReportHTML(mockReport);

      expect(html).toContain('KPI 1');
    });

    test('should handle empty report', async () => {
      const emptyReport = {
        title: 'Empty Report',
        widgets: []
      };

      const html = await ReportExportService.generateReportHTML(emptyReport);

      expect(html).toContain('Empty Report');
    });
  });
});
