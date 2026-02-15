const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'vtrustx_db',
    port: process.env.DB_PORT || 5432,
    host: process.env.DB_HOST || '127.0.0.1'
};

const pool = new Pool(dbConfig);

async function unlockUser() {
    try {
        console.log('Unlocking admin user...');

        // Reset login attempts and unlock
        const result = await pool.query(
            `UPDATE users
             SET login_attempts = 0,
                 locked_until = NULL,
                 updated_at = NOW()
             WHERE username = $1 OR email = $2
             RETURNING id, username, email, login_attempts, locked_until`,
            ['admin', 'admin@example.com']
        );

        if (result.rows.length > 0) {
            console.log('✅ Admin account unlocked successfully!');
            console.log('User details:', result.rows[0]);
            console.log('\n📝 You can now login with:');
            console.log('   Username: admin');
            console.log('   Password: admin');
        } else {
            console.log('⚠️  Admin user not found');
        }

    } catch (err) {
        console.error('❌ Error unlocking user:', err);
        console.error('Error details:', err.message);
    } finally {
        await pool.end();
    }
}

unlockUser();
