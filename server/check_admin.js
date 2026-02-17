const db = require('./src/infrastructure/database/db');

async function checkAdmin() {
    try {
        const result = await db.query('SELECT id, username, role, tenant_id, password FROM users WHERE username = $1', ['admin']);

        if (result.rows[0]) {
            const user = result.rows[0];
            console.log('\n=== Admin Account Details ===');
            console.log('Username:', user.username);
            console.log('Role:', user.role);
            console.log('Tenant ID:', user.tenant_id);
            console.log('Password hash:', user.password.substring(0, 30) + '...');

            if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
                console.log('Password type: Bcrypt (✓ Valid)');
                console.log('\nℹ️  Password is encrypted. You need to know the original password.');
                console.log('ℹ️  Try common defaults: admin, admin123, password, 123456');
            } else {
                console.log('Password type: Plain text (needs reset)');
            }
        } else {
            console.log('No admin user found');
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        process.exit();
    }
}

checkAdmin();
