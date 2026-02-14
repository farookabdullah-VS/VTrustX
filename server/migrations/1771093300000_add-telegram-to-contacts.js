/**
 * Add Telegram Fields to Contacts
 *
 * Adds telegram_chat_id and telegram_username fields to the contacts table
 * to support Telegram channel distribution
 */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Add Telegram fields to contacts table
    pgm.addColumns('contacts', {
        telegram_chat_id: {
            type: 'varchar(255)',
            comment: 'Telegram chat ID for direct messaging'
        },
        telegram_username: {
            type: 'varchar(255)',
            comment: 'Telegram username (@username)'
        }
    });

    // Add indexes for telegram fields
    pgm.createIndex('contacts', 'telegram_chat_id', {
        ifNotExists: true,
        name: 'idx_contacts_telegram_chat_id'
    });

    pgm.createIndex('contacts', 'telegram_username', {
        ifNotExists: true,
        name: 'idx_contacts_telegram_username'
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop indexes
    pgm.dropIndex('contacts', 'telegram_username', {
        ifExists: true,
        name: 'idx_contacts_telegram_username'
    });

    pgm.dropIndex('contacts', 'telegram_chat_id', {
        ifExists: true,
        name: 'idx_contacts_telegram_chat_id'
    });

    // Remove Telegram fields
    pgm.dropColumns('contacts', ['telegram_chat_id', 'telegram_username'], {
        ifExists: true
    });
};
