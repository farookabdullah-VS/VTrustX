import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// In-memory data store
const db = {
  users: [
    {
      id: '1',
      username: 'admin',
      email: 'admin@vtrustx.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      username: 'editor',
      email: 'editor@vtrustx.com',
      role: 'editor',
      firstName: 'Editor',
      lastName: 'User',
      createdAt: new Date().toISOString()
    }
  ],
  forms: [
    {
      id: 'form-1',
      title: 'Customer Satisfaction Survey',
      slug: 'csat-2026',
      description: 'Help us improve our service',
      definition: {
        title: 'Customer Satisfaction Survey',
        pages: [
          {
            elements: [
              {
                type: 'rating',
                name: 'satisfaction',
                title: 'How satisfied are you?',
                rateMin: 1,
                rateMax: 5,
                isRequired: true
              },
              {
                type: 'comment',
                name: 'feedback',
                title: 'Additional feedback',
                isRequired: false
              }
            ]
          }
        ]
      },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'form-2',
      title: 'NPS Survey',
      slug: 'nps-2026',
      description: 'Rate your experience',
      definition: {
        title: 'Net Promoter Score',
        pages: [
          {
            elements: [
              {
                type: 'rating',
                name: 'nps',
                title: 'How likely are you to recommend us?',
                rateMin: 0,
                rateMax: 10,
                isRequired: true
              }
            ]
          }
        ]
      },
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  submissions: [],
  tokens: {},
  roles: [
    { id: '1', name: 'admin', permissions: ['all'] },
    { id: '2', name: 'editor', permissions: ['forms:read', 'forms:write'] },
    { id: '3', name: 'viewer', permissions: ['forms:read'] }
  ]
};

// Helper: Generate token
function generateToken(userId) {
  const token = uuidv4();
  db.tokens[token] = { userId, createdAt: Date.now() };
  return token;
}

// Helper: Verify token
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  const token = authHeader.replace('Bearer ', '');
  const tokenData = db.tokens[token];

  if (!tokenData) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Token expires after 24 hours
  if (Date.now() - tokenData.createdAt > 24 * 60 * 60 * 1000) {
    delete db.tokens[token];
    return res.status(401).json({ error: 'Token expired' });
  }

  req.userId = tokenData.userId;
  req.user = db.users.find(u => u.id === tokenData.userId);
  next();
}

// ========== AUTH ENDPOINTS ==========

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  // Mock authentication - accept any password
  const user = db.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    }
  });
});

app.post('/api/auth/logout', authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader.replace('Bearer ', '');
  delete db.tokens[token];
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json(req.user);
});

// ========== FORMS ENDPOINTS ==========

app.get('/api/forms', (req, res) => {
  // Optional: Add query filters
  const { published } = req.query;

  let forms = db.forms;

  if (published !== undefined) {
    const isPublished = published === 'true';
    forms = forms.filter(f => f.isPublished === isPublished);
  }

  res.json(forms);
});

app.get('/api/forms/:id', (req, res) => {
  const form = db.forms.find(f => f.id === req.params.id);

  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  res.json(form);
});

app.get('/api/forms/slug/:slug', (req, res) => {
  const form = db.forms.find(f => f.slug === req.params.slug);

  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  res.json(form);
});

app.post('/api/forms', authenticate, (req, res) => {
  const { title, slug, definition, description, isPublished } = req.body;

  const form = {
    id: uuidv4(),
    title,
    slug: slug || `survey-${Date.now()}`,
    description: description || '',
    definition,
    isPublished: isPublished || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: req.userId
  };

  db.forms.push(form);

  res.status(201).json(form);
});

app.put('/api/forms/:id', authenticate, (req, res) => {
  const form = db.forms.find(f => f.id === req.params.id);

  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined) {
      form[key] = req.body[key];
    }
  });

  form.updatedAt = new Date().toISOString();

  res.json(form);
});

app.delete('/api/forms/:id', authenticate, (req, res) => {
  const index = db.forms.findIndex(f => f.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Form not found' });
  }

  db.forms.splice(index, 1);

  res.json({ message: 'Form deleted successfully' });
});

