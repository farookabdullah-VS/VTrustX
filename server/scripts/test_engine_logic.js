const engine = require('../src/core/PersonaCalculationEngine');

async function testEngine() {
    const securityContext = { tenantId: 'default_tenant', userId: 'user_123' };

    // Request for Efficient Emily
    const requestEmily = {
        request_id: 'TEST-EMILY-001',
        persona_profile: 'Efficient Emily', // Should match DB name
        objectives: [
            { name: 'speed', weight: 1.0 }, // Can override or augment DB weights
        ],
        action_space: [
            {
                id: 'express_shipping',
                name: 'Express Shipping ($20)',
                properties: {
                    price: 20,
                    duration_minutes: 5,
                    convenience: 0.9
                }
            },
            {
                id: 'standard_shipping',
                name: 'Standard Shipping (Free)',
                properties: {
                    price: 0,
                    duration_minutes: 12000, // Very slow
                    convenience: 0.5
                }
            },
            {
                id: 'pickup',
                name: 'Store Pickup ($5)',
                properties: {
                    price: 5,
                    duration_minutes: 60, // Moderate
                    convenience: 0.7
                }
            }
        ]
    };

    console.log('--- Testing Efficient Emily ---');
    const resultEmily = await engine.decide(requestEmily, securityContext);
    console.log(`Decision: ${resultEmily.decision.type} -> ${resultEmily.decision.action?.name}`);
    console.log('Top Candidates:', resultEmily.top_candidates.map(c => `${c.action.name} (Score: ${c.score.toFixed(1)})`).join(', '));
    console.log('Explanation:', JSON.stringify(resultEmily.explanation, null, 2));


    // Request for Budget Bob
    const requestBob = {
        request_id: 'TEST-BOB-001',
        persona_profile: 'Budget Bob',
        action_space: requestEmily.action_space // Same actions
    };

    console.log('\n--- Testing Budget Bob ---');
    const resultBob = await engine.decide(requestBob, securityContext);
    console.log(`Decision: ${resultBob.decision.type} -> ${resultBob.decision.action?.name}`);
    console.log('Top Candidates:', resultBob.top_candidates.map(c => `${c.action.name} (Score: ${c.score.toFixed(1)})`).join(', '));
}

testEngine().then(() => process.exit(0)).catch(e => console.error(e));
