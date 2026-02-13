exports.up = (pgm) => {
    // Tickets — dashboard listing by tenant + status
    pgm.createIndex('tickets', ['tenant_id', 'status'], { ifNotExists: true });

    // Tickets — workload queries by assignee
    pgm.createIndex('tickets', 'assigned_user_id', { ifNotExists: true });

    // Tickets — timeline ordering
    pgm.createIndex('tickets', ['tenant_id', 'created_at'], {
        ifNotExists: true,
        name: 'idx_tickets_tenant_created_desc',
    });

    // Users — tenant user listing
    pgm.createIndex('users', 'tenant_id', { ifNotExists: true });

    // Users — login lookups by email
    pgm.createIndex('users', 'email', { ifNotExists: true });

    // Subscriptions — tenant subscription checks
    pgm.createIndex('subscriptions', ['tenant_id', 'status'], { ifNotExists: true });

    // CJM maps index moved to migration 004 (after table creation)
    // pgm.createIndex('cjm_maps', 'tenant_id', { ifNotExists: true });

    // Submissions — composite for common form+tenant+date pattern
    pgm.createIndex('submissions', ['form_id', 'tenant_id', 'created_at'], {
        ifNotExists: true,
        name: 'idx_submissions_form_tenant_created',
    });

    // Workflows — active workflow evaluation
    pgm.createIndex('workflows', ['tenant_id', 'is_active'], { ifNotExists: true });

    // CRM accounts — account listing
    pgm.createIndex('crm_accounts', 'tenant_id', { ifNotExists: true });

    // Invoices — invoice queries
    pgm.createIndex('invoices', ['tenant_id', 'status'], { ifNotExists: true });
};

exports.down = (pgm) => {
    pgm.dropIndex('tickets', ['tenant_id', 'status'], { ifExists: true });
    pgm.dropIndex('tickets', 'assigned_user_id', { ifExists: true });
    pgm.dropIndex('tickets', ['tenant_id', 'created_at'], {
        ifExists: true,
        name: 'idx_tickets_tenant_created_desc',
    });
    pgm.dropIndex('users', 'tenant_id', { ifExists: true });
    pgm.dropIndex('users', 'email', { ifExists: true });
    pgm.dropIndex('subscriptions', ['tenant_id', 'status'], { ifExists: true });
    // pgm.dropIndex('cjm_maps', 'tenant_id', { ifExists: true });
    pgm.dropIndex('submissions', ['form_id', 'tenant_id', 'created_at'], {
        ifExists: true,
        name: 'idx_submissions_form_tenant_created',
    });
    pgm.dropIndex('workflows', ['tenant_id', 'is_active'], { ifExists: true });
    pgm.dropIndex('crm_accounts', 'tenant_id', { ifExists: true });
    pgm.dropIndex('invoices', ['tenant_id', 'status'], { ifExists: true });
};
