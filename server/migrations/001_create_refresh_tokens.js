exports.up = (pgm) => {
    pgm.createTable('refresh_tokens', {
        id: 'id',
        user_id: {
            type: 'integer',
            notNull: true,
            references: 'users',
            onDelete: 'CASCADE',
        },
        token_hash: {
            type: 'varchar(128)',
            notNull: true,
            unique: true,
        },
        expires_at: {
            type: 'timestamp',
            notNull: true,
        },
        created_at: {
            type: 'timestamp',
            default: pgm.func('CURRENT_TIMESTAMP'),
        },
        revoked_at: {
            type: 'timestamp',
        },
    });

    pgm.createIndex('refresh_tokens', 'user_id');
    pgm.createIndex('refresh_tokens', 'token_hash');
};

exports.down = (pgm) => {
    pgm.dropTable('refresh_tokens');
};
