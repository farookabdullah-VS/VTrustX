/**
 * Add last_login_at to users table
 * 
 * This column tracks when a user last logged in to the platform.
 * It is already present in init.sql but might be missing in older environments.
 */

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {
    pgm.dropColumns('users', ['last_login_at'], { ifExists: true });
};
