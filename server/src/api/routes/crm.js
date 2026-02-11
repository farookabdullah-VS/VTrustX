const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { pool, transaction } = require('../../infrastructure/database/db');
const logger = require('../../infrastructure/logger'); // Direct pool access for complex queries

const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createTicketSchema, bulkUpdateSchema } = require('../schemas/crm.schemas');

// Repositories
const ticketRepo = new PostgresRepository('tickets');
const messageRepo = new PostgresRepository('ticket_messages');
const accountRepo = new PostgresRepository('crm_accounts');
const contactRepo = new PostgresRepository('contacts');
const workflowEngine = require('../../services/workflowEngine');
const emailService = require('../../services/emailService');

// --- WORKFLOW TRANSITIONS ---
const VALID_TRANSITIONS = {
    new: ['open', 'closed'],
    open: ['pending', 'resolved', 'closed'],
    pending: ['open', 'resolved', 'closed'],
    resolved: ['closed', 'open'],
    closed: ['open']
};

// --- TICKETS ---

/**
 * @swagger
 * /api/crm/tickets:
 *   get:
 *     summary: List tickets
 *     description: Retrieve tickets with filtering, pagination, search, and sorting. When page is omitted, returns a raw array (max 50) for backward compatibility.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, open, pending, resolved, closed]
 *         description: Filter by ticket status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by ticket priority
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: team
 *         schema:
 *           type: integer
 *         description: Filter by assigned team ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in subject, description, and ticket code (ILIKE)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tickets created on or after this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter tickets created on or before this date
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, priority, status, subject, ticket_code]
 *         description: Sort field (default created_at)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction (default desc)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for paginated response. Omit for raw array.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page (default 20, max 100)
 *     responses:
 *       200:
 *         description: Tickets retrieved successfully. Returns array if page is omitted, or paginated object if page is provided.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Ticket'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Ticket'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *       500:
 *         description: Server error
 */
