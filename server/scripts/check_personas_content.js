const { pool } = require('../src/infrastructure/database/db');

async function checkPersonas() {
    try {
        const res = await pool.query('SELECT * FROM cx_personas');
        console.log('Personas found:', res.rows.length);
        if (res.rows.length > 0) {
            console.log('First Persona:', JSON.stringify(res.rows[0], null, 2));
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkPersonas();
