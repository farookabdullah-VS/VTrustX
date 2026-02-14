try {
    const dotenv = require('dotenv');
    dotenv.config();
} catch (e) { /* dotenv optional */ }

// Initialize Sentry as early as possible
const { initSentry, getSentryErrorHandler } = require('./src/config/sentry');

const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('./src/infrastructure/logger');
const requestLogger = require('./src/api/middleware/requestLogger');
const { errorHandler } = require('./src/api/middleware/errorHandler');
const { rateLimitCache } = require('./src/infrastructure/cache');

logger.info('Server starting', {
    host: process.env.DB_HOST,
    db: process.env.DB_NAME,
    instance: process.env.INSTANCE_CONNECTION_NAME ? 'Set' : 'Unset',
    port: process.env.PORT,
});

const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Sentry request handlers (must be before other middleware)
initSentry(app);

// --- Rate Limiting using CacheService ---
const createRateLimiter = (limit = 100, windowSec = 60) => {
    return async (req, res, next) => {
        const key = `${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;

        try {
            // Use atomic increment for accurate rate limiting
            const current = await rateLimitCache.incr(key, windowSec);

            if (current > limit) {
                res.setHeader('Retry-After', String(windowSec));
                logger.warn('Rate limit exceeded', { ip: req.ip, limit, current });
                return res.status(429).json({ error: 'Too many requests. Please try again later.' });
            }

            next();
        } catch (err) {
            // If rate limiting fails, log and allow request through (fail open)
            logger.error('Rate limiter error', { error: err.message, ip: req.ip });
            next();
        }
    };
};

app.use(createRateLimiter(1000)); // Global limit
app.use('/api/auth', createRateLimiter(100));
app.use('/api/ai', createRateLimiter(100));
app.use('/api/exports', createRateLimiter(50));

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://www.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://*.firebaseio.com", "https://*.googleapis.com"],
            frameSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    crossOriginEmbedderPolicy: false,
}));

const corsOptions = {
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
        : (process.env.NODE_ENV === 'production' ? false : true),
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(cookieParser());

// --- CSRF Protection (double-submit cookie pattern) ---
const { doubleCsrf } = require('csrf-csrf');

const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'vtrustx-csrf-fallback';
const { generateCsrfToken: generateToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => csrfSecret,
    getSessionIdentifier: (req) => req.cookies?.access_token || req.ip || 'anonymous',
    cookieName: '__csrf',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// CSRF token endpoint (must be before CSRF protection middleware)
app.get('/api/auth/csrf-token', (req, res) => {
    const token = generateToken(req, res);
    res.json({ csrfToken: token });
});

// Apply CSRF protection to all state-changing requests, exclude safe methods and public endpoints
app.use((req, res, next) => {
    // Skip CSRF for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    // Skip CSRF for public endpoints that don't need it
    const publicPaths = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/google',
        '/api/auth/google/callback',
        '/api/auth/microsoft',
        '/api/auth/microsoft/callback',
        '/api/submissions',  // Public form submissions
        '/api/crm/webhooks/',
        '/api/crm/public/',
        '/api/webhooks/whatsapp/', // Twilio WhatsApp webhooks
        '/api/webhooks/email/',    // Email provider webhooks
        '/api/webhooks/sms/',      // SMS provider webhooks
        '/health',
        '/ready',
    ];
    if (publicPaths.some(p => req.path.startsWith(p))) return next();
    // Skip CSRF for form password check (public endpoint)
    if (req.path.match(/^\/api\/forms\/[^/]+\/check-password$/)) return next();

    doubleCsrfProtection(req, res, next);
});

// Request ID + structured HTTP logging (replaces console.log request logger)
app.use(requestLogger);

// Initialize Passport
const passport = require('./src/config/passport');
app.use(passport.initialize());
logger.info('Passport initialized');

// --- Health & Readiness Endpoints ---
const db = require('./src/infrastructure/database/db');

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.get('/ready', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ ready: true, timestamp: new Date().toISOString() });
    } catch (err) {
        logger.error('Readiness check failed', { error: err.message });
        res.status(503).json({ ready: false, error: 'Database unavailable' });
    }
});

// --- Swagger API Docs ---
if (process.env.NODE_ENV !== 'production') {
    const swaggerUi = require('swagger-ui-express');
    const swaggerSpec = require('./src/config/swagger');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
    logger.info('Swagger UI available at /api-docs');
}

// --- Routes ---
const formsRouter = require('./src/api/routes/forms');
app.use('/api/forms', formsRouter);
app.use('/api/submissions', require('./src/api/routes/submissions'));
app.use('/api/ai', require('./src/api/routes/ai'));
app.use('/api/workflows', require('./src/api/routes/workflows'));
app.use('/api/insights', require('./src/api/routes/insights'));
app.use('/api/ai-providers', require('./src/api/routes/ai-providers'));
const authenticate = require('./src/api/middleware/auth');
// Debug routes removed for security — arbitrary SQL execution is not safe in production
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
app.use('/api/sentiment', require('./src/api/routes/sentiment'));

const agentChatRouter = require('./src/api/routes/agent_chat');
app.get('/api/agent-chat/test-inline', (req, res) => res.json([{ id: 1, title: 'Inline Survey' }]));
app.use('/api/agent-chat', agentChatRouter);

app.use('/api/crm', require('./src/api/routes/crm'));
app.use('/api/cx-personas', require('./src/api/routes/cx_personas'));
app.use('/api/customer360', require('./src/api/routes/customer360'));
app.use('/api/journeys', require('./src/api/routes/journeys'));
app.use('/api/cjm', require('./src/api/routes/cjm'));
app.use('/api/cjm-export', require('./src/api/routes/cjm_export'));
app.use('/api/cx-persona-templates', require('./src/api/routes/cx_persona_templates'));
app.use('/api/notifications', require('./src/api/routes/notifications'));
app.use('/api/quotas', require('./src/api/routes/quotas'));
app.use('/api/email', require('./src/api/routes/email'));
app.use('/v1/persona', require('./src/api/routes/persona_engine'));
app.use('/api/master', require('./src/api/routes/master_data'));
app.use('/api/v1/social-media', require('./src/api/routes/social_media'));
app.use('/api/v1/social-listening', require('./src/api/routes/social_listening/index'));
app.use('/api/v1/smm', require('./src/api/routes/smm'));
app.use('/api/actions', require('./src/api/routes/actions'));
app.use('/api/close-loop', require('./src/api/routes/close_loop'));
app.use('/api/distributions', require('./src/api/routes/distributions/index'));
app.use('/api/media', require('./src/api/routes/media/index'));
app.use('/api/ab-tests', require('./src/api/routes/ab-testing/index'));
app.use('/api/webhooks/whatsapp', require('./src/api/routes/webhooks/whatsapp'));
app.use('/api/webhooks/email', require('./src/api/routes/webhooks/email-webhooks'));
app.use('/api/webhooks/sms', require('./src/api/routes/webhooks/sms-webhooks'));
app.use('/api/reputation', require('./src/api/routes/reputation/index'));
app.use('/api/directory', require('./src/api/routes/directory/index'));
app.use('/api/textiq', require('./src/api/routes/textiq/index'));
app.use('/api/workflows', require('./src/api/routes/workflows/index'));
app.use('/api/workflow-executions', require('./src/api/routes/workflow-executions'));
app.use('/api/workflow-templates', require('./src/api/routes/workflow-templates'));
app.use('/api/scheduled-exports', require('./src/api/routes/scheduled-exports'));
logger.info('All routes loaded');

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve Uploads (Local/Tmp)
const uploadDir = process.env.K_SERVICE ? '/tmp/uploads' : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// The "catchall" handler
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

// --- Sentry Error Handler (before global error handler) ---
app.use(getSentryErrorHandler());

// --- Global Error Handler ---
app.use(errorHandler);

// --- Run Migrations ---
async function runMigrations() {
    const scripts = [
        { name: 'reports', fn: require('./src/scripts/ensure_reports_table') },
        { name: 'analytics', fn: require('./src/scripts/ensure_analytics_tables') },
        { name: 'quotas', fn: require('./src/scripts/ensure_quotas_table') },
        { name: 'cjm', fn: require('./src/scripts/ensure_cjm_tables') },
        { name: 'indexes', fn: require('./src/scripts/ensure_indexes') },
        { name: 'refresh_tokens', fn: require('./src/scripts/ensure_refresh_tokens_table') },
        { name: 'social_listening', fn: require('./src/scripts/ensure_social_listening_tables') },
    ];

    for (const script of scripts) {
        try {
            await script.fn();
            logger.debug(`Migration "${script.name}" completed`);
        } catch (err) {
            logger.error(`Migration "${script.name}" failed`, { error: err.message });
        }
    }
    logger.info(`All ${scripts.length} migrations processed`);
}

// --- Server Start ---
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server listening on 0.0.0.0:${PORT}`);
});

