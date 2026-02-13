const { Pool } = require('pg');
const path = require('path');
const logger = require('../logger');

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
    logger.warn("Missing DB credentials in environment. Using defaults for development.");
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
    logger.info(`Running in Cloud Run. Using Unix Socket: /cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`);
    config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete config.port; // Port is irrelevant for Unix Sockets
} else {
    // Local / TCP Fallback
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 5432;
    logger.info(`Using TCP Connection: ${host}:${port}`);

    // Warn if it looks like we wanted Cloud SQL but are forcing TCP (e.g. local proxy)
    if (process.env.INSTANCE_CONNECTION_NAME && !isCloudRun) {
        logger.info("INSTANCE_CONNECTION_NAME found but not in Cloud Run. Defaulting to TCP (likely local Cloud SQL Proxy).");
    }

    config.host = host;
    config.port = port;
}

logger.debug("DB Config initialized", { host: config.host, database: config.database, port: config.port || 'unix-socket' });

const pool = new Pool({
    ...config,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    logger.error('Unexpected pool error', {
        error: err.message,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
    });
});

const getPoolStats = () => ({
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
});

const gracefulShutdown = async () => {
    await pool.end();
};

/**
 * Run a callback within a database transaction.
 * Automatically commits on success, rolls back on error.
 *
 * Usage:
 *   const result = await transaction(async (client) => {
 *       await client.query('INSERT INTO ...');
 *       await client.query('UPDATE ...');
 *       return someValue;
 *   });
 */
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool,
    connect: () => pool.connect(),
    transaction,
    getPoolStats,
    gracefulShutdown,
};
