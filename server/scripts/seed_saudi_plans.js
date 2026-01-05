const { query } = require('../src/infrastructure/database/db');

const plans = [
    {
        name: 'Starter (بداية)',
        description: 'Perfect for small business. (مثالية للأعمال الصغيرة)',
        price_monthly: 99,
        price_yearly: 990,
        features: [
            'Up to 3 Active Surveys',
            '100 Responses / Month',
            'Email Support',
            'Standard Templates',
            'English & Arabic Interface'
        ],
        max_users: 3,
        max_responses: 100
    },
    {
        name: 'Professional (محترف)',
        description: 'For growing businesses. (للشركات النامية)',
        price_monthly: 299,
        price_yearly: 2990,
        features: [
            'Unlimited Surveys',
            '2,000 Responses / Month',
            'Advanced Analytics & Export',
            'WhatsApp Integration',
            'Priority Support (24/7)',
            'Custom Branding'
        ],
        max_users: 10,
        max_responses: 2000
    },
    {
        name: 'Enterprise (مؤسسات)',
        description: 'Full-scale solution. (حل متكامل)',
        price_monthly: 999,
        price_yearly: 9990,
        features: [
            'Unlimited Everything',
            'Unlimited Responses',
            'Dedicated Account Manager',
            'On-premise / Private Cloud Option',
            'Custom SLA',
            'AI Sentiment Analysis'
        ],
        max_users: 50,
        max_responses: 100000
    }
];

async function seed() {
    try {
        console.log("Seeding Saudi Plans...");
        // Delete all rows safely
        await query('DELETE FROM pricing_plans');

        for (const p of plans) {
            await query(
                `INSERT INTO pricing_plans (name, description, price_monthly, price_yearly, features, max_users, max_responses, is_active)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
                [p.name, p.description, p.price_monthly, p.price_yearly, JSON.stringify(p.features), p.max_users, p.max_responses]
            );
        }
        console.log("Saudi Plans Seeded Successfully.");
    } catch (e) {
        console.error("Seeding Failed:", e);
    }
    process.exit(0);
}
seed();
