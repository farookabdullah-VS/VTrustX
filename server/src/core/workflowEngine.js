const nodemailer = require('nodemailer');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

async function processSubmission(formId, submission) {
    logger.info('[WorkflowEngine] Processing submission', { formId });

    try {
        // Fetch active workflows
        const res = await query('SELECT * FROM workflows WHERE form_id = $1 AND is_active = true', [formId]);
        const workflows = res.rows;

        for (const wf of workflows) {
            // Trigger 1: Submission Completed
            if (wf.trigger_event === 'submission_completed') {
                if (evaluateConditions(wf.conditions, submission.data)) {
                    await executeActions(wf, submission);
                }
            }
        }
    } catch (err) {
        logger.error('[WorkflowEngine] Error', { error: err.message });
    }
}

function evaluateConditions(conditions, data) {
    if (!conditions || conditions.length === 0) return true;
    for (const cond of conditions) {
        const val = data[cond.field];
        if (cond.operator === 'equals' && val != cond.value) return false;
        if (cond.operator === 'contains' && (!val || !val.includes(cond.value))) return false;
        if (cond.operator === 'less_than' && (isNaN(Number(val)) || Number(val) >= Number(cond.value))) return false;
        if (cond.operator === 'greater_than' && (isNaN(Number(val)) || Number(val) <= Number(cond.value))) return false;
        if (cond.operator === 'less_than_or_equal' && (isNaN(Number(val)) || Number(val) > Number(cond.value))) return false;
        if (cond.operator === 'greater_than_or_equal' && (isNaN(Number(val)) || Number(val) < Number(cond.value))) return false;
    }
    return true;
}

async function executeActions(workflow, submission) {
    logger.info('[WorkflowEngine] Executing workflow', { name: workflow.name });
    if (!workflow.actions || !Array.isArray(workflow.actions)) return;

    for (const action of workflow.actions) {
        if (action.type === 'send_email') {
            await sendEmail(action, submission);
        } else if (action.type === 'sync_integration') {
            await syncIntegration(action, submission);
        } else if (action.type === 'create_ticket') {
            await createTicket(action, submission);
        }
    }
}

async function createTicket(action, submission) {
    logger.info('[WorkflowEngine] Creating ticket from submission');
    try {
        // 1. Resolve Contact (Try email from submission data)
        let contactId = null;
        // Common keys for email in surveys
        const email = submission.data.email || submission.data.Email || submission.data.contact_email;
        const name = submission.data.name || submission.data.Name || 'Anonymous Surveyor';
        const tenantId = submission.metadata?.tenant_id || submission.tenantId || 'default';

        if (email) {
            // Find or Create
            const res = await query("SELECT id FROM crm_contacts WHERE email = $1", [email]);
            if (res.rows.length > 0) {
                contactId = res.rows[0].id;
            } else {
                // Insert simplistic contact
                const newC = await query(
                    "INSERT INTO crm_contacts (name, email, created_at, tenant_id) VALUES ($1, $2, NOW(), $3) RETURNING id",
                    [name, email, tenantId]
                );
                contactId = newC.rows[0].id;
            }
        }

        // 2. Ticket Details
        const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
        const subject = action.subject || `Survey Follow-up: ${submission.formId}`;
        const description = `Auto-generated from Survey Submission.\n\nScore: ${JSON.stringify(submission.data)}`;
        const submissionId = submission.id || null;

        // SLA defaults
        const now = new Date();
        const created = await query(`
            INSERT INTO tickets (
                ticket_code, subject, description, priority, status,
                channel, contact_id, created_at, updated_at, tenant_id,
                first_response_due_at, resolution_due_at, submission_id
            ) VALUES (
                $1, $2, $3, $4, 'new',
                'survey', $5, NOW(), NOW(), $6,
                $7, $8, $9
            ) RETURNING id, ticket_code
        `, [
            code,
            subject,
            description,
            'medium',
            contactId,
            tenantId,
            new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h response
            new Date(now.getTime() + 48 * 60 * 60 * 1000), // 48h resolution
            submissionId
        ]);

        logger.info('[WorkflowEngine] Ticket created', { ticketCode: created.rows[0].ticket_code });

    } catch (e) {
        logger.error('[WorkflowEngine] Ticket creation failed', { error: e.message });
    }

}

async function syncIntegration(action, submission) {
    logger.info('[WorkflowEngine] Syncing to integration', { integrationId: action.integration_id });
    try {
        if (!action.integration_id) return;

        // Fetch Integration Details
        const res = await query('SELECT * FROM integrations WHERE id = $1', [action.integration_id]);
        if (res.rows.length === 0) return;

        const integration = res.rows[0];

        logger.info('[WorkflowEngine] Target provider', { provider: integration.provider });

        // Mode 1: Webhook (Generic)
        if (integration.webhook_url) {
            logger.info('[WorkflowEngine] Sending webhook', { url: integration.webhook_url });
            try {
                const response = await fetch(integration.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'submission_completed',
                        provider: integration.provider,
                        data: submission.data,
                        metadata: submission.metadata,
                        timestamp: new Date()
                    })
                });
                logger.info('[WorkflowEngine] Webhook response', { status: response.status });
            } catch (e) {
                logger.error('[WorkflowEngine] Webhook failed', { error: e.message });
            }
        }
        // Mode 2: Simulated API Sync (for demo)
        else {
            logger.info('[WorkflowEngine] Native API sync initiated (simulated)', { provider: integration.provider });
        }

    } catch (e) {
        logger.error('[WorkflowEngine] Integration sync failed', { error: e.message });
    }
}

async function sendEmail(action, submission) {
    try {
        // Fetch SMTP Settings
        const res = await query("SELECT * FROM settings WHERE key IN ('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from')");
        const settings = {};
        res.rows.forEach(r => settings[r.key] = r.value);

        // Check if SMTP configured
        if (!settings.smtp_host || !settings.smtp_user) {
            logger.warn('[WorkflowEngine] SMTP not configured, simulating email', { to: action.to, subject: action.subject });
            return;
        }

        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: parseInt(settings.smtp_port || 587),
            secure: settings.smtp_port == 465,
            auth: {
                user: settings.smtp_user,
                pass: settings.smtp_pass
            }
        });

        let body = action.body || "";
        const dataDump = JSON.stringify(submission.data, null, 2);

        await transporter.sendMail({
            from: action.from || settings.smtp_from || settings.smtp_user,
            to: action.to,
            cc: action.cc,
            subject: action.subject,
            text: body + "\n\n---\nSubmission Data:\n" + dataDump
        });

        logger.info('[WorkflowEngine] Email sent', { to: action.to });

    } catch (e) {
        logger.error('[WorkflowEngine] Email send failed', { error: e.message });
    }
}

module.exports = { processSubmission };
