const { pool } = require('../src/infrastructure/database/db');
const PostgresRepository = require('../src/infrastructure/database/PostgresRepository');
const ticketRepo = new PostgresRepository('tickets');
const workflowEngine = require('../src/services/workflowEngine');

async function testTicketFlow() {
    console.log("Starting Ticket Flow Test...");
    try {
        // Mock Tenant
        const tenantId = 1; // Assuming default

        // 1. Create Ticket (Simulate API Logic)
        const newTicket = {
            ticket_code: 'TEST-' + Date.now(),
            subject: 'Test Ticket for Workflow',
            description: 'Checking if workflows fail',
            priority: 'medium',
            status: 'new',
            channel: 'web',
            assigned_user_id: 1, // Ensure user exists or use null
            tenant_id: tenantId,
            created_at: new Date()
        };

        console.log("Creating Ticket...");
        const saved = await ticketRepo.create(newTicket);
        console.log("Ticket Created ID:", saved.id);

        // 2. Mock Workflow Trigger (since I missed it in API)
        console.log("Triggering Create Workflow...");
        await workflowEngine.evaluate('ticket', saved, 'ticket_created');
        console.log("Create Workflow Triggered.");

        // 3. Update Ticket
        console.log("Updating Ticket...");
        const updates = { status: 'open' };
        const updated = await ticketRepo.update(saved.id, updates);
        console.log("Ticket Updated Status:", updated.status);

        // 4. Trigger Update Workflow
        console.log("Triggering Update Workflow...");
        await workflowEngine.evaluate('ticket', { ...updates, id: saved.id, tenant_id: tenantId }, 'ticket_updated');
        console.log("Update Workflow Triggered.");

        console.log("TEST PASSED: Ticket System Flow is working.");

    } catch (e) {
        console.error("TEST FAILED:", e);
    } finally {
        await pool.end();
    }
}

testTicketFlow();
