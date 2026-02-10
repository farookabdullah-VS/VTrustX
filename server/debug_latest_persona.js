const { query } = require('./src/infrastructure/database/db');

async function checkLatest() {
    try {
        const res = await query('SELECT id, name, photo_url, layout_config FROM cx_personas ORDER BY updated_at DESC LIMIT 1');
        if (res.rows.length === 0) console.log("No personas found.");
        else {
            const p = res.rows[0];
            console.log("Latest Persona ID:", p.id);
            console.log("Name:", p.name);
            console.log("Photo URL in DB:", p.photo_url); // Should be null or undefined if not saved
            // Also check layout config for photo block
            let layout = p.layout_config;
            if (typeof layout === 'string') layout = JSON.parse(layout);
            const photoBlock = layout?.left?.find(b => b.type === 'photo');
            console.log("Photo in Layout Config:", photoBlock ? photoBlock.data : "No photo block");
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkLatest();
