const db = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log("Creating integrations table...");

        await db.query(`
            CREATE TABLE IF NOT EXISTS integrations (
                id SERIAL PRIMARY KEY,
                provider VARCHAR(50) NOT NULL, -- hubspot, salesforce, etc.
                name VARCHAR(100),
                api_key TEXT,
                webhook_url TEXT,
                config JSONB,
                is_active BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Seed basic providers if empty
        const providers = [
            'HubSpot', 'Microsoft Dynamics', 'Zendesk', 'Pipedrive',
            'Salesforce', 'Freshdesk', 'Power BI', 'Freshsales'
        ];

        // Check if empty
        const res = await db.query('SELECT COUNT(*) FROM integrations');
        if (res.rows[0].count == 0) {
            for (const p of providers) {
                await db.query('INSERT INTO integrations (provider, name) VALUES ($1, $1)', [p]);
            }
        }

        console.log("Migration complete.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