// GET Tickets (List) — with pagination, search, sorting
router.get('/tickets', authenticate, async (req, res) => {
    try {
        const { status, priority, assignee, page, limit, sort, order, search, dateFrom, dateTo, team } = req.query;
        const tenantId = req.user.tenant_id;

        let baseQuery = `
            FROM tickets t
            LEFT JOIN crm_contacts c ON t.contact_id = c.id
            LEFT JOIN crm_accounts a ON t.account_id = a.id
            LEFT JOIN users u ON t.assigned_user_id = u.id
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];
        let pIdx = 2;

        if (status) { baseQuery += ` AND t.status = $${pIdx++}`; params.push(status); }
        if (priority) { baseQuery += ` AND t.priority = $${pIdx++}`; params.push(priority); }
        if (assignee) { baseQuery += ` AND t.assigned_user_id = $${pIdx++}`; params.push(parseInt(assignee)); }
        if (team) { baseQuery += ` AND t.assigned_team_id = $${pIdx++}`; params.push(parseInt(team)); }
        if (dateFrom) { baseQuery += ` AND t.created_at >= $${pIdx++}`; params.push(new Date(dateFrom)); }
        if (dateTo) { baseQuery += ` AND t.created_at <= $${pIdx++}`; params.push(new Date(dateTo)); }
        if (search) {
            baseQuery += ` AND (t.subject ILIKE $${pIdx} OR t.description ILIKE $${pIdx} OR t.ticket_code ILIKE $${pIdx})`;
            params.push(`%${search}%`);
            pIdx++;
        }

        // If no page param, return raw array for backward compat
        if (!page) {
            const allowedSorts = { created_at: 't.created_at', priority: 't.priority', status: 't.status', subject: 't.subject' };
            const sortCol = allowedSorts[sort] || 't.created_at';
            const sortDir = order === 'asc' ? 'ASC' : 'DESC';
            const dataQuery = `SELECT t.*, c.name as contact_name, a.name as account_name, u.username as assignee_name ${baseQuery} ORDER BY ${sortCol} ${sortDir} LIMIT 50`;
            const result = await pool.query(dataQuery, params);
            return res.json(result.rows);
        }

        // Paginated response
        const pageNum = Math.max(1, parseInt(page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset = (pageNum - 1) * pageSize;

        const allowedSorts = { created_at: 't.created_at', priority: 't.priority', status: 't.status', subject: 't.subject', ticket_code: 't.ticket_code' };
        const sortCol = allowedSorts[sort] || 't.created_at';
        const sortDir = order === 'asc' ? 'ASC' : 'DESC';

        const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
        const dataParams = [...params, pageSize, offset];
        const dataQuery = `SELECT t.*, c.name as contact_name, a.name as account_name, u.username as assignee_name ${baseQuery} ORDER BY ${sortCol} ${sortDir} LIMIT $${pIdx} OFFSET $${pIdx + 1}`;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, params),
            pool.query(dataQuery, dataParams)
        ]);

        const total = parseInt(countResult.rows[0].total);
        res.json({
            data: dataResult.rows,
            pagination: {
                page: pageNum,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (err) {
        logger.error('Failed to list tickets', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

/**
 * @swagger
 * /api/crm/tickets/{id}:
 *   get:
 *     summary: Get ticket by ID
 *     description: Retrieve a single ticket with full details including contact, account, assignee info, and all messages.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Ticket details with messages
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Ticket'
 *                 - type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TicketMessage'
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to fetch ticket detail', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch ticket details' });
    }
});

/**
 * @swagger
 * /api/crm/tickets:
 *   post:
 *     summary: Create ticket
 *     description: Create a new support ticket. Auto-resolves contact from the logged-in user if not provided. Calculates SLA deadlines based on priority and tenant SLA policies. Auto-assigns to team/user based on keyword rules and content analysis.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Ticket subject line
 *               description:
 *                 type: string
 *                 description: Detailed ticket description
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               status:
 *                 type: string
 *                 enum: [new, open]
 *                 default: new
 *               channel:
 *                 type: string
 *                 enum: [web, email, phone, chat]
 *                 default: web
 *               contact_id:
 *                 type: integer
 *                 description: Contact ID (auto-resolved from user if omitted)
 *               account_id:
 *                 type: integer
 *                 description: CRM account ID
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
// POST Create Ticket
router.post('/tickets', authenticate, validate(createTicketSchema), async (req, res) => {
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
        // Batch-fetch all teams in one query to avoid N+1
        if (!assignedUserId) {
            const allTeamsRes = await pool.query("SELECT id, name FROM teams WHERE tenant_id = $1", [tenantId]);
            const teamsByName = {};
            for (const t of allTeamsRes.rows) { teamsByName[t.name] = t.id; }

            if (text.includes('bill') || text.includes('invoc') || text.includes('payment')) {
                assignedTeamId = teamsByName['Billing'] || null;
            } else if (text.includes('error') || text.includes('bug') || text.includes('fail')) {
                assignedTeamId = teamsByName['Technical'] || null;
            } else {
                assignedTeamId = teamsByName['General Support'] || null;
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
            .catch(err => logger.error("Workflow Create Error", { error: err.message }));

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
        logger.error('Failed to create ticket', { error: err.message });
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

/**
 * @swagger
 * /api/crm/tickets/{id}/transitions:
 *   get:
 *     summary: Get ticket state transitions
 *     description: Return the current status of the ticket and the list of valid workflow transitions from that status.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Current status and allowed transitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentStatus:
 *                   type: string
 *                   enum: [new, open, pending, resolved, closed]
 *                 allowedTransitions:
 *                   type: array
 *                   items:
 *                     type: string
 *                     enum: [new, open, pending, resolved, closed]
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
// GET Allowed Transitions for a Ticket
router.get('/tickets/:id/transitions', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;
        const check = await pool.query('SELECT status FROM tickets WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
        const currentStatus = check.rows[0].status;
        res.json({ currentStatus, allowedTransitions: VALID_TRANSITIONS[currentStatus] || [] });
    } catch (err) {
        logger.error('Failed to fetch ticket transitions', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch ticket transitions' });
    }
});

/**
 * @swagger
 * /api/crm/tickets/bulk:
 *   put:
 *     summary: Bulk update tickets
 *     description: Update multiple tickets at once with the same set of field changes. Validates workflow transitions individually per ticket. Runs in a database transaction with batch audit logging.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ticketIds
 *               - updates
 *             properties:
 *               ticketIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of ticket IDs to update
 *               updates:
 *                 type: object
 *                 properties:
 *                   status:
 *                     type: string
 *                     enum: [new, open, pending, resolved, closed]
 *                   priority:
 *                     type: string
 *                     enum: [low, medium, high, urgent]
 *                   assigned_user_id:
 *                     type: integer
 *                   assigned_team_id:
 *                     type: integer
 *     responses:
 *       200:
 *         description: Bulk update results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updated:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   description: IDs of successfully updated tickets
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       error:
 *                         type: string
 *                       allowedTransitions:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Validation error or no valid fields
 *       500:
 *         description: Server error
 */
// PUT Bulk Update Tickets
router.put('/tickets/bulk', authenticate, validate(bulkUpdateSchema), async (req, res) => {
    const client = await pool.connect();
    try {
        const { ticketIds, updates } = req.body;
        const tenantId = req.user.tenant_id;
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) return res.status(400).json({ error: 'ticketIds array required' });

        const allowed = ['status', 'priority', 'assigned_user_id', 'assigned_team_id'];
        const safeUpdates = {};
        allowed.forEach(k => { if (updates[k] !== undefined) safeUpdates[k] = updates[k]; });
        if (Object.keys(safeUpdates).length === 0) return res.status(400).json({ error: 'No valid fields to update' });

        await client.query('BEGIN');
        const results = { updated: [], errors: [] };

        // Batch-verify all tickets in one query
        const verifyRes = await client.query(
            'SELECT id, status FROM tickets WHERE id = ANY($1::int[]) AND tenant_id = $2',
            [ticketIds, tenantId]
        );
        const ticketMap = {};
        for (const row of verifyRes.rows) { ticketMap[row.id] = row.status; }

        const toUpdate = [];
        for (const ticketId of ticketIds) {
            if (!ticketMap[ticketId]) { results.errors.push({ id: ticketId, error: 'Not found' }); continue; }

            const currentStatus = ticketMap[ticketId];
            const applyUpdates = { ...safeUpdates };

            // Validate workflow transition if status change
            if (applyUpdates.status && applyUpdates.status !== currentStatus) {
                const allowed = VALID_TRANSITIONS[currentStatus] || [];
                if (!allowed.includes(applyUpdates.status)) {
                    results.errors.push({ id: ticketId, error: `Invalid transition from ${currentStatus} to ${applyUpdates.status}`, allowedTransitions: allowed });
                    continue;
                }
            }

            if (applyUpdates.status === 'closed') applyUpdates.closed_at = new Date();
            if (applyUpdates.status === 'open' && currentStatus === 'closed') applyUpdates.closed_at = null;

            toUpdate.push({ ticketId, applyUpdates });
        }

        // Batch update tickets and insert audit logs
        for (const { ticketId, applyUpdates } of toUpdate) {
            await ticketRepo.update(ticketId, applyUpdates);
            results.updated.push(ticketId);
        }

        // Batch insert audit logs
        if (toUpdate.length > 0) {
            const auditValues = toUpdate.map((_, i) => {
                const base = i * 5;
                return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
            }).join(', ');
            const auditParams = toUpdate.flatMap(({ ticketId, applyUpdates }) => [
                'ticket', ticketId, 'bulk_update', JSON.stringify(applyUpdates), req.user.id
            ]);
            await client.query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, details, actor_id) VALUES ${auditValues}`,
                auditParams
            );
        }

        await client.query('COMMIT');
        res.json(results);
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('Failed to bulk update tickets', { error: err.message });
        res.status(500).json({ error: 'Failed to bulk update tickets' });
    } finally {
        client.release();
    }
});

