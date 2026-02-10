const PostgresRepository = require('./src/infrastructure/database/PostgresRepository');
const formRepo = new PostgresRepository('forms');
require('dotenv').config();

const toEntity = (row) => {
    if (!row) return null;
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        definition: row.definition,
        version: row.version,
        isPublished: row.is_published,
        isActive: row.is_active,
        status: row.status,
        requestBy: row.request_by,
        approvedBy: row.approved_by,
        startDate: row.start_date,
        endDate: row.end_date,
        responseLimit: row.response_limit,
        redirectUrl: row.redirect_url,
        password: row.password,
        allowAudio: row.allow_audio,
        allowCamera: row.allow_camera,
        allowLocation: row.allow_location,
        aiEnabled: row.ai_enabled,
        ai: row.ai || {},
        enableVoiceAgent: row.enable_voice_agent,
        allowedIps: row.allowed_ips,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by
    };
};

async function run() {
    console.log("Debugging Form Repository...");
    try {
        // Assume tenant_id = 1 (Default Organization) or check tenants table
        // We will just getAll first to see if it crashes
        const { query } = require('./src/infrastructure/database/db');

        // 1. Check Tenant
        const tenants = await query("SELECT id, name FROM tenants LIMIT 1");
        if (tenants.rows.length === 0) {
            console.error("No tenants found!");
            process.exit(1);
        }
        const tenantId = tenants.rows[0].id;
        console.log("Using Tenant ID:", tenantId);

        // 2. formRepo.findAllBy
        console.log("Calling formRepo.findAllBy('tenant_id', " + tenantId + ")...");
        const rows = await formRepo.findAllBy('tenant_id', tenantId);
        console.log(`Found ${rows.length} rows.`);

        // 3. Test toEntity
        console.log("Testing toEntity conversion...");
        rows.forEach((r, i) => {
            try {
                const e = toEntity(r);
                if (i === 0) console.log("Sample Entity:", JSON.stringify(e, null, 2));
            } catch (err) {
                console.error(`Row ${i} failed conversion:`, err);
            }
        });

        console.log("Debug Complete: Success");

    } catch (e) {
        console.error("Debug Error:", e);
    }
    process.exit(0);
}

run();
