const { pool } = require('../infrastructure/database/db');
const PostgresRepository = require('../infrastructure/database/PostgresRepository');
const ticketRepo = new PostgresRepository('tickets');

class WorkflowEngine {
    async evaluate(entityType, entity, eventType) {
        if (!entity.tenant_id) return;

        console.log(`[WorkflowEngine] Evaluating ${eventType} for ${entityType} ${entity.id}`);

        try {
            // Fetch active workflows for this trigger
            const res = await pool.query(
                "SELECT * FROM workflows WHERE tenant_id = $1 AND trigger_event = $2 AND is_active = true",
                [entity.tenant_id, eventType]
            );

            for (const wf of res.rows) {
                if (this.checkConditions(wf.conditions, entity)) {
                    console.log(`[WorkflowEngine] Triggering '${wf.name}'`);
                    await this.executeActions(wf.actions, entity);
                }
            }
        } catch (err) {
            console.error("[WorkflowEngine] Error:", err.message);
        }
    }

    checkConditions(conditions, entity) {
        if (!conditions || conditions.length === 0) return true; // No conditions = always run
        if (typeof conditions === 'string') conditions = JSON.parse(conditions);

        // conditions = [{ field: 'priority', operator: 'equals', value: 'high' }]
        // Support simple AND logic
        return conditions.every(cond => {
            const val = entity[cond.field];
            const target = cond.value;

            switch (cond.operator) {
                case 'equals': return val == target;
                case 'not_equals': return val != target;
                case 'contains': return val && val.includes(target);
                case 'greater_than': return val > target;
                case 'less_than': return val < target;
                default: return false;
            }
        });
    }

    async executeActions(actions, entity) {
        if (!actions) return;
        if (typeof actions === 'string') actions = JSON.parse(actions);

        for (const action of actions) {
            try {
                if (action.type === 'update_field' && entity.id) {
                    const updateData = { [action.field]: action.value };
                    await ticketRepo.update(entity.id, updateData);
                    console.log(`[Workflow] Updated Ticket ${entity.id}: ${action.field} = ${action.value}`);
                }
                else if (action.type === 'send_notification') {
                    // In-app notification
                    const userId = entity.assigned_user_id || action.target_user_id;
                    if (userId) {
                        await pool.query(
                            `INSERT INTO notifications (tenant_id, user_id, title, message, type, reference_id)
                             VALUES ($1, $2, $3, $4, 'workflow', $5)`,
                            [entity.tenant_id, userId, action.subject || 'Workflow Alert', action.message || 'Workflow triggered', entity.id]
                        );
                    }
                }
                else if (action.type === 'send_email') {
                    // Placeholder for email sending
                    console.log(`[Workflow] MOCK Sending Email to ${action.target}: ${action.subject}`);
                }
            } catch (e) {
                console.error(`[Workflow] Action Failed:`, e);
            }
        }
    }
}

module.exports = new WorkflowEngine();
