const { query, transaction } = require('./src/infrastructure/database/db');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    console.log('Seeding Identity & Consent data...');
    try {
        await transaction(async (client) => {
            // 1. Get Default Tenant
            const tenantRes = await client.query('SELECT id FROM tenants LIMIT 1');
            const tenantId = tenantRes.rows[0]?.id || 1;

            // 2. Clear existing (optional - for clean demo)
            // await client.query('DELETE FROM customer_consents');
            // await client.query('DELETE FROM customer_identities');
            // await client.query('DELETE FROM customers WHERE tenant_id = $1', [tenantId]);

            // 3. Create Customers
            const customers = [
                { name: 'Ahmed Al-Farsi', nationality: 'Saudi', email: 'ahmed@example.com', phone: '+966501234567' },
                { name: 'Sarah Wilson', nationality: 'British', email: 'sarah.w@global.com', phone: '+442012345678' },
                { name: 'Fatima Zahra', nationality: 'Moroccan', email: 'fatima.z@atlas.ma', phone: '+212612345678' },
                { name: 'John Doe', nationality: 'American', email: 'john.doe@tech.com', phone: '+12125550199' }
            ];

            for (const c of customers) {
                const cId = uuidv4();
                await client.query(`
                    INSERT INTO customers (id, tenant_id, full_name, nationality, kyc_status)
                    VALUES ($1, $2, $3, $4, 'verified')
                `, [cId, tenantId, c.name, c.nationality]);

                // Link Identities
                await client.query(`
                    INSERT INTO customer_identities (customer_id, identity_type, identity_value, source_system, is_primary)
                    VALUES ($1, 'email', $2, 'CRM', true),
                           ($1, 'phone', $3, 'MobileApp', false)
                `, [cId, c.email, c.phone]);

                // Add some extra identities for Ahmed to show "Resolution"
                if (c.name === 'Ahmed Al-Farsi') {
                    await client.query(`
                        INSERT INTO customer_identities (customer_id, identity_type, identity_value, source_system)
                        VALUES ($1, 'loyalty_id', 'LOY-882211', 'POS'),
                               ($1, 'external_id', 'WEB-9912', 'Shopify')
                    `, [cId]);
                }

                // Consents
                const consentTypes = ['Marketing Email', 'Phone Analytics', 'Third-party Sharing', 'Profiling'];
                for (const type of consentTypes) {
                    const status = Math.random() > 0.2 ? 'opt-in' : 'opt-out';
                    await client.query(`
                        INSERT INTO customer_consents (customer_id, consent_type, status, source, consent_date)
                        VALUES ($1, $2, $3, 'Privacy Center', NOW() - (random() * interval '10 days'))
                    `, [cId, type, status]);
                }
            }

            // 4. Create DSAR Ticket
            await client.query(`
                INSERT INTO tickets (subject, description, tenant_id, status, priority, channel)
                VALUES ('DSAR - Data Deletion Request', 'Customer requested full deletion of personal records under GDPR Article 17.', $1, 'open', 'high', 'web'),
                       ('DSAR - Right to Access', 'Requesting all stored profile data and interaction history.', $1, 'open', 'medium', 'email')
            `, [tenantId]);

            console.log('Seeding completed successfully!');
        });
    } catch (err) {
        console.error('Seeding failed:', err);
    } finally {
        process.exit();
    }
}

seed();
