const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function listRelatedTables() {
    try {
        console.log('--- Finding Customer Related Tables ---');

        // 1. Find tables starting with 'customer_' or 'cx_'
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE 'customer_%' OR table_name LIKE 'cx_%')
            ORDER BY table_name;
        `);

        if (tablesRes.rows.length === 0) {
            console.log('No related tables found.');
        } else {
            const tables = tablesRes.rows.map(r => r.table_name);
            console.log(`Found ${tables.length} tables:`, tables.join(', '));

            // 2. For each table, get row count and column names
            for (const table of tables) {
                console.log(`\n----------------------------------------`);
                console.log(`Table: ${table}`);

                // Get Columns
                const colsRes = await pool.query(`
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = $1
                    ORDER BY ordinal_position
                `, [table]);
                const columns = colsRes.rows.map(c => `${c.column_name}(${c.data_type})`).join(', ');
                console.log(`Columns: ${columns}`);

                // Get Row Count
                const countRes = await pool.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`Row Count: ${countRes.rows[0].count}`);

                // Get Sample Data (if any)
                if (parseInt(countRes.rows[0].count) > 0) {
                    const sampleRes = await pool.query(`SELECT * FROM ${table} LIMIT 3`);
                    console.log('Sample Data:', JSON.stringify(sampleRes.rows, null, 2));
                }
            }
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}

listRelatedTables();
