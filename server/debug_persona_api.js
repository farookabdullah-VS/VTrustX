const axios = require('axios');

async function debug() {
    try {
        // Login as admin
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log("Login Token:", token.substring(0, 10) + "...");

        // Check DB Debug
        const dbRes = await axios.get('http://localhost:3000/api/debug/debug-db');
        console.log("DB Context:", dbRes.data);

        // Fetch Personas
        const res = await axios.get('http://localhost:3000/api/cx-personas', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log("API Response Status:", res.status);
        console.log("Personas Count:", res.data.length);
        console.log("Data:", res.data);

    } catch (e) {
        console.error("DEBUG FAILED:", e.message);
        if (e.response) console.error(e.response.data);
    }
}
debug();