// --- Start Cron Jobs ---
// A/B Test Auto-Winner Detection (optional - can be disabled via env var)
if (process.env.ENABLE_AB_AUTO_WINNER !== 'false') {
    try {
        require('./src/jobs/abTestMonitor');
        logger.info('[Cron] A/B test auto-winner detection enabled');
    } catch (err) {
        logger.error('[Cron] Failed to start A/B test monitor', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
    }
}

// Social Listening AI Processor (optional - can be disabled via env var)
if (process.env.ENABLE_SOCIAL_LISTENING_AI !== 'false') {
    try {
        const socialListeningProcessor = require('./src/jobs/socialListeningProcessor');
        socialListeningProcessor.start();
        logger.info('[Cron] Social listening AI processor enabled');
    } catch (err) {
        logger.error('[Cron] Failed to start social listening processor', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
    }
}

// Data Sync Scheduler (optional - can be disabled via env var)
if (process.env.ENABLE_DATA_SYNC !== 'false') {
    try {
        const dataSyncScheduler = require('./src/jobs/dataSyncScheduler');
        dataSyncScheduler.start();
        logger.info('[Cron] Data sync scheduler enabled');
    } catch (err) {
        logger.error('[Cron] Failed to start data sync scheduler', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
    }
}

// Alert Monitor (optional - can be disabled via env var)
if (process.env.ENABLE_ALERT_MONITOR !== 'false') {
    try {
        const alertMonitor = require('./src/jobs/alertMonitor');
        alertMonitor.start();
        logger.info('[Cron] Alert monitor enabled');
    } catch (err) {
        logger.error('[Cron] Failed to start alert monitor', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
    }
}

// Scheduled Export Processor (optional - can be disabled via env var)
if (process.env.ENABLE_SCHEDULED_EXPORTS !== 'false') {
    try {
        const scheduledExportProcessor = require('./src/jobs/scheduledExportProcessor');
        scheduledExportProcessor.start();
        logger.info('[Cron] Scheduled export processor enabled');
    } catch (err) {
        logger.error('[Cron] Failed to start scheduled export processor', {
            error: err.message,
            stack: err.stack,
            name: err.name
        });
    }
}

// --- Graceful Shutdown ---
const gracefulShutdown = (signal) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    server.close(() => {
        logger.info('HTTP server closed');
        db.gracefulShutdown()
            .then(() => {
                logger.info('Database pool closed');
                process.exit(0);
            })
            .catch((err) => {
                logger.error('Error closing database pool', { error: err.message });
                process.exit(1);
            });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// --- Background Services ---
const emailService = require('./src/services/emailService');
setInterval(() => {
    if (process.env.NODE_ENV !== 'test') {
        logger.debug('Triggering email sync...');
        emailService.processAllChannels();
    }
}, 60000);

// Delayed startup tasks
setTimeout(() => {
    if (process.env.NODE_ENV !== 'test') {
        emailService.processAllChannels();
        runMigrations();

        // Seed default workflow templates
        const WorkflowTemplateService = require('./src/services/WorkflowTemplateService');
        WorkflowTemplateService.seedDefaultTemplates().catch(err => {
            logger.error('[Startup] Failed to seed workflow templates', { error: err.message });
        });
    }
}, 5000);

