console.log("[DEBUG] db.js loading...");
const { Pool } = require('pg');
const path = require('path');
try {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch (e) { }

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
};

if (!config.user || !config.password || !config.database) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Database credentials (DB_USER, DB_PASSWORD, DB_NAME) must be defined in production.');
    }
    console.warn("WARNING: Missing DB credentials in environment. Using defaults for development.");
    config.user = config.user || 'postgres';
    config.password = config.password || process.env.DB_PASSWORD_DEV || 'change_me_in_env';
    config.database = config.database || 'rayix_db';
}

// Cloud Run Connection Logic (Unix Socket)
// Cloud Run Connection Logic (Unix Socket)
// Cloud Run Connection Logic (Unix Socket)
// Only use Unix Socket if strictly in Cloud Run (K_SERVICE is set)
const isCloudRun = !!process.env.K_SERVICE;

if (process.env.INSTANCE_CONNECTION_NAME && isCloudRun) {
    console.log(`[DB] running in Cloud Run. Using Unix Socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
    config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete config.port; // Port is irrelevant for Unix Sockets
} else {
    // Local / TCP Fallback
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    console.log(`[DB] Using TCP Connection: ${host}:${port}`);

    // Warn if it looks like we wanted Cloud SQL but are forcing TCP (e.g. local proxy)
    if (process.env.INSTANCE_CONNECTION_NAME && !isCloudRun) {
        console.log("[DB] Note: INSTANCE_CONNECTION_NAME found but not in Cloud Run. Defaulting to TCP (likely local Cloud SQL Proxy).");
    }

    config.host = host;
    config.port = port;
}

console.log("[DEBUG] DB Config:", { ...config, password: '***' });

const pool = new Pool({
    ...config,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