app.post('/api/forms/:id/publish', authenticate, (req, res) => {
  const form = db.forms.find(f => f.id === req.params.id);

  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  form.isPublished = true;
  form.updatedAt = new Date().toISOString();

  res.json(form);
});

// ========== SUBMISSIONS ENDPOINTS ==========

app.get('/api/submissions', (req, res) => {
  const { formId } = req.query;

  let submissions = db.submissions;

  if (formId) {
    submissions = submissions.filter(s => s.formId === formId);
  }

  res.json(submissions);
});

app.post('/api/submissions', (req, res) => {
  const { formId, data, metadata } = req.body;

  const submission = {
    id: uuidv4(),
    formId,
    data,
    metadata: metadata || {},
    submittedAt: new Date().toISOString()
  };

  db.submissions.push(submission);

  res.status(201).json(submission);
});

app.get('/api/submissions/:id', (req, res) => {
  const submission = db.submissions.find(s => s.id === req.params.id);

  if (!submission) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  res.json(submission);
});

// ========== USERS ENDPOINTS ==========

app.get('/api/users', authenticate, (req, res) => {
  // Remove password field
  const users = db.users.map(({ password, ...user }) => user);
  res.json(users);
});

app.get('/api/users/:id', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.post('/api/users', authenticate, (req, res) => {
  const { username, email, role, firstName, lastName } = req.body;

  // Check if email exists
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }

  const user = {
    id: uuidv4(),
    username,
    email,
    role: role || 'viewer',
    firstName: firstName || '',
    lastName: lastName || '',
    createdAt: new Date().toISOString()
  };

  db.users.push(user);

  res.status(201).json(user);
});

app.put('/api/users/:id', authenticate, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Update fields
  Object.keys(req.body).forEach(key => {
    if (req.body[key] !== undefined && key !== 'id') {
      user[key] = req.body[key];
    }
  });

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.delete('/api/users/:id', authenticate, (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.users.splice(index, 1);

  res.json({ message: 'User deleted successfully' });
});

// ========== ROLES ENDPOINTS ==========

app.get('/api/roles', authenticate, (req, res) => {
  res.json(db.roles);
});

app.post('/api/roles', authenticate, (req, res) => {
  const { name, permissions } = req.body;

  const role = {
    id: uuidv4(),
    name,
    permissions: permissions || []
  };

  db.roles.push(role);

  res.status(201).json(role);
});

// ========== HEALTH CHECK ==========

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: {
      users: db.users.length,
      forms: db.forms.length,
      submissions: db.submissions.length
    }
  });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'VTrustX Mock API',
    version: '1.0.0',
    endpoints: {
      auth: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/auth/me'
      ],
      forms: [
        'GET /api/forms',
        'GET /api/forms/:id',
        'GET /api/forms/slug/:slug',
        'POST /api/forms',
        'PUT /api/forms/:id',
        'DELETE /api/forms/:id',
        'POST /api/forms/:id/publish'
      ],
      submissions: [
        'GET /api/submissions',
        'POST /api/submissions',
        'GET /api/submissions/:id'
      ],
      users: [
        'GET /api/users',
        'GET /api/users/:id',
        'POST /api/users',
        'PUT /api/users/:id',
        'DELETE /api/users/:id'
      ],
      roles: [
        'GET /api/roles',
        'POST /api/roles'
      ]
    },
    testAccounts: [
      { email: 'admin@vtrustx.com', password: 'any', role: 'admin' },
      { email: 'editor@vtrustx.com', password: 'any', role: 'editor' }
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 VTrustX Mock API Server');
  console.log('═'.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📊 API Info: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('═'.repeat(50));
  console.log('\n📝 Test Accounts:');
  console.log('   • admin@vtrustx.com (role: admin)');
  console.log('   • editor@vtrustx.com (role: editor)');
  console.log('   Password: any password works\n');
  console.log('📋 Current Data:');
  console.log(`   • Users: ${db.users.length}`);
  console.log(`   • Forms: ${db.forms.length}`);
  console.log(`   • Submissions: ${db.submissions.length}\n`);
});
