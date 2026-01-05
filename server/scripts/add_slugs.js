const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Adding 'slug' column to forms table...");

        // 1. Add Column
        await db.query(`
            ALTER TABLE forms 
            ADD COLUMN IF NOT EXISTS slug VARCHAR(10) UNIQUE;
        `);

        // 2. Populate Slugs for existing forms
        const res = await db.query('SELECT id FROM forms WHERE slug IS NULL');
        const forms = res.rows;

        if (forms.length > 0) {
            console.log(`Generating slugs for ${forms.length} forms...`);
            for (const form of forms) {
                const slug = generateSlug();
                await db.query('UPDATE forms SET slug = $1 WHERE id = $2', [slug, form.id]);
            }
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

function generateSlug() {
    // Generate 6-char random string (uppercase)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

migrate();
