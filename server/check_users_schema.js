const { query } = require('./src/infrastructure/database/db');
const fs = require('fs');

async function check() {
    try {
        const result = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users'
        `);

        fs.writeFileSync('users_schema_check.txt', JSON.stringify(result.rows, null, 2), 'utf8');
        console.log('Users schema written to users_schema_check.txt');
    } catch (e) {
        fs.writeFileSync('users_schema_error.txt', e.stack, 'utf8');
        console.error('Error checking schema:', e);
    } finally {
        process.exit();
    }
}

check();
