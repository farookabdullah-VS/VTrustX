const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const jar = new CookieJar();
const client = wrapper(axios.create({
    jar,
    withCredentials: true,
    baseURL: 'http://localhost:3000'
}));

async function testLogin() {
    try {
        console.log('Fetching CSRF token...');
        const csrfRes = await client.get('/api/auth/csrf-token');
        const csrfToken = csrfRes.data.csrfToken;
        console.log('CSRF Token fetched:', csrfToken);

        console.log('Attempting login...');
        const response = await client.post('/api/auth/login', {
            username: 'admin',
            password: 'admin'
        }, {
            headers: {
                'X-CSRF-Token': csrfToken
            }
        });

        console.log('Login Status:', response.status);
        console.log('User Role:', response.data.user?.role);
        console.log('Login successful!');
    } catch (error) {
        console.error('Login failed:', error.response?.status, error.response?.data || error.message);
    }
}

testLogin();
