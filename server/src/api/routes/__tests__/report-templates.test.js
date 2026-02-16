/**
 * Integration tests for Report Templates API
 */

const request = require('supertest');
const { createTestApp, generateTestToken } = require('../../../test/helpers');
const { query } = require('../../../infrastructure/database/db');

describe('Report Templates API', () => {
  let app;
  let adminToken;
  let userToken;
  let testTenantId;

  beforeAll(async () => {
    app = await createTestApp();

    // Create test tenant
    const tenantResult = await query(
      'INSERT INTO tenants (name, domain) VALUES ($1, $2) RETURNING id',
      ['Test Tenant', 'test.example.com']
    );
    testTenantId = tenantResult.rows[0].id;

    // Generate tokens
    adminToken = generateTestToken({
      id: 1,
      tenant_id: testTenantId,
      role: 'admin'
    });
    userToken = generateTestToken({
      id: 2,
      tenant_id: testTenantId,
      role: 'user'
    });
  });

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM report_templates WHERE created_by = 1 OR created_by = 2');
    await query('DELETE FROM tenants WHERE id = $1', [testTenantId]);
  });

  describe('GET /api/report-templates', () => {
    test('returns all public templates', async () => {
      const response = await request(app)
        .get('/api/report-templates')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Verify all returned templates are public
      response.body.forEach(template => {
        expect(template.is_public).toBe(true);
      });
    });

    test('filters templates by category', async () => {
      const response = await request(app)
        .get('/api/report-templates?category=survey')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);
      response.body.forEach(template => {
        expect(template.category).toBe('survey');
      });
    });

    test('searches templates by name', async () => {
      const response = await request(app)
        .get('/api/report-templates?search=NPS')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);
      response.body.forEach(template => {
        expect(
          template.name.toLowerCase().includes('nps') ||
          template.description?.toLowerCase().includes('nps')
        ).toBe(true);
      });
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/report-templates');

      expect(response.status).toBe(401);
    });

    test('orders templates by usage count', async () => {
      const response = await request(app)
        .get('/api/report-templates')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);

      // Verify descending order by usage_count
      for (let i = 1; i < response.body.length; i++) {
        expect(response.body[i - 1].usage_count).toBeGreaterThanOrEqual(
          response.body[i].usage_count
        );
      }
    });
  });

  describe('GET /api/report-templates/:id', () => {
    test('returns specific template by id', async () => {
      // Get a template id from the list
      const listResponse = await request(app)
        .get('/api/report-templates')
        .set('Cookie', [`access_token=${userToken}`]);

      const templateId = listResponse.body[0].id;

      const response = await request(app)
        .get(`/api/report-templates/${templateId}`)
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(templateId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('layout');
      expect(response.body).toHaveProperty('widgets');
    });

    test('returns 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/report-templates/99999')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Template not found');
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/report-templates/1');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/report-templates/:templateId/create-report', () => {
    let testSurveyId;
    let templateId;

    beforeAll(async () => {
      // Create test survey
      const surveyResult = await query(
        `INSERT INTO forms (tenant_id, title, definition, created_by)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [testTenantId, 'Test Survey', '{"pages":[]}', 1]
      );
      testSurveyId = surveyResult.rows[0].id;

      // Get a template id
      const listResponse = await request(app)
        .get('/api/report-templates')
        .set('Cookie', [`access_token=${userToken}`]);
      templateId = listResponse.body[0].id;
    });

    afterAll(async () => {
      await query('DELETE FROM reports WHERE form_id = $1', [testSurveyId]);
      await query('DELETE FROM forms WHERE id = $1', [testSurveyId]);
    });

    test('creates report from template', async () => {
      const response = await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({
          surveyId: testSurveyId,
          title: 'My Custom Report'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toHaveProperty('id');
      expect(response.body.report.title).toBe('My Custom Report');
      expect(response.body.report.form_id).toBe(testSurveyId);
    });

    test('auto-generates title if not provided', async () => {
      const response = await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({
          surveyId: testSurveyId
        });

      expect(response.status).toBe(200);
      expect(response.body.report.title).toContain('Test Survey');
    });

    test('increments template usage count', async () => {
      // Get initial usage count
      const beforeResponse = await request(app)
        .get(`/api/report-templates/${templateId}`)
        .set('Cookie', [`access_token=${userToken}`]);

      const initialCount = beforeResponse.body.usage_count;

      // Create report from template
      await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({ surveyId: testSurveyId });

      // Verify usage count increased
      const afterResponse = await request(app)
        .get(`/api/report-templates/${templateId}`)
        .set('Cookie', [`access_token=${userToken}`]);

      expect(afterResponse.body.usage_count).toBe(initialCount + 1);
    });

    test('returns 400 if surveyId missing', async () => {
      const response = await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('surveyId is required');
    });

    test('returns 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/report-templates/99999/create-report')
        .set('Cookie', [`access_token=${userToken}`])
        .send({ surveyId: testSurveyId });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Template not found');
    });

    test('returns 404 for non-existent survey', async () => {
      const response = await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({ surveyId: 'non-existent-survey' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Survey not found');
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .post(`/api/report-templates/${templateId}/create-report`)
        .send({ surveyId: testSurveyId });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/report-templates (admin only)', () => {
    test('admin can create custom template', async () => {
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Custom Template',
          description: 'Test custom template',
          category: 'survey',
          layout: [{ i: 'widget-1', x: 0, y: 0, w: 6, h: 4 }],
          widgets: [{ id: 'widget-1', type: 'chart', config: {} }],
          is_public: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.template).toHaveProperty('id');
      expect(response.body.template.name).toBe('Custom Template');
    });

    test('non-admin cannot create template', async () => {
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${userToken}`])
        .send({
          name: 'Unauthorized Template',
          category: 'survey',
          layout: [],
          widgets: []
        });

      expect(response.status).toBe(403);
    });

    test('validates required fields', async () => {
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Incomplete Template'
          // Missing category, layout, widgets
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('required fields');
    });

    test('validates category values', async () => {
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Invalid Category',
          category: 'invalid-category',
          layout: [],
          widgets: []
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid category');
    });
  });

  describe('PUT /api/report-templates/:id (admin only)', () => {
    let testTemplateId;

    beforeEach(async () => {
      // Create a test template
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Template to Update',
          category: 'survey',
          layout: [],
          widgets: []
        });

      testTemplateId = response.body.template.id;
    });

    test('admin can update template', async () => {
      const response = await request(app)
        .put(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Updated Template Name',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.template.name).toBe('Updated Template Name');
      expect(response.body.template.description).toBe('Updated description');
    });

    test('non-admin cannot update template', async () => {
      const response = await request(app)
        .put(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${userToken}`])
        .send({ name: 'Unauthorized Update' });

      expect(response.status).toBe(403);
    });

    test('returns 404 for non-existent template', async () => {
      const response = await request(app)
        .put('/api/report-templates/99999')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });

    test('validates category if provided', async () => {
      const response = await request(app)
        .put(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({ category: 'invalid-category' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid category');
    });

    test('returns 400 if no fields to update', async () => {
      const response = await request(app)
        .put(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${adminToken}`])
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No fields to update');
    });
  });

  describe('DELETE /api/report-templates/:id (admin only)', () => {
    let testTemplateId;

    beforeEach(async () => {
      // Create a test template
      const response = await request(app)
        .post('/api/report-templates')
        .set('Cookie', [`access_token=${adminToken}`])
        .send({
          name: 'Template to Delete',
          category: 'survey',
          layout: [],
          widgets: []
        });

      testTemplateId = response.body.template.id;
    });

    test('admin can delete template', async () => {
      const response = await request(app)
        .delete(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify template is deleted
      const getResponse = await request(app)
        .get(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(getResponse.status).toBe(404);
    });

    test('non-admin cannot delete template', async () => {
      const response = await request(app)
        .delete(`/api/report-templates/${testTemplateId}`)
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(403);
    });

    test('returns 404 for non-existent template', async () => {
      const response = await request(app)
        .delete('/api/report-templates/99999')
        .set('Cookie', [`access_token=${adminToken}`]);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/report-templates/meta/categories', () => {
    test('returns category counts', async () => {
      const response = await request(app)
        .get('/api/report-templates/meta/categories')
        .set('Cookie', [`access_token=${userToken}`]);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach(category => {
        expect(category).toHaveProperty('category');
        expect(category).toHaveProperty('count');
        expect(typeof category.count).toBe('string');
      });
    });

    test('requires authentication', async () => {
      const response = await request(app)
        .get('/api/report-templates/meta/categories');

      expect(response.status).toBe(401);
    });
  });
});
