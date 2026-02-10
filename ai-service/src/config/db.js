const { Pool } = require('pg');

const config = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    max: 10, // Pool size
    idleTimeoutMillis: 30000,
};

if (process.env.INSTANCE_CONNECTION_NAME) {
    config.host = `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`;
    delete config.port; // Unix socket
} else {
    config.host = process.env.DB_HOST || 'localhost';
}

const pool = new Pool(config);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};
