/**
 * Survey Cool Down Migration
 *
 * Adds cool down (rate limiting) configuration to forms table.
 * Supports IP-based, user-based, or hybrid submission rate limiting.
 *
 * Features:
 * - cooldown_enabled: Enable/disable cool down per form
 * - cooldown_period: Time window in seconds (e.g., 3600 = 1 hour)
 * - cooldown_type: 'ip', 'user', or 'both' (hybrid)
 *
 * Example use cases:
 * - Prevent duplicate submissions from same IP within 1 hour
 * - Allow authenticated users to submit once per day
 * - Hybrid: Both IP and user checks
 */

exports.up = (pgm) => {
    // ── Add cool down columns to forms table ──
    pgm.sql(`
        ALTER TABLE forms
        ADD COLUMN IF NOT EXISTS cooldown_enabled BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS cooldown_period INTEGER DEFAULT 3600,
        ADD COLUMN IF NOT EXISTS cooldown_type VARCHAR(10) DEFAULT 'both'
    `);

    // ── Add constraint for cooldown_type ──
    pgm.sql(`
        ALTER TABLE forms
        ADD CONSTRAINT check_cooldown_type
        CHECK (cooldown_type IN ('ip', 'user', 'both'))
    `);

    // ── Add index for forms with cool down enabled ──
    pgm.sql(`
        CREATE INDEX IF NOT EXISTS idx_forms_cooldown_enabled
        ON forms(cooldown_enabled)
        WHERE cooldown_enabled = true
    `);

    // ── Comment for documentation ──
    pgm.sql(`
        COMMENT ON COLUMN forms.cooldown_enabled IS 'Enable submission rate limiting (cool down)';
        COMMENT ON COLUMN forms.cooldown_period IS 'Cool down period in seconds (e.g., 3600 = 1 hour)';
        COMMENT ON COLUMN forms.cooldown_type IS 'Rate limit type: ip (IP-based), user (user-based), or both (hybrid)';
    `);
};

exports.down = (pgm) => {
    // Remove index
    pgm.sql('DROP INDEX IF EXISTS idx_forms_cooldown_enabled');

    // Remove constraint
    pgm.sql('ALTER TABLE forms DROP CONSTRAINT IF EXISTS check_cooldown_type');

    // Remove columns
    pgm.sql(`
        ALTER TABLE forms
        DROP COLUMN IF EXISTS cooldown_enabled,
        DROP COLUMN IF EXISTS cooldown_period,
        DROP COLUMN IF EXISTS cooldown_type
    `);
};
