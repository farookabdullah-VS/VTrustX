const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: 'localhost',
    port: 15432, // Target Cloud Proxy
    database: 'vtrustx-db' // Hyphen
});
const query = (text, params) => pool.query(text, params);

async function setup() {
    try {
        console.log("Setting up New Persona Schema...");

        // Ensure table is clean (it was archived, but ensure no conflict)
        await query(`DROP TABLE IF EXISTS cx_personas`);

        // Create Table
        await query(`
            CREATE TABLE cx_personas (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id VARCHAR(50),
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255),
                photo_url TEXT,
                layout_config JSONB NOT NULL DEFAULT '{"left": [], "right": []}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Seed the "Matthew Goodman" Example
        const exampleLayout = {
            left: [
                { id: 'demo1', type: 'demographics', title: 'Demographics', data: { gender: 'Male', age: '42', location: 'Riyadh, Saudi Arabia', marital_status: 'Married', occupation: 'Compliance Lead', income: 'High' } },
                { id: 'skills1', type: 'tags', title: 'Skills', data: ['Splunk (Expert)', 'Audit Docs (Expert)', 'PPT (Advanced)'] },
                { id: 'tech1', type: 'tags', title: 'Technology', data: ['Windows', 'iOS', 'Splunk', 'Power BI'] },
                { id: 'browsers1', type: 'tags', title: 'Browsers', data: ['Chrome', 'Edge'] },
                { id: 'channels1', type: 'tags', title: 'Channels', data: ['Email', 'Dashboards', 'Meetings'] }
            ],
            right: [
                { id: 'goals1', type: 'list', title: 'Goals', data: ['Ensure audit readiness', 'Deliver executive presentations', 'Align Splunk use cases with regulations'] },
                { id: 'quote1', type: 'quote', title: 'Quote', data: 'I need every dashboard to speak the language of compliance.' },
                { id: 'bg1', type: 'text', title: 'Background', data: 'Transitioned from auditing to compliance leadership. Oversees documentation, vendor alignment, reporting.' },
                { id: 'motiv1', type: 'list', title: 'Motivations', data: ['Recognition from leadership', 'Pride in flawless submissions', 'Structured workflows'] },
                { id: 'frust1', type: 'list', title: 'Frustrations', data: ['Inconsistent log mapping', 'Vendor delays', 'Poor visual presentation quality'] },
                { id: 'needs1', type: 'list', title: 'Needs', data: ['Audit-ready templates', 'Branded visual themes', 'Fast leadership feedback'] },
                { id: 'exp1', type: 'text', title: 'Previous Experience', data: 'Oracle FCCM, Power BI, manual Excel tracking' },
                { id: 'context1', type: 'text', title: 'Context / Environment', data: 'Works from dual-monitor office setup; mobile during travel' },
                { id: 'brands1', type: 'tags', title: 'Brands & Influencers', data: ['Oracle', 'Splunk', 'Gartner'] }
            ]
        };

        // Note: gen_random_uuid() requires pgcrypto, assume it exists or use default
        // If gen_random_uuid fails, we might need extension.
        // Let's enable extension just in case.
        await query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

        await query(
            `INSERT INTO cx_personas (name, title, layout_config) VALUES ($1, $2, $3)`,
            ['Matthew Goodman', 'Compliance Champion', JSON.stringify(exampleLayout)]
        );

        console.log("New Persona Schema Created & Seeded.");

    } catch (e) {
        console.error("Setup Failed:", e);
    }
    process.exit(0);
}
setup();
