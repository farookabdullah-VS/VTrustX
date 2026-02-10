console.log("[DEBUG] db.js loading...");
const { Pool } = require('pg');
const path = require('path');
try {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
} catch (e) { }

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Yaalla@123',
    database: process.env.DB_NAME || 'rayix_db',
    port: process.env.DB_PORT || 5432,
};

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

const pool = new Pool(config);

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool
};
