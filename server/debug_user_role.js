const { query } = require('./src/infrastructure/database/db');
require('dotenv').config();

async function run() {
    console.log("Checking Users and Roles...");
    try {
        const users = await query("SELECT id, username, role, role_id, tenant_id FROM users");
        console.log(`Found ${users.rows.length} users.`);

        for (const user of users.rows) {
            console.log(`User: ${user.username} (ID: ${user.id}, Role: ${user.role}, RoleID: ${user.role_id})`);

            if (user.role_id) {
                const role = await query("SELECT * FROM roles WHERE id = $1", [user.role_id]);
                if (role.rows.length === 0) {
                    console.error(`!!!!! ORPHANED ROLE_ID ${user.role_id} for user ${user.username} !!!!!`);
                } else {
                    console.log(`   -> Role Found: ${role.rows[0].name}`);
                    if (!role.rows[0].permissions) {
                        console.error(`   !!!!! ROLE HAS NO PERMISSIONS FIELD !!!!!`);
                    }
                }
            } else {
                console.log("   -> No Role ID (Legacy Mode)");
            }
        }
    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

run();
