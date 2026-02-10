const { Client } = require('pg');
const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'postgres',
    password: 'VTRUSTX@2030',
    port: 5432,
});

async function listDbs() {
    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
        console.log('Databases:', res.rows.map(r => r.datname));
        await client.end();
    } catch (err) {
        console.error('Connection error:', err.stack);
    }
}

listDbs();