/**
 * @swagger
 * /api/crm/tickets/{id}:
 *   put:
 *     summary: Update single ticket
 *     description: Update a ticket's fields with workflow transition validation. The ticket update, audit log insert, and notification insert are wrapped in a database transaction for atomicity. Triggers workflow evaluation and email notifications for assignment, resolution, and closure events.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, open, pending, resolved, closed]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *               assigned_user_id:
 *                 type: integer
 *               assigned_team_id:
 *                 type: integer
 *               request_type:
 *                 type: string
 *               impact:
 *                 type: string
 *               description:
 *                 type: string
 *               issue:
 *                 type: string
 *               analysis:
 *                 type: string
 *               solution:
 *                 type: string
 *               mode:
 *                 type: string
 *               level:
 *                 type: string
 *               urgency:
 *                 type: string
 *               group_name:
 *                 type: string
 *               category:
 *                 type: string
 *               assets:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Invalid status transition
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 currentStatus:
 *                   type: string
 *                 allowedTransitions:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
// PUT Update Ticket
router.put('/tickets/:id', authenticate, async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = req.user.tenant_id;
        const updates = req.body;

        // Verify Ownership & get current status
        const check = await pool.query('SELECT id, status, assigned_user_id FROM tickets WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

        const currentStatus = check.rows[0].status;

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

        // Workflow transition validation
        if (safeUpdates.status && safeUpdates.status !== currentStatus) {
            const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];
            if (!allowedTransitions.includes(safeUpdates.status)) {
                return res.status(400).json({
                    error: `Invalid status transition from '${currentStatus}' to '${safeUpdates.status}'`,
                    currentStatus,
                    allowedTransitions
                });
            }
        }

        if (safeUpdates.status === 'closed') safeUpdates.closed_at = new Date();
        if (safeUpdates.status === 'open' && currentStatus === 'closed') safeUpdates.closed_at = null;

        // Wrap ticket update + audit log + notification in a transaction
        const updated = await transaction(async (client) => {
            // 1. Update the ticket
            const scopedTicketRepo = ticketRepo.withClient(client);
            const updatedTicket = await scopedTicketRepo.update(id, safeUpdates);

            // 2. Audit Log
            await client.query(
                `INSERT INTO audit_logs (entity_type, entity_id, action, details, actor_id)
                 VALUES ($1, $2, $3, $4, $5)`,
                ['ticket', id, 'update', JSON.stringify(safeUpdates), req.user.id]
            );

            // 3. Notification: If assigned_user_id changed
            if (safeUpdates.assigned_user_id) {
                const tRes = await client.query('SELECT ticket_code, subject FROM tickets WHERE id = $1', [id]);
                if (tRes.rows.length > 0) {
                    const { ticket_code, subject } = tRes.rows[0];
                    await client.query(
                        `INSERT INTO notifications (tenant_id, user_id, title, message, type, reference_id)
                         VALUES ($1, $2, 'Ticket Assigned', $3, 'assignment', $4)`,
                        [tenantId, safeUpdates.assigned_user_id, `You have been assigned ticket ${ticket_code}: ${subject}`, id]
                    );
                }
            }

            return updatedTicket;
        });

        // Trigger Workflows (fire-and-forget, outside transaction)
        workflowEngine.evaluate('ticket', { ...safeUpdates, id: id, tenant_id: tenantId }, 'ticket_updated')
            .catch(err => logger.error("Workflow Update Error", { error: err.message }));

        // --- NOTIFICATIONS: Lifecycle Hooks ---
        // Fetch fresh ticket data with contact info (read-only, outside transaction)
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
                        survey_link: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/feedback/${ticket.ticket_code}`
                    });
                }
            }
        }

        res.json(updated);
    } catch (err) {
        logger.error('Failed to update ticket', { error: err.message });
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

/**
 * @swagger
 * /api/crm/tickets/{id}/audit:
 *   get:
 *     summary: Get ticket audit trail
 *     description: Retrieve the full audit log history for a specific ticket, ordered by most recent first. Includes actor username for each entry.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     responses:
 *       200:
 *         description: Audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   entity_type:
 *                     type: string
 *                   entity_id:
 *                     type: integer
 *                   action:
 *                     type: string
 *                   details:
 *                     type: string
 *                     description: JSON-encoded change details
 *                   actor_id:
 *                     type: integer
 *                   actor_name:
 *                     type: string
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
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
    } catch (err) {
        logger.error('Failed to fetch audit logs', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

/**
 * @swagger
 * /api/crm/tickets/{id}/messages:
 *   post:
 *     summary: Add message to ticket
 *     description: Add a public or internal message/note to an existing ticket. The authenticated user is recorded as the sender.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 description: Message content
 *               type:
 *                 type: string
 *                 enum: [public, internal]
 *                 default: public
 *                 description: Message visibility type
 *     responses:
 *       201:
 *         description: Message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketMessage'
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to create ticket message', { error: err.message });
        res.status(500).json({ error: 'Failed to create ticket message' });
    }
});

// --- ACCOUNTS & CONTACTS ---

/**
 * @swagger
 * /api/crm/accounts:
 *   get:
 *     summary: List CRM accounts
 *     description: Retrieve all CRM accounts for the current tenant.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of CRM accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CrmAccount'
 *       500:
 *         description: Server error
 */
