const axios = require('axios');

async function testUpdateUser() {
    try {
        console.log('1. Logging in...');
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'farook',
            password: 'password123'
        });

        const token = loginRes.data.token;
        const userId = loginRes.data.user.id;
        const currentUsername = loginRes.data.user.username;
        console.log(`Logged in as ID: ${userId}, Name: ${currentUsername}`);

        console.log('2. Attempting to update username...');
        const newName = currentUsername === 'farook' ? 'farook_updated' : 'farook';

        try {
            const updateRes = await axios.put(`http://localhost:3000/api/users/${userId}`,
                { username: newName },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log('Update Success:', updateRes.data);
        } catch (err) {
            console.error('Update Failed Status:', err.response?.status);
            console.error('Update Failed Data:', err.response?.data);
        }

    } catch (err) {
        console.error('Login Failed:', err.message);
    }
}

testUpdateUser();
