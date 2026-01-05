const axios = require('axios');

async function debug() {
    try {
        console.log("1. Logging in...");
        const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
            username: 'admin',
            password: 'admin'
        });
        const token = loginRes.data.token;
        console.log("   Token:", token);

        const config = { headers: { Authorization: `Bearer ${token}` } };

        console.log("\n2. Fetching Stats...");
        try {
            const stats = await axios.get('http://localhost:3000/api/admin/stats', config);
            console.log("   Success:", stats.data);
        } catch (e) {
            console.log("   FAILED:", e.response?.status, e.response?.data);
        }

        console.log("\n3. Fetching Tenants...");
        try {
            const tenants = await axios.get('http://localhost:3000/api/admin/tenants', config);
            console.log("   Success: Retrieved", tenants.data.length, "tenants");
        } catch (e) {
            console.log("   FAILED:", e.response?.status, e.response?.data);
        }

        console.log("\n4. Fetching Plans...");
        try {
            const plans = await axios.get('http://localhost:3000/api/admin/plans', config);
            console.log("   Success: Retrieved", plans.data.length, "plans");
        } catch (e) {
            console.log("   FAILED:", e.response?.status, e.response?.data);
        }

    } catch (e) {
        console.error("Top Level Error:", e.message);
        if (e.response) console.error(e.response.data);
    }
}
debug();
