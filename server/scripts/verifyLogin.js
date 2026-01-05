// Native fetch is available in Node 18+


const API_URL = 'http://localhost:3000/api/auth';

async function verifyLogin() {
    console.log('--- Starting Login Verification ---');

    // 1. Register
    const timestamp = Date.now();
    const username = `admin_${timestamp}`;
    const password = 'password123';

    try {
        console.log(`\n1. Attempting to register user: ${username}`);
        const regRes = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'admin' })
        });

        if (!regRes.ok) {
            const err = await regRes.text();
            throw new Error(`Registration failed: ${regRes.status} - ${err}`);
        }

        const regData = await regRes.json();
        console.log('✅ Registration Successful:', regData);

        // 2. Login
        console.log(`\n2. Attempting to login user: ${username}`);
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!loginRes.ok) {
            const err = await loginRes.text();
            throw new Error(`Login failed: ${loginRes.status} - ${err}`);
        }

        const loginData = await loginRes.json();
        console.log('✅ Login Successful!');
        console.log('Token received:', loginData.token ? 'YES (Mock Token)' : 'NO');
        console.log('User Role:', loginData.user.role);

    } catch (error) {
        console.error('❌ Verification Failed:', error.message);
        process.exit(1);
    }
}

verifyLogin();
