const axios = require('axios');

async function testUserFlow() {
    const randomUser = `user_${Math.floor(Math.random() * 10000)}`;
    const password = 'testpassword';

    console.log(`Starting Test Flow for ${randomUser}...`);

    try {
        // 1. Register
        console.log('1. Registering...');
        const registerRes = await axios.post('http://localhost:3000/api/auth/register', {
            username: randomUser,
            password: password
        });
        console.log('Register Success:', registerRes.data.username);

        // 2. Login to get token
        console.log('2. Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: randomUser,
            password: password
        });
        const token = loginRes.data.token;
        const userId = loginRes.data.user.id;
        console.log(`Login Success. Token length: ${token.length}, ID: ${userId}`);

        // 3. Update Username
        console.log('3. Updating Username...');
        const newName = randomUser + '_updated';
        const updateRes = await axios.put(`http://localhost:3000/api/users/${userId}`,
            { username: newName },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Update Success. New Name:', updateRes.data.username);

        if (updateRes.data.username === newName) {
            console.log('✅ TEST PASSED');
        } else {
            console.error('❌ TEST FAILED: Name mismatch');
        }

    } catch (err) {
        console.error('❌ TEST FAILED:', err.response?.data || err.message);
    }
}

testUserFlow();
