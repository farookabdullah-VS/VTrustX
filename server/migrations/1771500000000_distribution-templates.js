/* eslint-disable camelcase */

exports.up = (pgm) => {
    pgm.createTable('distribution_templates', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true, references: 'tenants(id)', onDelete: 'CASCADE' },
        name: { type: 'varchar(255)', notNull: true },
        description: { type: 'text' },
        channel: { type: 'varchar(20)', notNull: true, default: "'email'" },
        subject: { type: 'varchar(500)' },
        body: { type: 'text', notNull: true },
        created_by: { type: 'integer', references: 'users(id)', onDelete: 'SET NULL' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') },
    });

    pgm.addConstraint('distribution_templates', 'chk_dist_tmpl_channel',
        "channel IN ('email', 'sms', 'whatsapp', 'qr')");

    pgm.createIndex('distribution_templates', 'tenant_id', { name: 'idx_dist_tmpl_tenant' });
    pgm.createIndex('distribution_templates', ['tenant_id', 'channel'], { name: 'idx_dist_tmpl_channel' });
};

exports.down = (pgm) => {
    pgm.dropTable('distribution_templates');
};
