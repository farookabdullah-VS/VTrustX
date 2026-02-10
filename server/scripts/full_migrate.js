const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'vtrustx_db',
});

async function migrate() {
    try {
        console.log("Starting full database migration...");

        const tables = [
            `CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                tenant_id INTEGER REFERENCES tenants(id),
                title VARCHAR(255),
                message TEXT,
                type VARCHAR(50),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS email_channels (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                name VARCHAR(255),
                email VARCHAR(255),
                host VARCHAR(255),
                port INTEGER,
                username VARCHAR(255),
                password VARCHAR(255),
                is_secure BOOLEAN DEFAULT TRUE,
                is_active BOOLEAN DEFAULT TRUE,
                last_sync_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS sla_policies (
                tenant_id INTEGER REFERENCES tenants(id),
                priority VARCHAR(20),
                response_time_minutes INTEGER,
                resolution_time_minutes INTEGER,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (tenant_id, priority)
            );`,
            `CREATE TABLE IF NOT EXISTS email_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255),
                subject_template TEXT,
                body_html TEXT,
                body_text TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS assignment_rules (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                keyword VARCHAR(255),
                assigned_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS journeys (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS journey_versions (
                id SERIAL PRIMARY KEY,
                journey_id INTEGER REFERENCES journeys(id) ON DELETE CASCADE,
                version_number INTEGER NOT NULL,
                definition JSONB NOT NULL,
                is_active BOOLEAN DEFAULT FALSE,
                published_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS journey_instances (
                id SERIAL PRIMARY KEY,
                journey_id INTEGER REFERENCES journeys(id),
                customer_id UUID REFERENCES customers(id),
                status VARCHAR(50) DEFAULT 'active',
                current_node_id VARCHAR(50),
                context JSONB DEFAULT '{}',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS quotas (
                id SERIAL PRIMARY KEY,
                form_id INTEGER REFERENCES forms(id),
                label VARCHAR(255),
                limit_count INTEGER,
                current_count INTEGER DEFAULT 0,
                criteria JSONB,
                action VARCHAR(50),
                reset_period VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE
            );`,
            `CREATE TABLE IF NOT EXISTS workflows (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                form_id INTEGER REFERENCES forms(id),
                name VARCHAR(255),
                description TEXT,
                trigger_event VARCHAR(100),
                conditions JSONB,
                actions JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );`,
            `CREATE TABLE IF NOT EXISTS lov_countries (
                id SERIAL PRIMARY KEY,
                code CHAR(2) UNIQUE,
                name VARCHAR(255),
                nationality VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE
            );`,
            `CREATE TABLE IF NOT EXISTS lov_cities (
                id SERIAL PRIMARY KEY,
                country_id INTEGER REFERENCES lov_countries(id),
                name VARCHAR(255),
                is_active BOOLEAN DEFAULT TRUE
            );`
        ];

        for (const sql of tables) {
            try {
                await pool.query(sql);
                console.log("Created/Verified table:", sql.split('(')[0].replace('CREATE TABLE IF NOT EXISTS ', '').trim());
            } catch (err) {
                console.error("Error creating table:", err.message);
            }
        }

        // Add some default data
        await pool.query("INSERT INTO lov_countries (code, name, nationality) VALUES ('SA', 'Saudi Arabia', 'Saudi'), ('AE', 'United Arab Emirates', 'Emirati'), ('KW', 'Kuwait', 'Kuwaiti'), ('QA', 'Qatar', 'Qatari'), ('BH', 'Bahrain', 'Bahraini'), ('OM', 'Oman', 'Omani') ON CONFLICT DO NOTHING");
        console.log("Seeded basic countries.");

        console.log("Full migration finished!");

    } catch (e) {
        console.error("Migration Error:", e);
    } finally {
        await pool.end();
    }
}

migrate();
