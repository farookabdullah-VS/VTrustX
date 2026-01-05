const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres', password: 'postgres', host: 'localhost', port: 5432, database: 'vtrustx_db'
});

async function testForms() {
    try {
        // 1. Create
        const createSql = `
            INSERT INTO forms (title, slug, definition, version, is_published, created_at, updated_at)
            VALUES ('Test Form', 'TEST01', $1, 1, false, NOW(), NOW())
            RETURNING id
        `;
        const res = await pool.query(createSql, [{ foo: "bar" }]);
        const id = res.rows[0].id;
        console.log("Created form:", id);

        // 2. Update with settings
        const updateSql = `
            UPDATE forms SET
                allow_audio = $1,
                allow_camera = $2,
                allow_location = $3,
                start_date = $4,
                end_date = $5,
                response_limit = $6,
                password = $7,
                redirect_url = $8
            WHERE id = $9
        `;
        const params = [true, true, true, new Date(), new Date(), 100, 'pass', 'http://example.com', id];

        await pool.query(updateSql, params);
        console.log("Update Success!");

        // Cleanup
        await pool.query('DELETE FROM forms WHERE id = $1', [id]);

    } catch (e) {
        console.error("Test Failed:", e.message);
    } finally {
        await pool.end();
    }
}
testForms();
