const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VTrustX API',
      version: '1.0.0',
      description: 'VTrustX platform API — forms, CRM, CJM, analytics, and more.',
    },
    servers: [
      { url: `http://localhost:${process.env.PORT || 3000}`, description: 'Local' },
      ...(process.env.API_URL ? [{ url: process.env.API_URL, description: 'Production' }] : []),
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'access_token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                code: { type: 'string' },
                statusCode: { type: 'integer' },
                details: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Forms', description: 'Form builder CRUD' },
      { name: 'Submissions', description: 'Form submission management' },
      { name: 'CRM', description: 'Tickets, contacts, accounts' },
      { name: 'CJM', description: 'Customer journey maps' },
      { name: 'Users', description: 'User management' },
      { name: 'Roles', description: 'Role & permission management' },
      { name: 'Settings', description: 'Tenant settings, channels, SLA, themes' },
      { name: 'Admin', description: 'Super-admin operations' },
      { name: 'Integrations', description: 'Third-party integrations' },
      { name: 'Reports', description: 'Reporting & analytics' },
      { name: 'Workflows', description: 'Automation workflows' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Plans', description: 'Subscription plans' },
      { name: 'Subscriptions', description: 'Tenant subscriptions' },
      { name: 'Folders', description: 'Form folder organization' },
      { name: 'Distributions', description: 'Survey distributions' },
      { name: 'Personas', description: 'CX personas' },
      { name: 'Customer360', description: 'Unified customer profiles' },
      { name: 'Exports', description: 'Data export' },
      { name: 'Contacts', description: 'Contact management' },
      { name: 'SharedDashboards', description: 'Shared dashboard links' },
      { name: 'Quotas', description: 'Form submission quotas' },
      { name: 'Tenants', description: 'Tenant registration' },
      { name: 'AdminDiscounts', description: 'Discount code management' },
      { name: 'AdminPlans', description: 'Plan configuration' },
      { name: 'PersonaEngine', description: 'Persona assignment engine' },
    ],
  },
  apis: ['./src/api/routes/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
