const { pool } = require('../src/infrastructure/database/db');

async function seedConfig() {
    try {
        console.log('Seeding AI Configuration Form...');

        // Check if exists
        const res = await pool.query("SELECT * FROM forms WHERE title = 'AI Configuration'");
        if (res.rows.length > 0) {
            console.log('AI Configuration form already exists.');
            return;
        }

        // Create Definition
        const definition = {
            title: "AI Configuration",
            description: "Configure AI Providers (OpenAI, Gemini, etc.)",
            elements: [
                {
                    type: "text",
                    name: "provider",
                    title: "Provider Name (openai, gemini, azure)",
                    isRequired: true
                },
                {
                    type: "text",
                    name: "apiKey",
                    title: "API Key",
                    isRequired: true
                },
                {
                    type: "boolean",
                    name: "isActive",
                    title: "Is Active?",
                    defaultValue: false
                }
            ]
        };

        await pool.query(
            "INSERT INTO forms (title, definition, is_published, version) VALUES ($1, $2, $3, $4)",
            ['AI Configuration', definition, true, 1]
        );

        console.log('AI Configuration form created successfully.');

    } catch (err) {
        console.error('Error seeding config:', err);
    } finally {
        await pool.end();
    }
}

seedConfig();
