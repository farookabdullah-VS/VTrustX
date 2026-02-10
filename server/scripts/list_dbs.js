const { Client } = require('pg');
require('dotenv').config();

async function listDatabases() {
    const config = {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'VTrustX@2030',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: 'postgres' // Connect to default postgres DB to list others
    };

    console.log('Connecting to:', { ...config, password: '***' });
    const client = new Client(config);

    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

listDatabases();
