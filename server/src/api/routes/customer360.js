const express = require('express');
const router = express.Router();
const { query } = require('../../infrastructure/database/db');
const authenticate = require('../middleware/auth');

// Helper: Identity Resolution
async function resolveIdentity(identities, tenantId) {
    // identities: [{ type, value }]
    // Find any existing customer that matches ANY of the provided identities

    if (!identities || identities.length === 0) return null;

    const values = identities.map(i => i.value);
    const sql = `
        SELECT customer_id 
        FROM customer_identities 
        WHERE identity_value = ANY($1)
        LIMIT 1
    `;
    const res = await query(sql, [values]);
    return res.rows[0]?.customer_id || null;
}

// POST /api/customer360/profile - Ingest or Update Profile
router.post('/profile', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const {
            source,
            external_id,
            email,
            mobile,
            full_name,
            date_of_birth,
            nationality,
            primary_language
        } = req.body;

        // 1. Build Identity List for Resolution
        const identities = [];
        if (external_id) identities.push({ type: 'external_id', value: `${source}:${external_id}` });
        if (email) identities.push({ type: 'email', value: email });
        if (mobile) identities.push({ type: 'mobile', value: mobile });

        // 2. Resolve to Golden ID
        // Priority 1: Explicit ID passed (Update Scenario)
        // Priority 2: Identity Resolution (Ingest Scenario)
        let customerId = req.body.customer_id;

        if (!customerId) {
            customerId = await resolveIdentity(identities, tenantId);
        }

        // 3. Create if New
        if (!customerId) {
            const createSql = `
                INSERT INTO customers (
                    tenant_id, full_name, date_of_birth, nationality, primary_language, 
                    gender, occupation, city, is_citizen, city_tier, 
                    monthly_income_local, family_status, employment_sector
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            `;
            const createRes = await query(createSql, [
                tenantId, full_name, date_of_birth, nationality,
                primary_language || 'en',
                req.body.gender || null,
                req.body.occupation || null,
                req.body.city || null,
                req.body.is_citizen === 'true' || req.body.is_citizen === true,
                req.body.city_tier || 'Tier1',
                req.body.monthly_income_local || 0,
                req.body.family_status || null,
                req.body.employment_sector || null
            ]);
            customerId = createRes.rows[0].id;
        } else {
            // Update existing
            const updateFields = [];
            const updateParams = [];
            let paramCount = 1;

            if (full_name) { updateFields.push(`full_name = $${paramCount++}`); updateParams.push(full_name); }
            if (date_of_birth) { updateFields.push(`date_of_birth = $${paramCount++}`); updateParams.push(date_of_birth); }
            if (nationality) { updateFields.push(`nationality = $${paramCount++}`); updateParams.push(nationality); }
            if (req.body.gender) { updateFields.push(`gender = $${paramCount++}`); updateParams.push(req.body.gender); }
            if (req.body.occupation) { updateFields.push(`occupation = $${paramCount++}`); updateParams.push(req.body.occupation); }
            if (req.body.city) { updateFields.push(`city = $${paramCount++}`); updateParams.push(req.body.city); }

            // GCC Spec Fields
            if (req.body.is_citizen !== undefined) { updateFields.push(`is_citizen = $${paramCount++}`); updateParams.push(req.body.is_citizen === 'true' || req.body.is_citizen === true); }
            if (req.body.city_tier) { updateFields.push(`city_tier = $${paramCount++}`); updateParams.push(req.body.city_tier); }
            if (req.body.monthly_income_local !== undefined) { updateFields.push(`monthly_income_local = $${paramCount++}`); updateParams.push(req.body.monthly_income_local); }
            if (req.body.family_status) { updateFields.push(`family_status = $${paramCount++}`); updateParams.push(req.body.family_status); }
            if (req.body.employment_sector) { updateFields.push(`employment_sector = $${paramCount++}`); updateParams.push(req.body.employment_sector); }

            if (updateFields.length > 0) {
                updateParams.push(customerId);
                await query(`UPDATE customers SET ${updateFields.join(', ')} WHERE id = $${paramCount}`, updateParams);
            }
        }

        // 4. Link Identities
        // 4. Link Identities
        // 4. Link Identities (Manage Unique Types for this Form)
        // We assume for manual entry, we are Replacing the primary email/mobile
        for (const identity of identities) {
            // Check if this customer already has an identity of this type
            // Note: In a real complex graph, we might add multiple. Here we treat the form fields as "Current Primary".

            // Delete existing identity of this type for this customer to ensure clean state
            await query(`DELETE FROM customer_identities WHERE customer_id = $1 AND identity_type = $2`, [customerId, identity.type]);

            // Insert new
            await query(`
                INSERT INTO customer_identities (customer_id, identity_type, identity_value, source_system, is_primary)
                VALUES ($1, $2, $3, $4, true)
            `, [customerId, identity.type, identity.value, source]);
        }

        // 5. Update Contacts (Manage as "Single Primary" for this simple profile view)
        if (email) {
            // Remove existing emails to avoid duplicates coming from multiple sources/edits
            await query(`DELETE FROM customer_contacts WHERE customer_id = $1 AND type = 'email'`, [customerId]);
            await query(`INSERT INTO customer_contacts (customer_id, type, value) VALUES ($1, 'email', $2)`, [customerId, email]);
        }
        if (mobile) {
            await query(`DELETE FROM customer_contacts WHERE customer_id = $1 AND type = 'mobile'`, [customerId]);
            await query(`INSERT INTO customer_contacts (customer_id, type, value) VALUES ($1, 'mobile', $2)`, [customerId, mobile]);
        }

        res.json({ success: true, customer_id: customerId, message: 'Profile ingested successfully' });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/customer360/event - Ingest Event
router.post('/event', authenticate, async (req, res) => {
    try {
        const { customer_id, event_type, channel, timestamp, payload } = req.body;
        const tenantId = req.user.tenant_id;

        if (!customer_id) return res.status(400).json({ error: 'Customer ID required' });

        // Verify customer belongs to tenant
        const check = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customer_id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        await query(
            `INSERT INTO customer_events (customer_id, event_type, channel, occurred_at, payload)
             VALUES ($1, $2, $3, $4, $5)`,
            [customer_id, event_type, channel, timestamp || new Date(), payload || {}]
        );

        res.json({ success: true, message: 'Event captured' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/customer360/search - Global Search
router.get('/search', authenticate, async (req, res) => {
    try {
        const { q, match_type } = req.query;
        if (!q) return res.status(400).json({ error: 'Search query required' });

        const tenantId = req.user.tenant_id;
        let sql, params;

        if (match_type === 'exact') {
            // Check Identities first then profile ID
            sql = `
                SELECT c.id as customer_id, c.full_name, c.kyc_status, ci.identity_type as primary_identity, 1.0 as match_confidence
                FROM customers c
                LEFT JOIN customer_identities ci ON c.id = ci.customer_id
                WHERE c.tenant_id = $1 
                AND (ci.identity_value = $2 OR c.id::text = $2)
                LIMIT 1
            `;
            params = [tenantId, q];
        } else {
            // Fuzzy search on name + Exact on ID/Phone/Email
            sql = `
                SELECT DISTINCT c.id as customer_id, c.full_name, c.kyc_status, 'NAME_MATCH' as primary_identity, 
                CASE WHEN c.full_name ILIKE $2 THEN 1.0 ELSE 0.8 END as match_confidence
                FROM customers c
                LEFT JOIN customer_identities ci ON c.id = ci.customer_id
                WHERE c.tenant_id = $1
                AND (c.full_name ILIKE $3 OR ci.identity_value ILIKE $3)
                LIMIT 10
            `;
            params = [tenantId, q, `%${q}%`];
        }

        const result = await query(sql, params);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/customer360/:id - The "Single Customer View" (Mega-JSON)
router.get('/:id', authenticate, async (req, res) => {
    try {
        const customerId = req.params.id;
        const tenantId = req.user.tenant_id;

        // Verify tenant first
        const profile = await query('SELECT * FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
        if (profile.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        // Parallel fetch for remaining Dimensions
        const [
            identities,
            contacts,
            products,
            consents,
            events,
            firmographics,
            preferences,
            financials,
            cx_metrics,
            relationships
        ] = await Promise.all([
            query('SELECT * FROM customer_identities WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_contacts WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_products WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_consents WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_events WHERE customer_id = $1 ORDER BY occurred_at DESC LIMIT 50', [customerId]),
            query('SELECT * FROM customer_firmographics WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_preferences WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM customer_financial_profile WHERE customer_id = $1', [customerId]),
            query('SELECT * FROM cx_intelligence_metrics WHERE customer_id = $1', [customerId]),
            query(`
                SELECT r.id, r.relationship_type, r.customer_id_to, c.full_name, c.nationality 
                FROM customer_relationships r 
                JOIN customers c ON r.customer_id_to = c.id 
                WHERE r.customer_id_from = $1
            `, [customerId])
        ]);

        if (profile.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const p = profile.rows[0];
        const f = firmographics.rows[0] || {};
        const pref = preferences.rows[0] || {};
        const fin = financials.rows[0] || {};
        const cx = cx_metrics.rows[0] || {};
        const rels = relationships.rows; // New

        // Helper to find specific contacts
        const getContact = (type) => contacts.rows.find(c => c.type === type)?.value;

        // Construct 6-Dimension Mega-JSON
        const responseData = {
            customer_id: p.id,

            // ... (existing fields) ...

            // 7. Relationships (New)
            relationships: rels,

            // 1. Demographic & Firmographic
            profile: {
                full_name: p.full_name,
                title: p.title,
                date_of_birth: p.date_of_birth,
                gender: p.gender,
                nationality: p.nationality,
                city: p.city,
                language_pref: p.primary_language,
                occupation: p.occupation,

                // B2B / Firmographic
                job_title: f.job_title,
                company_name: f.company_name,
                industry: f.industry_sector,
                department: f.department,
                company_size: f.company_size,
                vat_tax_id: f.vat_tax_id,

                // Legal
                kyc_status: p.kyc_status,
                national_id: p.national_id
            },

            // 2. Reachability & Social
            contact: {
                email: getContact('email'),
                mobile: getContact('mobile'),
                preferred_channel: pref.preferred_channel || 'email',
                preferred_time: pref.preferred_contact_time,
                social_profiles: pref.social_profiles,
                addresses: pref.addresses,
                primary_device: pref.primary_device
            },

            // 3. Transactional & Financial
            financials: {
                plan_tier: fin.current_plan_tier,
                mrr: fin.mrr,
                currency: fin.currency,
                ltv: p.lifetime_value || fin.total_lifetime_spend, // Prefer profile LTV if set, else financial table
                contract_start: fin.contract_start_date,
                contract_end: fin.renewal_date,
                wallet_balance: fin.wallet_balance,
                payment_health: fin.payment_health,
                payment_method: fin.payment_method,
                products: products.rows // Keep detailed product list
            },

            // 4. Behavioral
            behavioral_signals: {
                last_active: cx.last_active_at,
                platform_usage_score: cx.platform_usage_score,
                feature_adoption_rate: cx.feature_adoption_rate
            },

            // 5. Service & Sentiment (CX)
            cx_intelligence: {
                sentiment_score: cx.current_sentiment, // or numeric
                sentiment_label: cx.current_sentiment,
                sentiment_trend: cx.sentiment_trend,
                nps_last_rating: cx.nps_last_rating,
                csat_score: cx.csat_score,
                churn_risk: cx.risk_category || 'Low',
                total_support_tickets: cx.total_support_tickets,
                events: events.rows // Complete timeline
            },

            // 6. AI Predictions
            ai_recommendations: {
                next_action: cx.next_best_action || 'Review Account Health',
                retention_priority: cx.retention_priority || 'Medium',
                churn_probability: cx.churn_probability_score
            },

            // Raw Arrays (for legacy or specific UI needs)
            identities: identities.rows,
            consents: consents.rows,
            contacts: contacts.rows,
            products: products.rows,
            history: events.rows
        };

        res.json(responseData);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/customer360/relationships - Add Relationship
router.post('/relationships', authenticate, async (req, res) => {
    try {
        const { from_id, to_id, type } = req.body;
        const tenantId = req.user.tenant_id;
        if (!from_id || !to_id) return res.status(400).json({ error: 'IDs required' });

        // Verify BOTH belong to tenant
        const check = await query('SELECT id FROM customers WHERE id IN ($1, $2) AND tenant_id = $3', [from_id, to_id, tenantId]);
        if (check.rows.length < 2 && from_id !== to_id) return res.status(403).json({ error: 'Access denied' });

        await query('INSERT INTO customer_relationships (customer_id_from, customer_id_to, relationship_type) VALUES ($1, $2, $3)', [from_id, to_id, type]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/customer360/relationships/:id - Delete Relationship
router.delete('/relationships/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        // Verify ownership via join
        const check = await query(`
            SELECT r.id FROM customer_relationships r
            JOIN customers c ON r.customer_id_from = c.id
            WHERE r.id = $1 AND c.tenant_id = $2
        `, [req.params.id, tenantId]);

        if (check.rows.length === 0) return res.status(404).json({ error: 'Relationship not found' });

        await query('DELETE FROM customer_relationships WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/customer360/:id/products (Specific endpoint)
router.get('/:id/products', authenticate, async (req, res) => {
    try {
        const customerId = req.params.id;
        const tenantId = req.user.tenant_id;

        const check = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        const result = await query('SELECT * FROM customer_products WHERE customer_id = $1', [customerId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// POST /api/customer360/products - Ingest Products
router.post('/products', authenticate, async (req, res) => {
    try {
        const { customer_id, product_name, product_type, account_number, status, balance, currency } = req.body;
        const tenantId = req.user.tenant_id;
        if (!customer_id) return res.status(400).json({ error: 'Customer ID required' });

        const check = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customer_id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        await query(
            `INSERT INTO customer_products (customer_id, product_name, product_type, account_number, status, balance, currency)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [customer_id, product_name, product_type, account_number, status, balance || 0, currency || 'SAR']
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// DELETE /api/customer360/:id - Delete Customer Profile
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const customerId = req.params.id;
        // Verify tenant
        const check = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, req.user.tenant_id]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        // Delete (Cascading relies on DB schema, but we can be explicit for safety)
        const tables = ['customer_identities', 'customer_contacts', 'customer_products', 'customer_consents', 'customer_events', 'customer_firmographics', 'customer_preferences', 'customer_financial_profile', 'cx_intelligence_metrics'];
        for (const t of tables) {
            try { await query(`DELETE FROM ${t} WHERE customer_id = $1`, [customerId]); } catch (e) { console.warn(`Failed cleanup on ${t}: ${e.message}`); }
        }

        await query('DELETE FROM customers WHERE id = $1', [customerId]);
        res.json({ success: true, message: 'Customer profile deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// PUT /api/customer360/:id/consent - Update Consent Status
router.put('/:id/consent', authenticate, async (req, res) => {
    try {
        const customerId = req.params.id;
        const tenantId = req.user.tenant_id;
        const { consent_type, status } = req.body; // status: 'granted' or 'revoked'

        const checkAuth = await query('SELECT id FROM customers WHERE id = $1 AND tenant_id = $2', [customerId, tenantId]);
        if (checkAuth.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });

        // Upsert Consent
        const check = await query('SELECT id FROM customer_consents WHERE customer_id = $1 AND consent_type = $2', [customerId, consent_type]);

        if (check.rows.length > 0) {
            await query('UPDATE customer_consents SET status = $1, consent_date = CURRENT_TIMESTAMP WHERE id = $2', [status, check.rows[0].id]);
        } else {
            await query('INSERT INTO customer_consents (customer_id, consent_type, status, consent_date) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)', [customerId, consent_type, status]);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// GET /api/customer360 - List (for UI)
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const result = await query('SELECT * FROM customers WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 20', [tenantId]);
        res.json(result.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
