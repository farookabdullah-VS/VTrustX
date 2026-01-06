require('dotenv').config({ override: true });
// Force Restart 2
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log("DB CONFIG:", {
    host: process.env.DB_HOST,
    db: process.env.DB_NAME,
    user: process.env.DB_USER
});

const app = express();
const PORT = process.env.PORT || 3000;
console.log("Starting VTrustX Server (v2.1 - Quotas Enabled)...");

const formsRouter = require('./src/api/routes/forms');

app.enable('trust proxy'); // Required for Cloud Run to detect HTTPS
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// Initialize Passport
const passport = require('./src/config/passport');
app.use(passport.initialize());

app.use('/api/forms', formsRouter);
app.use('/api/submissions', require('./src/api/routes/submissions'));
app.use('/api/ai', require('./src/api/routes/ai')); // Creation AI
app.use('/api/workflows', require('./src/api/routes/workflows')); // Automation Workflows
app.use('/api/insights', require('./src/api/routes/insights')); // Analytics/Insights
app.use('/api/ai-providers', require('./src/api/routes/ai-providers')); // AI Configuration
app.use('/api/debug', require('./src/api/routes/debug'));
app.use('/api/auth', require('./src/api/routes/auth')); // Authentication
app.use('/api/plans', require('./src/api/routes/plans')); // Public Plans
app.use('/api/tenants', require('./src/api/routes/tenants')); // Tenant Registration
app.use('/api/admin', require('./src/api/routes/admin')); // Global Admin Management
app.use('/api/settings', require('./src/api/routes/settings')); // System Settings
app.use('/api/files', require('./src/api/routes/files')); // Encrypted Files
app.use('/api/integrations', require('./src/api/routes/integrations')); // Third-party Integrations
app.use('/api/reports', require('./src/api/routes/reports')); // BI Data Feeds
app.use('/api/users', require('./src/api/routes/users')); // User Management
app.use('/api/roles', require('./src/api/routes/roles')); // Role Master
app.use('/api/contacts', require('./src/api/routes/contacts')); // Contact Master
app.use('/api/form-audience', require('./src/api/routes/form_contacts')); // Survey Audience
app.use('/api/calls', require('./src/api/routes/calls')); // AI Agent Calls
const agentChatRouter = require('./src/api/routes/agent_chat');
console.log("Agent Chat Router Type:", typeof agentChatRouter, agentChatRouter.name);
app.get('/api/agent-chat/test-inline', (req, res) => res.json([{ id: 1, title: 'Inline Survey' }]));
app.use('/api/agent-chat', agentChatRouter); // Real-time Agent Chat
app.use('/api/crm', require('./src/api/routes/crm')); // CRM Ticketing
app.use('/api/cx-personas', require('./src/api/routes/cx_personas')); // CX Personas
app.use('/api/customer360', require('./src/api/routes/customer360')); // Customer 360 Golden Record
app.use('/api/journeys', require('./src/api/routes/journeys')); // Journey Orchestration
app.use('/api/cx-persona-templates', require('./src/api/routes/cx_persona_templates')); // Persona Templates
app.use('/api/notifications', require('./src/api/routes/notifications'));
app.use('/api/quotas', require('./src/api/routes/quotas'));
app.use('/api/ai', require('./src/api/routes/ai')); // Quota Management
app.use('/api/email', require('./src/api/routes/email')); // Email Sending
app.use('/v1/persona', require('./src/api/routes/persona_engine')); // Persona Calculation Engine
app.use('/api/master', require('./src/api/routes/master_data')); // Master Data (Countries/Cities)

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Email Service Polling (Every 60s)
const emailService = require('./src/services/emailService');
setInterval(() => {
    console.log('[Scheduler] Triggering Email Sync...');
    emailService.processAllChannels();
}, 60000);

// Short delay start
setTimeout(() => { emailService.processAllChannels(); }, 10000);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Theme system initialized. ');
});
