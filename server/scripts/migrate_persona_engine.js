const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    try {
        console.log('Starting Persona Engine Schema Migration...');

        // 1. Audit Logs
        await query(`
            CREATE TABLE IF NOT EXISTS cx_audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp TIMESTAMP DEFAULT NOW(),
                profile_id VARCHAR(255),
                action VARCHAR(50) NOT NULL,
                details JSONB,
                changed_by VARCHAR(255),
                reason TEXT
            );
        `);
        console.log('Created cx_audit_logs table.');

        // 2. Persona Configuration Parameters
        await query(`
            CREATE TABLE IF NOT EXISTS cx_persona_parameters (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                data_type VARCHAR(50) DEFAULT 'string',
                last_updated TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Created cx_persona_parameters table.');

        // 3. Persona Lists
        await query(`
            CREATE TABLE IF NOT EXISTS cx_persona_lists (
                key VARCHAR(255) PRIMARY KEY,
                values JSONB NOT NULL, -- Array of values
                last_updated TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('Created cx_persona_lists table.');

        // 4. Persona Lookup Maps
        await query(`
            CREATE TABLE IF NOT EXISTS cx_persona_maps (
                id SERIAL PRIMARY KEY,
                map_key VARCHAR(255) NOT NULL,
                lookup_key VARCHAR(255) NOT NULL,
                value TEXT NOT NULL,
                last_updated TIMESTAMP DEFAULT NOW(),
                UNIQUE(map_key, lookup_key)
            );
        `);
        console.log('Created cx_persona_maps table.');

        // 5. Profile Personas (Assignments)
        await query(`
            CREATE TABLE IF NOT EXISTS cx_profile_personas (
                id SERIAL PRIMARY KEY,
                profile_id VARCHAR(255) NOT NULL,
                persona_id VARCHAR(255) NOT NULL, -- Logical ID or UUID from definition
                assigned_at TIMESTAMP DEFAULT NOW(),
                method VARCHAR(50) DEFAULT 'manual', -- 'auto', 'manual', 'api'
                score DECIMAL(5,2),
                UNIQUE(profile_id, persona_id)
            );
        `);
        console.log('Created cx_profile_personas table.');

        // Seed some initial data for Demo
        await query(`
            INSERT INTO cx_persona_parameters (key, value, data_type)
            VALUES 
                ('AGE_MIN_MILL', '25', 'integer'),
                ('FAMILY_INCOME_THRESHOLD', '25000', 'number')
            ON CONFLICT (key) DO NOTHING;
        `);

        await query(`
            INSERT INTO cx_persona_lists (key, values)
            VALUES 
                ('COUNTRIES_NAT_MILL', '["SA", "AE", "QA", "KW", "OM", "BH"]')
            ON CONFLICT (key) DO NOTHING;
        `);

        await query(`
            INSERT INTO cx_persona_maps (map_key, lookup_key, value)
            VALUES 
                ('INCOME_THRESHOLD', 'SA', '12000'),
                ('INCOME_THRESHOLD', 'AE', '10000')
            ON CONFLICT (map_key, lookup_key) DO NOTHING;
        `);

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
