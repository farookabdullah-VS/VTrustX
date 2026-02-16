/**
 * Integration tests for Analytics Export API
 */

const request = require('supertest');
const { createTestApp, generateTestToken } = require('../../../test/helpers');
const { query } = require('../../../infrastructure/database/db');
const ReportExportService = require('../../../services/ReportExportService');

// Mock ReportExportService
jest.mock('../../../services/ReportExportService');

describe('Analytics Export API', () => {
  let app;
  let userToken;
  let testTenantId;
  let testReportId;

  const mockExportResult = {
    fileUrl: 'https://storage.example.com/report.pdf',
    filename: 'report_123_1234567890.pdf',
    size: 102400,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  beforeAll(async () => {
    app = await createTestApp();

    // Create test tenant
    const tenantResult = await query(
      'INSERT INTO tenants (name, domain) VALUES ($1, $2) RETURNING id',
      ['Test Tenant', 'test.example.com']
    );
    testTenantId = tenantResult.rows[0].id;

    // Create test survey
    const surveyResult = await query(
      `INSERT INTO forms (tenant_id, title, definition, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [testTenantId, 'Test Survey', '{"pages":[]}', 1]
    );
    const testSurveyId = surveyResult.rows[0].id;

    // Create test report
    const reportResult = await query(
      `INSERT INTO reports (tenant_id, title, form_id, layout, widgets, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        testTenantId,
        'Test Report',
        testSurveyId,
        '[]',
        '[]',
        1
      ]
    );
    testReportId = reportResult.rows[0].id;

    // Generate token
    userToken = generateTestToken({
      id: 1,
      tenant_id: testTenantId,
      role: 'user'
    });

    // Mock export service methods
    ReportExportService.exportToPDF.mockResolvedValue(mockExportResult);
    ReportExportService.exportToPowerPoint.mockResolvedValue(mockExportResult);
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM reports WHERE tenant_id = $1', [testTenantId]);
    await query('DELETE FROM forms WHERE tenant_id = $1', [testTenantId]);
    await query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/analytics/reports/:reportId/export/pdf', () => {
    test('exports report to PDF', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({
          orientation: 'landscape',
          includeCharts: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fileUrl).toBe(mockExportResult.fileUrl);
      expect(response.body.filename).toBe(mockExportResult.filename);
      expect(response.body.size).toBe(mockExportResult.size);
      expect(response.body).toHaveProperty('expiresAt');
    });

    test('calls export service with correct parameters', async () => {
      const options = {
        orientation: 'portrait',
        includeCharts: false,
        includeData: true
      };

      await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send(options);

      expect(ReportExportService.exportToPDF).toHaveBeenCalledWith(
        testReportId,
        testTenantId,
        options
      );
    });

    test('uses empty options if not provided', async () => {
      await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(ReportExportService.exportToPDF).toHaveBeenCalledWith(
        testReportId,
        testTenantId,
        {}
      );
    });

    test('returns 500 on export failure', async () => {
      ReportExportService.exportToPDF.mockRejectedValueOnce(
        new Error('Export failed')
      );

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to export report to PDF');
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .send();

      expect(response.status).toBe(401);
    });

    test('validates tenant access', async () => {
      // Create token for different tenant
      const otherTenantToken = generateTestToken({
        id: 2,
        tenant_id: 999,
        role: 'user'
      });

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${otherTenantToken}`])
        .send();

      // Export service will fail because report doesn't exist for this tenant
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/analytics/reports/:reportId/export/pptx', () => {
    test('exports report to PowerPoint', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.fileUrl).toBe(mockExportResult.fileUrl);
      expect(response.body.filename).toBe(mockExportResult.filename);
    });

    test('calls export service with correct parameters', async () => {
      const options = { theme: 'modern' };

      await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .set('Cookie', [`access_token=${userToken}`])
        .send(options);

      expect(ReportExportService.exportToPowerPoint).toHaveBeenCalledWith(
        testReportId,
        testTenantId,
        options
      );
    });

    test('returns 500 on export failure', async () => {
      ReportExportService.exportToPowerPoint.mockRejectedValueOnce(
        new Error('Export failed')
      );

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to export report to PowerPoint');
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .send();

      expect(response.status).toBe(401);
    });
  });

  describe('Export Service Error Handling', () => {
    test('handles report not found error', async () => {
      ReportExportService.exportToPDF.mockRejectedValueOnce(
        new Error('Report not found')
      );

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to export report to PDF');
    });

    test('handles insufficient permissions error', async () => {
      ReportExportService.exportToPDF.mockRejectedValueOnce(
        new Error('Insufficient permissions')
      );

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(500);
    });

    test('handles timeout errors', async () => {
      ReportExportService.exportToPDF.mockRejectedValueOnce(
        new Error('Export timeout')
      );

      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.status).toBe(500);
    });
  });

  describe('Export Response Format', () => {
    test('PDF export returns correct response structure', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.body).toMatchObject({
        success: true,
        fileUrl: expect.any(String),
        filename: expect.any(String),
        size: expect.any(Number),
        expiresAt: expect.any(String),
        message: 'Report exported to PDF successfully'
      });
    });

    test('PowerPoint export returns correct response structure', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.body).toMatchObject({
        success: true,
        fileUrl: expect.any(String),
        filename: expect.any(String),
        size: expect.any(Number),
        expiresAt: expect.any(String),
        message: 'Report exported to PowerPoint successfully'
      });
    });

    test('fileUrl is valid HTTPS URL', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.body.fileUrl).toMatch(/^https:\/\//);
    });

    test('filename has correct extension for PDF', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      expect(response.body.filename).toMatch(/\.pdf$/);
    });

    test('expiresAt is future date', async () => {
      const response = await request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      const expiryDate = new Date(response.body.expiresAt);
      const now = new Date();

      expect(expiryDate.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Concurrent Exports', () => {
    test('handles multiple concurrent export requests', async () => {
      const exportPromises = Array(3).fill(null).map(() =>
        request(app)
          .post(`/api/analytics/reports/${testReportId}/export/pdf`)
          .set('Cookie', [`access_token=${userToken}`])
          .send()
      );

      const responses = await Promise.all(exportPromises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(ReportExportService.exportToPDF).toHaveBeenCalledTimes(3);
    });

    test('handles mixed format exports concurrently', async () => {
      const pdfPromise = request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pdf`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      const pptxPromise = request(app)
        .post(`/api/analytics/reports/${testReportId}/export/pptx`)
        .set('Cookie', [`access_token=${userToken}`])
        .send();

      const [pdfResponse, pptxResponse] = await Promise.all([pdfPromise, pptxPromise]);

      expect(pdfResponse.status).toBe(200);
      expect(pptxResponse.status).toBe(200);
    });
  });
});
