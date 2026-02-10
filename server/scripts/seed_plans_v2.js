
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    password: 'VTrustX@2030',
    host: '127.0.0.1',
    port: 15432,
    database: 'vtrustx-db',
});

const tiers = [
    {
        name: 'Starter (بداية)',
        description: 'Perfect for small business. (مثالية للأعمال الصغيرة)',
        monthly: 99,
        yearly: 990,
        features: ['Up to 3 Active Surveys', '100 Responses / Month', 'Email Support', 'English & Arabic Interface'],
        currency: 'SAR'
    },
    {
        name: 'Professional (محترف)',
        description: 'For growing businesses. (للشركات النامية)',
        monthly: 299,
        yearly: 2990,
        features: ['Unlimited Surveys', '2,000 Responses / Month', 'Advanced Analytics', 'WhatsApp Integration'],
        currency: 'SAR'
    },
    {
        name: 'Enterprise (مؤسسات)',
        description: 'Full-scale solution. (حل متكامل)',
        monthly: 999,
        yearly: 9990,
        features: ['Unlimited Everything', 'Unlimited Responses', 'Dedicated Account Manager', 'AI Sentiment Analysis'],
        currency: 'SAR'
    }
];

async function seedPlans() {
    try {
        console.log("Seeding Plans (New Schema)...");
        
        // Clear existing plans
        await pool.query('DELETE FROM plans');

        // Insert new plans (2 per tier: Monthly + Annual)
        for (const tier of tiers) {
            // Monthly
            await pool.query(`
                INSERT INTO plans (name, interval, base_price, currency, pricing_by_region)
                VALUES ($1, 'MONTHLY', $2, $3, $4)
            `, [tier.name, tier.monthly, tier.currency, JSON.stringify({ description: tier.description, features: tier.features })]);

            // Annual
            await pool.query(`
                INSERT INTO plans (name, interval, base_price, currency, pricing_by_region)
                VALUES ($1, 'ANNUAL', $2, $3, $4)
            `, [tier.name, tier.yearly, tier.currency, JSON.stringify({ description: tier.description, features: tier.features })]);
            
            console.log(`Seeded ${tier.name} (Monthly & Annual)`);
        }

        console.log("✅ Plans seeded successfully.");
    } catch (err) {
        console.error("Error seeding plans:", err);
    } finally {
        await pool.end();
    }
}

seedPlans();
