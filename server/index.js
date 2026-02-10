console.log("Server Process Starting...");
try {
    const dotenv = require('dotenv');
    dotenv.config();
} catch (e) {
    console.log("Dotenv skipped/failed:", e.message);
}

const express = require('express');
const cors = require('cors');
const path = require('path');

console.log("Stage 1: Modules Loaded. Config:", {
    host: process.env.DB_HOST,
    db: process.env.DB_NAME,
    instance: process.env.INSTANCE_CONNECTION_NAME ? 'Set' : 'Unset',
    port: process.env.PORT
});

const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate Limiting (Issue 19)
const NodeCache = require('node-cache');
const rateLimitCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
const rateLimiter = (limit = 100, windowMs = 60000) => {
    return (req, res, next) => {
        const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
        const current = rateLimitCache.get(key) || 0;
        if (current >= limit) {
            return res.status(429).json({ error: 'Too many requests. Please try again later.' });
        }
        rateLimitCache.set(key, current + 1, 60);
        next();
    };
};

app.use(rateLimiter(200)); // Global limit
app.use('/api/auth', rateLimiter(20)); // Stricter limit for auth
console.log(`Stage 2: Starting VTrustX Server on ${PORT} (v2.2 - Debugging)...`);

const formsRouter = require('./src/api/routes/forms');
console.log("Stage 3: Forms Router Loaded");

app.set('trust proxy', 1); // Only trust the first proxy (e.g. Cloud Run LB)
// app.use(helmet({
//     contentSecurityPolicy: false, 
// }));

const corsOptions = {
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
    credentials: true
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
const debugLog = require('./src/api/routes/debug_logger');
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    debugLog(`[Request] ${req.method} ${req.url}`);
    next();
});

// Initialize Passport
const passport = require('./src/config/passport');
app.use(passport.initialize());
console.log("Stage 4: Passport Initialized");

// Routes
app.use('/api/forms', formsRouter);
app.use('/api/submissions', require('./src/api/routes/submissions'));
app.use('/api/ai', require('./src/api/routes/ai')); // Creation AI
app.use('/api/workflows', require('./src/api/routes/workflows'));
app.use('/api/insights', require('./src/api/routes/insights'));
app.use('/api/ai-providers', require('./src/api/routes/ai-providers'));
const authenticate = require('./src/api/middleware/auth');
app.use('/api/debug', authenticate, require('./src/api/routes/debug'));
app.use('/api/debug-db', authenticate, require('./src/api/routes/debug_db'));
app.use('/api/auth', require('./src/api/routes/auth'));
app.use('/api/plans', require('./src/api/routes/plans'));
app.use('/api/subscriptions', require('./src/api/routes/subscriptions'));
app.use('/api/admin/discounts', require('./src/api/routes/admin_discounts'));
app.use('/api/admin/config/plans', require('./src/api/routes/admin_plans_config'));
app.use('/api/tenants', require('./src/api/routes/tenants'));
app.use('/api/admin', require('./src/api/routes/admin'));
app.use('/api/settings', require('./src/api/routes/settings'));
app.use('/api/files', require('./src/api/routes/files'));
app.use('/api/integrations', require('./src/api/routes/integrations'));
app.use('/api/reports', require('./src/api/routes/reports'));
app.use('/api/exports', require('./src/api/routes/exports'));
app.use('/api/folders', require('./src/api/routes/folders'));
app.use('/api/shared', require('./src/api/routes/shared_dashboards'));
app.use('/api/users', require('./src/api/routes/users'));
app.use('/api/roles', require('./src/api/routes/roles'));
app.use('/api/contacts', require('./src/api/routes/contacts'));
app.use('/api/form-audience', require('./src/api/routes/form_contacts'));
app.use('/api/calls', require('./src/api/routes/calls'));
app.use('/api/ai-service', require('./src/api/routes/ai_proxy'));
app.use('/api/analytics', require('./src/api/routes/analytics'));
console.log("Stage 5: Base Routes Loaded");

const agentChatRouter = require('./src/api/routes/agent_chat');
console.log("Agent Chat Router Type:", typeof agentChatRouter, agentChatRouter.name);
app.get('/api/agent-chat/test-inline', (req, res) => res.json([{ id: 1, title: 'Inline Survey' }]));
app.use('/api/agent-chat', agentChatRouter);

app.use('/api/crm', require('./src/api/routes/crm'));
app.use('/api/cx-personas', require('./src/api/routes/cx_personas'));
app.use('/api/customer360', require('./src/api/routes/customer360'));
app.use('/api/journeys', require('./src/api/routes/journeys'));
app.use('/api/cjm', require('./src/api/routes/cjm')); // New CJM Grid Builder
app.use('/api/cjm-export', require('./src/api/routes/cjm_export')); // CJM Export
app.use('/api/cx-persona-templates', require('./src/api/routes/cx_persona_templates'));
app.use('/api/notifications', require('./src/api/routes/notifications'));
app.use('/api/quotas', require('./src/api/routes/quotas'));
app.use('/api/email', require('./src/api/routes/email'));
app.use('/v1/persona', require('./src/api/routes/persona_engine'));
app.use('/api/master', require('./src/api/routes/master_data'));
app.use('/api/v1/social-media', require('./src/api/routes/social_media'));
app.use('/api/v1/smm', require('./src/api/routes/smm'));
app.use('/api/actions', require('./src/api/routes/actions')); // Action Planning
app.use('/api/distributions', require('./src/api/routes/distributions/index')); // Campaign Manager
app.use('/api/reputation', require('./src/api/routes/reputation/index')); // Reputation Management
app.use('/api/directory', require('./src/api/routes/directory/index')); // XM Directory
app.use('/api/textiq', require('./src/api/routes/textiq/index')); // Text iQ
app.use('/api/workflows', require('./src/api/routes/workflows/index')); // Workflow Automation
console.log("Stage 6: All Routes Loaded");

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve Uploads (Local/Tmp)
const uploadDir = process.env.K_SERVICE ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// The "catchall" handler
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error(`[Internal Error] ${req.method} ${req.url}:`, err);

    const isProd = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;

    res.status(err.status || 500).json({
        error: isProd ? 'An internal error occurred.' : err.message,
        stack: isProd ? null : err.stack
    });
});

// Explicitly listen on 0.0.0.0 for Cloud Run
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully listening on 0.0.0.0:${PORT}`);
    console.log('Theme system initialized.');
});

// Email Service
const emailService = require('./src/services/emailService');
setInterval(() => {
    if (process.env.NODE_ENV !== 'test') { // Avoid spamming logs in simple tests
        console.log('[Scheduler] Triggering Email Sync...');
        emailService.processAllChannels();
    }
}, 60000);

// Short delay start
setTimeout(() => {
    if (process.env.NODE_ENV !== 'test') {
        emailService.processAllChannels();
        // Ensure Schema
        try {
            const ensureReportsTable = require('./src/scripts/ensure_reports_table');
            const ensureAnalyticsTables = require('./src/scripts/ensure_analytics_tables');
            const ensureQuotasTable = require('./src/scripts/ensure_quotas_table');
            ensureReportsTable();
            ensureAnalyticsTables();
            ensureQuotasTable();
            const ensureCJMTables = require('./src/scripts/ensure_cjm_tables');
            ensureCJMTables();
        } catch (e) { console.error("Failed to init schema:", e); }
    }
}, 5000);

