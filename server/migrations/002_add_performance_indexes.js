exports.up = (pgm) => {
    // Submission queries — tenant-scoped listing and form filtering
    pgm.createIndex('submissions', 'tenant_id', { ifNotExists: true });
    pgm.createIndex('submissions', ['form_id', 'tenant_id'], { ifNotExists: true });
    pgm.createIndex('submissions', 'created_at', { ifNotExists: true });

    // Quota lookups by form
    pgm.createIndex('quotas', ['form_id', 'is_active'], { ifNotExists: true });

    // Period counter lookups (composite for the common query pattern)
    pgm.createIndex('quota_period_counters', ['quota_id', 'period_key'], {
        ifNotExists: true,
        unique: true,
    });

    // Customer identity resolution (search by value)
    pgm.createIndex('customer_identities', 'identity_value', { ifNotExists: true });
    pgm.createIndex('customer_identities', 'customer_id', { ifNotExists: true });

    // Customer contacts lookup
    pgm.createIndex('customer_contacts', 'customer_id', { ifNotExists: true });

    // CRM contacts — tenant-scoped directory listing
    pgm.createIndex('crm_contacts', 'tenant_id', { ifNotExists: true });

    // Forms — tenant ownership checks
    pgm.createIndex('forms', 'tenant_id', { ifNotExists: true });

    // Tickets — contact-based ticket count subquery
    pgm.createIndex('tickets', 'contact_id', { ifNotExists: true });

    // Audit logs — entity lookup
    pgm.createIndex('audit_logs', ['entity_type', 'entity_id'], { ifNotExists: true });

    // Customer events — timeline queries
    pgm.createIndex('customer_events', ['customer_id', 'occurred_at'], { ifNotExists: true });

    // Customers — tenant listing
    pgm.createIndex('customers', ['tenant_id', 'created_at'], { ifNotExists: true });

    // Form contacts — form audience queries
    pgm.createIndex('form_contacts', 'form_id', { ifNotExists: true });
};

exports.down = (pgm) => {
    pgm.dropIndex('submissions', 'tenant_id', { ifExists: true });
    pgm.dropIndex('submissions', ['form_id', 'tenant_id'], { ifExists: true });
    pgm.dropIndex('submissions', 'created_at', { ifExists: true });
    pgm.dropIndex('quotas', ['form_id', 'is_active'], { ifExists: true });
    pgm.dropIndex('quota_period_counters', ['quota_id', 'period_key'], { ifExists: true });
    pgm.dropIndex('customer_identities', 'identity_value', { ifExists: true });
    pgm.dropIndex('customer_identities', 'customer_id', { ifExists: true });
    pgm.dropIndex('customer_contacts', 'customer_id', { ifExists: true });
    pgm.dropIndex('crm_contacts', 'tenant_id', { ifExists: true });
    pgm.dropIndex('forms', 'tenant_id', { ifExists: true });
    pgm.dropIndex('tickets', 'contact_id', { ifExists: true });
    pgm.dropIndex('audit_logs', ['entity_type', 'entity_id'], { ifExists: true });
    pgm.dropIndex('customer_events', ['customer_id', 'occurred_at'], { ifExists: true });
    pgm.dropIndex('customers', ['tenant_id', 'created_at'], { ifExists: true });
    pgm.dropIndex('form_contacts', 'form_id', { ifExists: true });
};
