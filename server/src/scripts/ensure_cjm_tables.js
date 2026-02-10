const { query } = require('../infrastructure/database/db');

async function ensureCJMTables() {
    try {
        console.log("[CJM Schema] Ensuring CJM tables...");

        // 1. cjm_maps - ensure extra columns
        const mapsCheck = await query("SELECT to_regclass('public.cjm_maps')");
        if (!mapsCheck.rows[0].to_regclass) {
            console.log("[CJM Schema] Creating 'cjm_maps' table...");
            await query(`
                CREATE TABLE cjm_maps (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id INTEGER NOT NULL,
                    title VARCHAR(255) NOT NULL DEFAULT 'Untitled Journey',
                    description TEXT,
                    status VARCHAR(20) DEFAULT 'draft',
                    thumbnail_data TEXT,
                    persona_id UUID,
                    created_by INTEGER,
                    tags JSONB DEFAULT '[]',
                    data JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await query("CREATE INDEX idx_cjm_maps_tenant ON cjm_maps(tenant_id);");
            await query("CREATE INDEX idx_cjm_maps_status ON cjm_maps(tenant_id, status);");
            console.log("[CJM Schema] 'cjm_maps' table created.");
        } else {
            console.log("[CJM Schema] 'cjm_maps' table exists. Checking columns...");
            const cols = [
                { name: 'description', type: 'TEXT' },
                { name: 'status', type: "VARCHAR(20) DEFAULT 'draft'" },
                { name: 'thumbnail_data', type: 'TEXT' },
                { name: 'persona_id', type: 'UUID' },
                { name: 'created_by', type: 'INTEGER' },
                { name: 'tags', type: "JSONB DEFAULT '[]'" }
            ];
            for (const col of cols) {
                try {
                    const check = await query(
                        "SELECT column_name FROM information_schema.columns WHERE table_name = 'cjm_maps' AND column_name = $1",
                        [col.name]
                    );
                    if (check.rows.length === 0) {
                        console.log(`[CJM Schema] Adding cjm_maps.${col.name}...`);
                        await query(`ALTER TABLE cjm_maps ADD COLUMN ${col.name} ${col.type};`);
                    }
                } catch (e) {
                    console.warn(`[CJM Schema] Column ${col.name}:`, e.message);
                }
            }
        }

        // 2. cjm_templates
        const tplCheck = await query("SELECT to_regclass('public.cjm_templates')");
        if (!tplCheck.rows[0].to_regclass) {
            console.log("[CJM Schema] Creating 'cjm_templates' table...");
            await query(`
                CREATE TABLE cjm_templates (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    tenant_id INTEGER,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    category VARCHAR(100),
                    data JSONB DEFAULT '{}',
                    is_system BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await query("CREATE INDEX idx_cjm_templates_tenant ON cjm_templates(tenant_id);");
            console.log("[CJM Schema] 'cjm_templates' created.");
        }

        // 3. cjm_comments
        const commCheck = await query("SELECT to_regclass('public.cjm_comments')");
        if (!commCheck.rows[0].to_regclass) {
            console.log("[CJM Schema] Creating 'cjm_comments' table...");
            await query(`
                CREATE TABLE cjm_comments (
                    id SERIAL PRIMARY KEY,
                    map_id UUID NOT NULL,
                    user_id INTEGER,
                    user_name VARCHAR(255),
                    section_id VARCHAR(100),
                    stage_id VARCHAR(100),
                    content TEXT NOT NULL,
                    resolved BOOLEAN DEFAULT false,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await query("CREATE INDEX idx_cjm_comments_map ON cjm_comments(map_id);");
            console.log("[CJM Schema] 'cjm_comments' created.");
        }

        // 4. cjm_shares
        const shareCheck = await query("SELECT to_regclass('public.cjm_shares')");
        if (!shareCheck.rows[0].to_regclass) {
            console.log("[CJM Schema] Creating 'cjm_shares' table...");
            await query(`
                CREATE TABLE cjm_shares (
                    id SERIAL PRIMARY KEY,
                    map_id UUID NOT NULL,
                    shared_with_user_id INTEGER,
                    share_token VARCHAR(255),
                    permission VARCHAR(20) DEFAULT 'view',
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await query("CREATE INDEX idx_cjm_shares_map ON cjm_shares(map_id);");
            await query("CREATE INDEX idx_cjm_shares_token ON cjm_shares(share_token);");
            console.log("[CJM Schema] 'cjm_shares' created.");
        }

        // 5. cjm_versions
        const verCheck = await query("SELECT to_regclass('public.cjm_versions')");
        if (!verCheck.rows[0].to_regclass) {
            console.log("[CJM Schema] Creating 'cjm_versions' table...");
            await query(`
                CREATE TABLE cjm_versions (
                    id SERIAL PRIMARY KEY,
                    map_id UUID NOT NULL,
                    version_number INTEGER DEFAULT 1,
                    data JSONB NOT NULL,
                    created_by INTEGER,
                    created_at TIMESTAMP DEFAULT NOW()
                );
            `);
            await query("CREATE INDEX idx_cjm_versions_map ON cjm_versions(map_id);");
            console.log("[CJM Schema] 'cjm_versions' created.");
        }

        console.log("[CJM Schema] All CJM tables ensured.");
    } catch (e) {
        console.error("[CJM Schema] Error:", e);
    }
}

module.exports = ensureCJMTables;
