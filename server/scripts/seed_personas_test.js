const { pool } = require('../src/infrastructure/database/db');

const personas = [
    {
        name: "Efficient Emily",
        industry: "Retail",
        description: "A time-poor, efficiency-driven shopper who values speed over rock-bottom prices.",
        tenant_id: "default_tenant",
        attributes: {
            priorities: {
                speed: 0.9,
                convenience: 0.8,
                price: 0.4,
                quality: 0.6
            },
            risk_tolerance: "LOW",
            sensitivities: ["time_pressure", "complexity_aversion"],
            pain_points: ["slow_checkout", "too_many_clicks", "hidden_fees"],
            thresholds: {
                min_score: 60,
                max_risk: "MEDIUM"
            },
            rules: [
                {
                    condition: "action.duration_minutes > 10",
                    effect: "penalty",
                    score_adjustment: -20,
                    reason: "Action takes too long for Efficient Emily"
                }
            ]
        }
    },
    {
        name: "Budget Bob",
        industry: "Retail",
        description: "Price-sensitive shopper willing to wait for a deal.",
        tenant_id: "default_tenant",
        attributes: {
            priorities: {
                speed: 0.2,
                convenience: 0.4,
                price: 0.95,
                quality: 0.5
            },
            risk_tolerance: "MEDIUM",
            sensitivities: ["price_sensitivity"],
            pain_points: ["shipping_fees", "high_prices"],
            thresholds: {
                min_score: 50,
                max_risk: "HIGH"
            }
        }
    }
];

async function seed() {
    try {
        console.log('Seeding Personas...');

        // Clear existing for clean test
        await pool.query('DELETE FROM cx_personas WHERE tenant_id = $1', ['default_tenant']);

        for (const p of personas) {
            await pool.query(
                `INSERT INTO cx_personas (name, industry, description, tenant_id, attributes) 
                 VALUES ($1, $2, $3, $4, $5)`,
                [p.name, p.industry, p.description, p.tenant_id, p.attributes]
            );
            console.log(`Inserted: ${p.name}`);
        }
        console.log('Done.');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

seed();
