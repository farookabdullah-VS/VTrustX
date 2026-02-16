const { query } = require('./src/infrastructure/database/db');

async function fix() {
    try {
        await query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_login_at') THEN
                    ALTER TABLE users ADD COLUMN last_login_at TIMESTAMP;
                END IF;
            END $$;
        `);
        console.log('Checked/Added last_login_at successfully');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        process.exit();
    }
}

fix();
