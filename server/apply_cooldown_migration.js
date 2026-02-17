const { query } = require('./src/infrastructure/database/db');
const logger = require('./src/infrastructure/logger');

async function applyCooldownMigration() {
    try {
        console.log('🔄 Applying survey cooldown migration...\n');

        // Check if columns already exist
        const checkResult = await query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'forms'
            AND column_name IN ('cooldown_enabled', 'cooldown_period', 'cooldown_type')
        `);

        if (checkResult.rows.length > 0) {
            console.log('✅ Cooldown columns already exist. Migration not needed.');
            process.exit(0);
        }

        // Step 1: Add columns
        console.log('1️⃣  Adding cooldown columns to forms table...');
        await query(`
            ALTER TABLE forms
            ADD COLUMN IF NOT EXISTS cooldown_enabled BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS cooldown_period INTEGER DEFAULT 3600,
            ADD COLUMN IF NOT EXISTS cooldown_type VARCHAR(10) DEFAULT 'both'
        `);
        console.log('   ✅ Columns added\n');

        // Step 2: Add constraint
        console.log('2️⃣  Adding constraint for cooldown_type...');
        await query(`
            ALTER TABLE forms
            ADD CONSTRAINT check_cooldown_type
            CHECK (cooldown_type IN ('ip', 'user', 'both'))
        `);
        console.log('   ✅ Constraint added\n');

        // Step 3: Add index
        console.log('3️⃣  Creating index for cooldown_enabled...');
        await query(`
            CREATE INDEX IF NOT EXISTS idx_forms_cooldown_enabled
            ON forms(cooldown_enabled)
            WHERE cooldown_enabled = true
        `);
        console.log('   ✅ Index created\n');

        // Step 4: Add comments
        console.log('4️⃣  Adding column comments...');
        await query(`
            COMMENT ON COLUMN forms.cooldown_enabled IS 'Enable submission rate limiting (cool down)';
        `);
        await query(`
            COMMENT ON COLUMN forms.cooldown_period IS 'Cool down period in seconds (e.g., 3600 = 1 hour)';
        `);
        await query(`
            COMMENT ON COLUMN forms.cooldown_type IS 'Rate limit type: ip (IP-based), user (user-based), or both (hybrid)';
        `);
        console.log('   ✅ Comments added\n');

        // Verify the changes
        console.log('5️⃣  Verifying migration...');
        const verifyResult = await query(`
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'forms'
            AND column_name IN ('cooldown_enabled', 'cooldown_period', 'cooldown_type')
            ORDER BY column_name
        `);

        console.log('   Columns created:');
        verifyResult.rows.forEach(row => {
            console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default})`);
        });

        console.log('\n✅ Survey cooldown migration completed successfully!\n');
        console.log('📝 You can now:');
        console.log('   1. Enable cooldown on forms via API: PUT /api/forms/:id');
        console.log('   2. Check cooldown status: POST /api/forms/:id/cooldown/check');
        console.log('   3. Clear cooldown (admin): DELETE /api/forms/:id/cooldown/clear\n');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        process.exit(0);
    }
}

applyCooldownMigration();
