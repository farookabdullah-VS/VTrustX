const axios = require('axios');

async function migrate() {
    try {
        console.log("Migrating Remote DB via API...");

        // 1. Drop
        await axios.post('http://localhost:3000/api/debug/run-sql', {
            sql: "DROP TABLE IF EXISTS cx_personas"
        });
        console.log("Dropped cx_personas.");

        // 2. Create
        await axios.post('http://localhost:3000/api/debug/run-sql', {
            sql: `CREATE TABLE cx_personas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(50),
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                photo_url TEXT,
                layout_config JSONB NOT NULL DEFAULT '{"left": [], "right": []}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )`
        });
        console.log("Created cx_personas.");

        // 3. Seed
        const exampleLayout = {
            left: [
                { id: 'demo1', type: 'demographics', title: 'Demographics', data: { Gender: 'Male', Age: '42', Location: 'Riyadh', Occupation: 'Compliance Lead' } },
                { id: 'skills1', type: 'tags', title: 'Skills', data: ['Splunk', 'Audit Docs', 'PPT'] }
            ],
            right: [
                { id: 'goals1', type: 'list', title: 'Goals', data: ['Audit Readiness', 'Executive Presentations'] },
                { id: 'quote1', type: 'quote', title: 'Quote', data: 'Dashboard compliance is key.' }
            ]
        };

        await axios.post('http://localhost:3000/api/debug/run-sql', {
            sql: `INSERT INTO cx_personas (name, title, layout_config) VALUES ($1, $2, $3)`,
            params: ['Matthew Goodman', 'Compliance Champion', JSON.stringify(exampleLayout)]
        });
        console.log("Seeded Matthew Goodman.");

    } catch (e) {
        console.error("Migration Failed:", e.message);
        if (e.response) console.error(e.response.data);
    }
}
migrate();
