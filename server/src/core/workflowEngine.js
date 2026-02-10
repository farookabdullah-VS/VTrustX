const nodemailer = require('nodemailer');
const { query } = require('../infrastructure/database/db');

async function processSubmission(formId, submission) {
    console.log(`[WorkflowEngine] Processing submission for Form ${formId}`);

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
        console.error("[WorkflowEngine] Error:", err);
    }
}

function evaluateConditions(conditions, data) {
    if (!conditions || conditions.length === 0) return true;
    for (const cond of conditions) {
        const val = data[cond.field];
        if (cond.operator === 'equals' && val != cond.value) return false;
        if (cond.operator === 'contains' && (!val || !val.includes(cond.value))) return false;
    }
    return true;
}

async function executeActions(workflow, submission) {
    console.log(`[WorkflowEngine] Executing Workflow: ${workflow.name}`);
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
    console.log(`[WorkflowEngine] Creating Ticket based on Submission...`);
    try {
        // 1. Resolve Contact (Try email from submission data)
        let contactId = null;
        // Common keys for email in surveys
        const email = submission.data.email || submission.data.Email || submission.data.contact_email;
        const name = submission.data.name || submission.data.Name || 'Anonymous Surveyor';
        const tenantId = submission.metadata?.tenant_id || 'default'; // Need tenant context

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

        // SLA defaults
        const now = new Date();
        const created = await query(`
            INSERT INTO tickets (
                ticket_code, subject, description, priority, status, 
                channel, contact_id, created_at, updated_at, tenant_id,
                first_response_due_at, resolution_due_at
            ) VALUES (
                $1, $2, $3, $4, 'new', 
                'survey', $5, NOW(), NOW(), $6,
                $7, $8
            ) RETURNING id, ticket_code
        `, [
            code,
            subject,
            description,
            'medium',
            contactId,
            tenantId,
            new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h response
            new Date(now.getTime() + 48 * 60 * 60 * 1000)  // 48h resolution
        ]);

        console.log(`[WorkflowEngine] ✅ Ticket Created: ${created.rows[0].ticket_code}`);

    } catch (e) {
        console.error("[WorkflowEngine] Ticket Creation Failed:", e);
    }

}

async function syncIntegration(action, submission) {
    console.log(`[WorkflowEngine] Syncing to Integration ID: ${action.integration_id}`);
    try {
        if (!action.integration_id) return;

        // Fetch Integration Details
        const res = await query('SELECT * FROM integrations WHERE id = $1', [action.integration_id]);
        if (res.rows.length === 0) return;

        const integration = res.rows[0];

        console.log(`[WorkflowEngine] Target: ${integration.provider}`);

        // Mode 1: Webhook (Generic)
        if (integration.webhook_url) {
            console.log(`[WorkflowEngine] Sending Webhook to: ${integration.webhook_url}`);
            // Use axios? Need to import generic fetch or axios. 
            // Built-in fetch in Node 18+ or install axios.
            // I'll use fetch.
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
                console.log(`[WorkflowEngine] Webhook Reponse: ${response.status}`);
            } catch (e) {
                console.error(`[WorkflowEngine] Webhook Failed:`, e.message);
            }
        }
        // Mode 2: Simulated API Sync (for demo)
        else {
            console.log(`[WorkflowEngine] Native API Sync to ${integration.provider} initiated...`);
            console.log(`[WorkflowEngine] (Simulation) Pushing data:`, JSON.stringify(submission.data).substring(0, 50) + "...");
            // In real app, we'd use 'integration.api_key' to authenticate against HubSpot/SFDC API here.
            console.log(`[WorkflowEngine] ✅ Sync Successful (Simulated)`);
        }

    } catch (e) {
        console.error("Integration Sync Failed:", e);
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
            console.log("---------------------------------------------------");
            console.log(`⚠️ SMTP MISSING. SIMULATING EMAIL:`);
            console.log(`To: ${action.to}`);
            console.log(`Subject: ${action.subject}`);
            console.log("---------------------------------------------------");
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

        console.log("✅ Email sent via SMTP to " + action.to);

    } catch (e) {
        console.error("❌ Email Send Failed:", e);
    }
}

module.exports = { processSubmission };
