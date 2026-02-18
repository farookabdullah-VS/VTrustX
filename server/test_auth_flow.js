
require('dotenv').config({ path: '../.env' });
const { query } = require('./src/infrastructure/database/db');
const PostgresRepository = require('./src/infrastructure/database/PostgresRepository');
const { loginAttemptCache } = require('./src/infrastructure/cache');
const userRepo = new PostgresRepository('users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function testAuth() {
    console.log('--- Starting Auth Flow Test ---');
    try {
        const username = 'admin'; // Or whatever user you want to test
        const password = 'password123'; // Guessing password or just testing flow

        // 1. Check Lockout Cache
        console.log('Checking lockout cache...');
        const attempts = (await loginAttemptCache.get(`login_attempts:${username}`)) || 0;
        console.log('Login attempts:', attempts);

        // 2. Find User
        console.log('Finding user...');
        const user = await userRepo.findBy('username', username);
        if (!user) {
            console.log('User not found.');
            return;
        }
        console.log('User found:', user.username);

        // 3. Verify Password (Bcrypt)
        console.log('Verifying password...');
        // Just mock verifying for now, or check format
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            console.log('Password hash format looks correct.');
            // We don't have the plain password so we can't verify unless we know it.
            // But we can check if bcrypt.compare throws
            const isMatch = await bcrypt.compare('wrongpassword', user.password);
            console.log('Password check (wrong password):', isMatch);
        } else {
            console.log('Password not hashed properly:', user.password);
        }

        // 4. Create Tokens
        console.log('Creating tokens...');
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET missing');

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, tenant_id: user.tenant_id },
            secret,
            { expiresIn: '15m' }
        );
        console.log('Token created successfully.');

        // 5. Create Refresh Token (DB Insert)
        console.log('Creating refresh token...');
        const crypto = require('crypto');
        const rToken = crypto.randomBytes(48).toString('base64url');
        const tokenHash = crypto.createHash('sha256').update(rToken).digest('hex');
        // expires 7 days from now
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        try {
            await query(
                `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
                [user.id, tokenHash, expiresAt]
            );
            console.log('Refresh token inserted successfully.');
        } catch (e) {
            console.error('Refresh token insert failed:', e.message);
        }

        console.log('--- Auth Flow Test Completed Successfully ---');

    } catch (err) {
        console.error('--- Test Failed ---');
        console.error(err);
    } finally {
        process.exit();
    }
}

testAuth();
