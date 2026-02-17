const db = require('./src/infrastructure/database/db');

async function checkTenants() {
    try {
        const columns = await db.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tenants'
            ORDER BY ordinal_position
        `);

        console.log('\n=== Tenants Table Structure ===');
        console.log(JSON.stringify(columns.rows, null, 2));

        const sample = await db.query('SELECT id, name, domain, status FROM tenants LIMIT 3');
        console.log('\n=== Sample Tenants ===');
        console.log(JSON.stringify(sample.rows, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkTenants();
