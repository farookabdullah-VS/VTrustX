const { query } = require('../infrastructure/database/db');

async function ensureReportsTable() {
    try {
        console.log("[Schema] Checking 'reports' table...");
        const tableCheck = await query("SELECT to_regclass('public.reports')");

        if (!tableCheck.rows[0].to_regclass) {
            console.log("[Schema] Creating 'reports' table...");
            await query(`
                CREATE TABLE reports (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    form_id INTEGER,
                    layout JSONB DEFAULT '[]',
                    widgets JSONB DEFAULT '{}',
                    theme JSONB DEFAULT '{}',
                    fields JSONB DEFAULT '[]',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            // Add index for performance
            await query("CREATE INDEX idx_reports_tenant ON reports(tenant_id);");
            console.log("[Schema] 'reports' table created successfully.");
        } else {
            console.log("[Schema] 'reports' table already exists.");

            // Migration for all columns
            const columnsToCheck = [
                { name: 'form_id', type: 'INTEGER' },
                { name: 'layout', type: "JSONB DEFAULT '[]'" },
                { name: 'widgets', type: "JSONB DEFAULT '{}'" },
                { name: 'theme', type: "JSONB DEFAULT '{}'" },
                { name: 'fields', type: "JSONB DEFAULT '[]'" },
                { name: 'public_token', type: "VARCHAR(255) UNIQUE" },
                { name: 'orientation', type: "VARCHAR(20) DEFAULT 'landscape'" },
                { name: 'is_published', type: "BOOLEAN DEFAULT false" },
                { name: 'slug', type: "VARCHAR(255) UNIQUE" },
                { name: 'config', type: "JSONB DEFAULT '{}'" }
            ];

            for (const col of columnsToCheck) {
                try {
                    const colCheck = await query(`
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'reports' AND column_name = $1
                    `, [col.name]);

                    if (colCheck.rows.length === 0) {
                        console.log(`[Schema] Adding missing '${col.name}' column...`);
                        await query(`ALTER TABLE reports ADD COLUMN ${col.name} ${col.type};`);
                    }
                } catch (err) {
                    console.warn(`[Schema] Column check failed for ${col.name}:`, err.message);
                }
            }

            // Explicitly Fix Column Types (e.g. form_id UUID -> INTEGER)
            try {
                console.log("[Schema] Verifying form_id type...");
                await query("ALTER TABLE reports ALTER COLUMN form_id TYPE INTEGER USING (form_id::text::integer)");
            } catch (e) {
                // If cast fails (e.g. real UUIDs present), we might need to NULL them or ignore.
                // For now, logging warning.
                console.warn("[Schema] Could not convert form_id to INTEGER (it might already be INT or have data issues):", e.message);
            }
        }
    } catch (e) {
        console.error("[Schema] Error ensuring reports table:", e);
    }
}

module.exports = ensureReportsTable;