router.get('/accounts', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM crm_accounts WHERE tenant_id = $1', [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch accounts', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

/**
 * @swagger
 * /api/crm/accounts:
 *   post:
 *     summary: Create account
 *     description: Create a new CRM account. The authenticated user is set as the account owner.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Account name
 *               industry:
 *                 type: string
 *                 description: Industry sector
 *               domain:
 *                 type: string
 *                 description: Company domain
 *               website:
 *                 type: string
 *                 description: Company website URL
 *               address:
 *                 type: string
 *                 description: Physical address
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmAccount'
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to create account', { error: e.message });
        res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * @swagger
 * /api/crm/contacts:
 *   get:
 *     summary: List CRM contacts
 *     description: Retrieve all CRM contacts for the current tenant.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of CRM contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CrmContact'
 *       500:
 *         description: Server error
 */
router.get('/contacts', authenticate, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM crm_contacts WHERE tenant_id = $1', [req.user.tenant_id]);
        res.json(result.rows);
    } catch (e) {
        logger.error('Failed to fetch CRM contacts', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch contacts' });
    }
});

/**
 * @swagger
 * /api/crm/contacts:
 *   post:
 *     summary: Create CRM contact
 *     description: Create a new CRM contact associated with the current tenant.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 description: Contact full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Contact email address
 *               phone:
 *                 type: string
 *                 description: Contact phone number
 *               title:
 *                 type: string
 *                 description: Job title
 *               account_id:
 *                 type: integer
 *                 description: Associated CRM account ID
 *     responses:
 *       201:
 *         description: Contact created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrmContact'
 *       500:
 *         description: Server error
 */
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
    } catch (e) {
        logger.error('Failed to create CRM contact', { error: e.message });
        res.status(500).json({ error: 'Failed to create contact' });
    }
});

