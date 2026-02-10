const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const pool = require('../../infrastructure/database/db'); // Direct pool access for complex queries

const authenticate = require('../middleware/auth');

// Repositories
const ticketRepo = new PostgresRepository('tickets');
const messageRepo = new PostgresRepository('ticket_messages');
const accountRepo = new PostgresRepository('crm_accounts');
const contactRepo = new PostgresRepository('contacts');
const workflowEngine = require('../../services/workflowEngine');
const emailService = require('../../services/emailService');

// --- TICKETS ---

// GET Tickets (List)
router.get('/tickets', authenticate, async (req, res) => {
    try {
        const { status, priority, assignee } = req.query;
        const tenantId = req.user.tenant_id;

        let query = `
            SELECT t.*, c.name as contact_name, a.name as account_name, u.username as assignee_name 
            FROM tickets t
            LEFT JOIN crm_contacts c ON t.contact_id = c.id
            LEFT JOIN crm_accounts a ON t.account_id = a.id
            LEFT JOIN users u ON t.assigned_user_id = u.id
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];
        let pIdx = 2;

        if (status) { query += ` AND t.status = $${pIdx++}`; params.push(status); }
        if (priority) { query += ` AND t.priority = $${pIdx++}`; params.push(priority); }
        if (assignee) { query += ` AND t.assigned_user_id = $${pIdx++}`; params.push(assignee); }

        query += ` ORDER BY t.created_at DESC LIMIT 50`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Ticket Detail
router.get('/tickets/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        // Fetch Ticket
        const tResult = await pool.query(`
            SELECT t.*, c.name as contact_name, c.email as contact_email, a.name as account_name, u.username as assignee_name 
            FROM tickets t
            LEFT JOIN crm_contacts c ON t.contact_id = c.id
            LEFT JOIN crm_accounts a ON t.account_id = a.id
            LEFT JOIN users u ON t.assigned_user_id = u.id
            WHERE t.id = $1 AND t.tenant_id = $2
        `, [id, tenantId]);

        if (tResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
        const ticket = tResult.rows[0];

        // Fetch Messages
        const mResult = await pool.query(`
            SELECT m.*, u.username as sender_name 
            FROM ticket_messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.ticket_id = $1
            ORDER BY m.created_at ASC
        `, [id]);

        res.json({ ...ticket, messages: mResult.rows });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create Ticket
router.post('/tickets', authenticate, async (req, res) => {
    try {
        let { subject, description, priority, contact_id, account_id, status, channel } = req.body;
        const tenantId = req.user.tenant_id;

        // Auto-resolve Requester (Contact) from Logged-in User if not provided
        if (!contact_id) {
            const user = req.user;
            // Try matching contact by email or username
            const searchVal = user.email || user.username;

            // Check if contact exists by email in the UNIFIED contacts table
            const contactRes = await pool.query("SELECT * FROM contacts WHERE email = $1 AND tenant_id = $2", [user.email, tenantId]);
            if (contactRes.rows.length > 0) {
                contact_id = contactRes.rows[0].id;
            } else {
                // Auto-create Contact representation for this internal User
                const newContact = await contactRepo.create({
                    tenant_id: tenantId,
                    name: user.username, // Use username as Contact Name
                    email: user.email || `${user.username}@internal.local`,
                    created_at: new Date()
                });
                contact_id = newContact.id;
            }
        }

        // Generate Code (Simple Random for MVP)
        const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);

        // SLA Calculation (Dynamic)
        const now = new Date();
        const slaRes = await pool.query("SELECT * FROM sla_policies WHERE tenant_id = $1 AND priority = $2", [tenantId, priority || 'medium']);

        let firstResponseMins = 1440; // 24h
        let resolutionMins = 2880; // 48h

        if (slaRes.rows.length > 0) {
            firstResponseMins = slaRes.rows[0].response_time_minutes;
            resolutionMins = slaRes.rows[0].resolution_time_minutes;
        } else {
            // Fallback Defaults
            if (priority === 'urgent') { firstResponseMins = 60; resolutionMins = 240; }
            else if (priority === 'high') { firstResponseMins = 240; resolutionMins = 1440; }
            else if (priority === 'low') { firstResponseMins = 2880; resolutionMins = 4320; }
        }

        const firstResponseDue = new Date(now.getTime() + firstResponseMins * 60000);
        const resolutionDue = new Date(now.getTime() + resolutionMins * 60000);

        // Auto-Assignment / Routing Logic
        let assignedTeamId = null;
        let assignedUserId = null;

        const text = (subject + ' ' + (description || '')).toLowerCase();

        // 0. Check User-Defined Keyword Rules (Highest Priority)
        // In a real app with many rules, we would query filtering by keyword in SQL, but for now fetching all rules is fine.
        const rulesRes = await pool.query("SELECT * FROM assignment_rules WHERE tenant_id = $1 AND is_active = true", [tenantId]);
        for (const rule of rulesRes.rows) {
            if (text.includes(rule.keyword.toLowerCase())) {
                assignedUserId = rule.assigned_user_id;
                // Ideally also fetch the user's default team here
                break; // First match wins
            }
        }

        // 1. If NOT assigned to User, try Team Defaults (Fallback)
        if (!assignedUserId) {
            if (text.includes('bill') || text.includes('invoc') || text.includes('payment')) {
                const teamRes = await pool.query("SELECT id FROM teams WHERE name = 'Billing' LIMIT 1");
                if (teamRes.rows.length > 0) assignedTeamId = teamRes.rows[0].id;
            } else if (text.includes('error') || text.includes('bug') || text.includes('fail')) {
                const teamRes = await pool.query("SELECT id FROM teams WHERE name = 'Technical' LIMIT 1");
                if (teamRes.rows.length > 0) assignedTeamId = teamRes.rows[0].id;
            } else {
                const teamRes = await pool.query("SELECT id FROM teams WHERE name = 'General Support' LIMIT 1");
                if (teamRes.rows.length > 0) assignedTeamId = teamRes.rows[0].id;
            }
        }

        const newTicket = {
            ticket_code: code,
            subject,
            description,
            priority: priority || 'medium',
            status: status || 'new',
            channel: channel || 'web',
            contact_id,
            account_id,
            assigned_team_id: assignedTeamId,
            assigned_user_id: assignedUserId,
            first_response_due_at: firstResponseDue,
            resolution_due_at: resolutionDue,
            created_at: now,
            tenant_id: tenantId
        };

        const saved = await ticketRepo.create(newTicket);

        // Trigger Workflows
        workflowEngine.evaluate('ticket', saved, 'ticket_created')
            .catch(err => console.error("Workflow Create Error:", err));

        // --- NOTIFICATION: Creation ---
        if (contact_id) {
            const cRel = await pool.query('SELECT name, email FROM crm_contacts WHERE id = $1', [contact_id]);
            if (cRel.rows.length > 0) {
                emailService.sendTemplate(cRel.rows[0].email, 'creation', {
                    customer_name: cRel.rows[0].name,
                    ticket_code: code,
                    subject: subject
                });
            }
        }

        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Update Ticket
router.put('/tickets/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        // Verify Ownership
        const check = await pool.query('SELECT id FROM tickets WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        // Sanitize: allow only specific fields
        const allowed = [
            'status', 'priority', 'assigned_user_id', 'assigned_team_id',
            'request_type', 'impact', 'description',
            'issue', 'analysis', 'solution',
            'mode', 'level', 'urgency',
            'group_name', 'category', 'assets'
        ];
        const safeUpdates = {};
        allowed.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });

        if (updates.status === 'closed') safeUpdates.closed_at = new Date();

        const updated = await ticketRepo.update(id, safeUpdates);

        // Audit Log
        const auditQuery = `
            INSERT INTO audit_logs (entity_type, entity_id, action, details, actor_id)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(auditQuery, ['ticket', id, 'update', JSON.stringify(safeUpdates), req.user.id]);

        // Notification: If assigned_user_id changed
        if (safeUpdates.assigned_user_id) {
            const tRes = await pool.query('SELECT ticket_code, subject FROM tickets WHERE id = $1', [id]);
            if (tRes.rows.length > 0) {
                const { ticket_code, subject } = tRes.rows[0];
                await pool.query(
                    `INSERT INTO notifications (tenant_id, user_id, title, message, type, reference_id)
                     VALUES ($1, $2, 'Ticket Assigned', $3, 'assignment', $4)`,
                    [tenantId, safeUpdates.assigned_user_id, `You have been assigned ticket ${ticket_code}: ${subject}`, id]
                );
            }
        }

        // Trigger Workflows
        // Trigger Workflows
        workflowEngine.evaluate('ticket', { ...safeUpdates, id: id, tenant_id: tenantId }, 'ticket_updated')
            .catch(err => console.error("Workflow Update Error:", err));

        // --- NOTIFICATIONS: Lifecycle Hooks ---
        // Fetch fresh ticket data with contact info
        const freshTicketRes = await pool.query(`
            SELECT t.*, c.name as contact_name, c.email as contact_email 
            FROM tickets t
            LEFT JOIN crm_contacts c ON t.contact_id = c.id
            WHERE t.id = $1
        `, [id]);

        if (freshTicketRes.rows.length > 0) {
            const ticket = freshTicketRes.rows[0];
            const recipient = ticket.contact_email;

            if (recipient) {
                const baseContext = {
                    customer_name: ticket.contact_name,
                    ticket_code: ticket.ticket_code,
                    subject: ticket.subject
                };

                // 1. Assignment (In Progress)
                if (safeUpdates.assigned_user_id && safeUpdates.assigned_user_id !== check.rows[0].assigned_user_id) {
                    emailService.sendTemplate(recipient, 'inprogress', baseContext);
                }

                // 2. Resolution
                if (safeUpdates.status === 'resolved') {
                    emailService.sendTemplate(recipient, 'resolution', {
                        ...baseContext,
                        resolution_notes: safeUpdates.solution || 'No details provided.'
                    });
                }

                // 3. Closure
                if (safeUpdates.status === 'closed') {
                    emailService.sendTemplate(recipient, 'closure', {
                        ...baseContext,
                        survey_link: `http://localhost:5173/feedback/${ticket.ticket_code}`
                    });
                }
            }
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Audit Logs for Ticket
router.get('/tickets/:id/audit', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;

        // Security Check
        const check = await pool.query('SELECT id FROM tickets WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const result = await pool.query(`
            SELECT a.*, u.username as actor_name
            FROM audit_logs a
            LEFT JOIN users u ON a.actor_id = u.id
            WHERE a.entity_type = 'ticket' AND a.entity_id = $1
            ORDER BY a.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST Message
// POST Message
router.post('/tickets/:id/messages', authenticate, async (req, res) => {
    try {
        const ticketId = req.params.id;
        const tenantId = req.user.tenant_id;
        const { body, type } = req.body;

        // Verify Ticket Ownership
        const check = await pool.query('SELECT id FROM tickets WHERE id = $1 AND tenant_id = $2', [ticketId, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const msg = {
            ticket_id: ticketId,
            body,
            type: type || 'public', // public/internal
            user_id: req.user.id, // Authenticated User
            created_at: new Date()
        };

        const saved = await messageRepo.create(msg);
        res.status(201).json(saved);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- ACCOUNTS & CONTACTS ---

// --- ACCOUNTS & CONTACTS ---

router.get('/accounts', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM crm_accounts WHERE tenant_id = $1', [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/accounts', authenticate, async (req, res) => {
    try {
        const { name, industry, domain, website, address } = req.body;
        const account = {
            name,
            industry,
            domain,
            website,
            address,
            tenant_id: req.user.tenant_id,
            owner_id: req.user.id,
            created_at: new Date()
        };
        const saved = await accountRepo.create(account);
        res.status(201).json(saved);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/contacts', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM crm_contacts WHERE tenant_id = $1', [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/contacts', authenticate, async (req, res) => {
    try {
        const { name, email, phone, title, account_id } = req.body;
        const contact = {
            name,
            email,
            phone,
            title,
            account_id,
            tenant_id: req.user.tenant_id,
            created_at: new Date()
        };
        const saved = await contactRepo.create(contact);
        res.status(201).json(saved);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- REPORTING / STATS ---
// --- REPORTING / STATS ---
router.get('/stats', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;

        // 1. By Status
        const statusRes = await pool.query(`
            SELECT status, COUNT(*) as count FROM tickets 
            WHERE tenant_id = $1
            GROUP BY status
        `, [tenantId]);

        // 2. By Team
        const teamRes = await pool.query(`
            SELECT t.name, COUNT(tk.id) as count 
            FROM tickets tk
            LEFT JOIN teams t ON tk.assigned_team_id = t.id
            WHERE tk.tenant_id = $1
            GROUP BY t.name
        `, [tenantId]);

        // 3. SLA Breaches
        const breachRes = await pool.query(`
            SELECT COUNT(*) as count FROM tickets 
            WHERE tenant_id = $1 
               AND ((resolution_due_at < NOW() AND status NOT IN ('resolved', 'closed'))
               OR (first_response_due_at < NOW() AND first_response_at IS NULL AND status != 'new'))
        `, [tenantId]);

        // 4. By Priority
        const prioRes = await pool.query(`
             SELECT priority, COUNT(*) as count FROM tickets 
             WHERE tenant_id = $1
             GROUP BY priority
        `, [tenantId]);

        res.json({
            byStatus: statusRes.rows,
            byTeam: teamRes.rows,
            byPriority: prioRes.rows,
            breaches: parseInt(breachRes.rows[0].count)
        });

    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- WEBHOOKS ---
router.post('/webhooks/email', async (req, res) => {
    try {
        const webhookSecret = req.headers['x-webhook-secret'];
        if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }

        const { from, subject, body, tenant_id } = req.body;
        console.log("Receiving Email Webhook:", req.body);

        if (!tenant_id || !from || !subject) {
            return res.status(400).json({ error: 'Missing fields: from, subject, tenant_id' });
        }

        // 1. Find or Create Contact
        const contactRes = await pool.query(
            "SELECT id FROM crm_contacts WHERE email = $1 AND tenant_id = $2",
            [from, tenant_id]
        );

        let contactId;
        if (contactRes.rows.length > 0) {
            contactId = contactRes.rows[0].id;
        } else {
            const name = from.split('@')[0];
            const newContact = await contactRepo.create({
                tenant_id,
                name: name,
                email: from,
                created_at: new Date()
            });
            contactId = newContact.id;
        }

        // 2. Create Ticket
        const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
        const now = new Date();
        const firstResponseDue = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
        const resolutionDue = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h

        // Auto-assign to 'General Support'
        let assignedTeamId = null;
        const teamRes = await pool.query("SELECT id FROM teams WHERE name = 'General Support' LIMIT 1");
        if (teamRes.rows.length > 0) assignedTeamId = teamRes.rows[0].id;

        const newTicket = {
            ticket_code: code,
            subject,
            description: body || '',
            priority: 'medium',
            status: 'new',
            channel: 'email',
            contact_id: contactId,
            assigned_team_id: assignedTeamId,
            tenant_id,
            first_response_due_at: firstResponseDue,
            resolution_due_at: resolutionDue,
            created_at: now
        };

        const saved = await ticketRepo.create(newTicket);

        // Trigger Workflows
        workflowEngine.evaluate('ticket', saved, 'ticket_created')
            .catch(err => console.error("Workflow Webhook Error:", err));

        // --- NOTIFICATION HOOK: Creation ---
        // Fetch full contact details for name/email
        const contact = await pool.query('SELECT name, email FROM crm_contacts WHERE id = $1', [contactId]);
        if (contact.rows.length > 0) {
            emailService.sendTemplate(contact.rows[0].email, 'creation', {
                customer_name: contact.rows[0].name,
                ticket_code: code,
                subject: subject
            });
        }
        // -----------------------------------

        res.status(200).json({ status: 'ok', ticket: saved });

    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Public Form Submission
router.post('/public/tickets', async (req, res) => {
    try {
        const { name, email, subject, description, tenant_id } = req.body;

        // Validation
        if (!email || !subject || !name) return res.status(400).json({ error: 'Name, Email and Subject are required' });

        // Resolve Tenant (Default to first if missing, for MVP)
        let resolvedTenantId = tenant_id;
        if (!resolvedTenantId) {
            const tRes = await pool.query('SELECT id FROM tenants LIMIT 1');
            if (tRes.rows.length > 0) resolvedTenantId = tRes.rows[0].id;
            else return res.status(500).json({ error: 'No tenant configured' });
        }

        // 1. Find or Create Contact
        const contactRes = await pool.query(
            "SELECT id FROM crm_contacts WHERE email = $1 AND tenant_id = $2",
            [email, resolvedTenantId]
        );

        let contactId;
        if (contactRes.rows.length > 0) {
            contactId = contactRes.rows[0].id;
        } else {
            const newContact = await contactRepo.create({
                tenant_id: resolvedTenantId,
                name: name,
                email: email,
                created_at: new Date()
            });
            contactId = newContact.id;
        }

        // 2. Create Ticket
        const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
        const now = new Date();
        const firstResponseDue = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h
        const resolutionDue = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h

        // Auto-assign
        let assignedTeamId = null;
        const teamRes = await pool.query("SELECT id FROM teams WHERE name = 'General Support' LIMIT 1");
        if (teamRes.rows.length > 0) assignedTeamId = teamRes.rows[0].id;

        const newTicket = {
            ticket_code: code,
            subject,
            description: description || '',
            priority: 'medium',
            status: 'new',
            channel: 'web',
            contact_id: contactId,
            assigned_team_id: assignedTeamId,
            tenant_id: resolvedTenantId,
            first_response_due_at: firstResponseDue,
            resolution_due_at: resolutionDue,
            created_at: now
        };

        const saved = await ticketRepo.create(newTicket);
        res.status(201).json(saved);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
