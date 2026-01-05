require('dotenv').config({ path: './.env' }); // If run from server root
// Or handles relative paths if required. 
// Standard pattern: 
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PostgresRepository = require('../src/infrastructure/database/PostgresRepository');
const formRepo = new PostgresRepository('forms');

async function run() {
    try {
        console.log("Testing Form Creation...");

        // 1. Check if tenant exists (Optional, assume 1 or query users to find one)
        // For reproduction, we use a mocked payload similar to the failing request.

        const newForm = {
            tenant_id: 1,
            title: 'Debug Form',
            slug: 'DEBUG' + Math.floor(Math.random() * 1000),
            definition: { pages: [] },
            is_published: false,
            status: 'draft',
            version: 1,
            created_at: new Date(),
            updated_at: new Date(),
            ai_enabled: false
        };

        console.log("Payload:", newForm);

        const res = await formRepo.create(newForm);
        console.log("SUCCESS. Created Form ID:", res.id);

        // Cleanup
        // await formRepo.delete(res.id);

    } catch (e) {
        console.error("FAIL:", e);
    }
}
run();