// --- REPORTING / STATS ---

/**
 * @swagger
 * /api/crm/stats:
 *   get:
 *     summary: Get CRM statistics
 *     description: Retrieve aggregated CRM statistics including ticket counts by status, team, priority, and SLA breach count.
 *     tags: [CRM]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: CRM statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 byStatus:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 byTeam:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 byPriority:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       priority:
 *                         type: string
 *                       count:
 *                         type: integer
 *                 breaches:
 *                   type: integer
 *                   description: Number of tickets breaching SLA
 *       500:
 *         description: Server error
 */
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

    } catch (e) {
        logger.error('Failed to fetch CRM stats', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch CRM statistics' });
    }
});

// --- WEBHOOKS ---

/**
 * @swagger
 * /api/crm/webhooks/email:
 *   post:
 *     summary: Email webhook
 *     description: Inbound email webhook endpoint. Validates the webhook secret, finds or creates a contact from the sender address, and creates a new ticket from the email content. Triggers workflow evaluation and sends a creation notification.
 *     tags: [CRM]
 *     parameters:
 *       - in: header
 *         name: x-webhook-secret
 *         schema:
 *           type: string
 *         description: Webhook authentication secret (validated against WEBHOOK_SECRET env var)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - from
 *               - subject
 *               - tenant_id
 *             properties:
 *               from:
 *                 type: string
 *                 format: email
 *                 description: Sender email address
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *               body:
 *                 type: string
 *                 description: Email body content
 *               tenant_id:
 *                 type: integer
 *                 description: Target tenant ID
 *     responses:
 *       200:
 *         description: Email processed and ticket created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 ticket:
 *                   $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid webhook secret
 *       500:
 *         description: Server error
 */
router.post('/webhooks/email', async (req, res) => {
    try {
        const webhookSecret = req.headers['x-webhook-secret'];
        if (process.env.WEBHOOK_SECRET && webhookSecret !== process.env.WEBHOOK_SECRET) {
            return res.status(401).json({ error: 'Invalid webhook secret' });
        }

        const { from, subject, body, tenant_id } = req.body;
        logger.info("Receiving Email Webhook", { body: req.body });

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
            .catch(err => logger.error("Workflow Webhook Error", { error: err.message }));

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
        logger.error("Webhook Error", { error: err.message });
        res.status(500).json({ error: 'Failed to process email webhook' });
    }
});

/**
 * @swagger
 * /api/crm/public/tickets:
 *   post:
 *     summary: Public ticket creation
 *     description: Create a ticket from a public-facing form without authentication. Finds or creates a contact from the submitted email. Resolves tenant from request body or defaults to the first tenant. Auto-assigns to the General Support team.
 *     tags: [CRM]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *             properties:
 *               name:
 *                 type: string
 *                 description: Submitter name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Submitter email address
 *               subject:
 *                 type: string
 *                 description: Ticket subject
 *               description:
 *                 type: string
 *                 description: Ticket description
 *               tenant_id:
 *                 type: integer
 *                 description: Target tenant ID (defaults to first tenant if omitted)
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ticket'
 *       400:
 *         description: Missing required fields (name, email, subject)
 *       500:
 *         description: Server error
 */
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
        logger.error('Failed to create public ticket', { error: err.message });
        res.status(500).json({ error: 'Failed to submit ticket' });
    }
});

module.exports = router;
