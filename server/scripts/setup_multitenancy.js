const { query } = require('../src/infrastructure/database/db');

async function migrate() {
    console.log("Setting up Multi-Tenancy Schema...");

    try {
        // 1. Create Tenants Table
        await query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                plan_id INTEGER,
                status VARCHAR(50) DEFAULT 'active',
                contact_email VARCHAR(255),
                contact_phone VARCHAR(50),
                address TEXT,
                country VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("- Tenants table managed.");

        // 2. Create Pricing Plans Table
        await query(`
            CREATE TABLE IF NOT EXISTS pricing_plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price_monthly DECIMAL(10, 2) DEFAULT 0.00,
                price_yearly DECIMAL(10, 2) DEFAULT 0.00,
                features JSONB DEFAULT '[]',
                max_users INTEGER DEFAULT 1,
                max_responses INTEGER DEFAULT 100,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("- Pricing Plans table managed.");

        // 3. Ensure Users has tenant_id
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50);`);
        console.log("- Users table updated with tenant_id.");

        // 4. Seed Default Plans
        const plans = await query(`SELECT COUNT(*) as count FROM pricing_plans`);
        if (parseInt(plans.rows[0].count) === 0) {
            console.log("Seeding default pricing plans...");
            const insertPlan = `
                INSERT INTO pricing_plans (name, description, price_monthly, price_yearly, features, max_users, max_responses)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;

            await query(insertPlan, [
                'Free',
                'Perfect for getting started',
                0,
                0,
                JSON.stringify(['Up to 2 Surveys', '50 Responses / month', 'Basic Analytics', 'Community Support']),
                2,
                50
            ]);

            await query(insertPlan, [
                'Professional',
                'For growing businesses',
                29.00,
                290.00,
                JSON.stringify(['Unlimited Surveys', '1,000 Responses / month', 'Advanced Logic', 'Remove Branding', 'Priority Email Support']),
                5,
                1000
            ]);

            await query(insertPlan, [
                'Enterprise',
                'For large scale operations',
                99.00,
                990.00,
                JSON.stringify(['Unlimited Everything', 'Unlimited Responses', 'Custom Integration', 'SLA', 'Dedicated Account Manager']),
                50,
                100000
            ]);
            console.log("- Seeding complete.");
        } else {
            console.log("- Plans already exist, skipping seed.");
        }

    } catch (err) {
        console.error("Migration Failed:", err);
    }

    process.exit(0);
}

migrate();
