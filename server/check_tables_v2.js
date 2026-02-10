const { Client } = require('pg');

async function checkDb(dbName) {
    const client = new Client({
        user: 'postgres',
        host: '127.0.0.1',
        database: dbName,
        password: 'VTRUSTX@2030',
        port: 5432,
    });
    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        console.log(`Tables in ${dbName}:`, res.rows.length);
        await client.end();
    } catch (err) {
        console.error(`Error connecting to ${dbName}:`, err.message);
    }
}

async function main() {
    await checkDb('vtrustx_db');
    await checkDb('vtrustx-db');
}

main();
