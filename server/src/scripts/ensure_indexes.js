const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

async function ensureIndexes() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_forms_tenant_published ON forms(tenant_id, is_published)',
    'CREATE INDEX IF NOT EXISTS idx_submissions_form_created ON submissions(form_id, created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_submissions_tenant ON submissions(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_tenant_status ON tickets(tenant_id, status)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_quotas_form ON quotas(form_id)',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id)',
    'CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id)',
    'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)',
  ];

  let created = 0;
  for (const sql of indexes) {
    try {
      await query(sql);
      created++;
    } catch (err) {
      // Table may not exist yet - that's OK, skip silently
      logger.debug(`Index skipped (table may not exist): ${sql.substring(0, 60)}...`);
    }
  }
  logger.info(`Database indexes ensured: ${created}/${indexes.length} processed`);
}

module.exports = ensureIndexes;
