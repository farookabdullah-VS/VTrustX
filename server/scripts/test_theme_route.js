const axios = require('axios');
const { query } = require('../src/infrastructure/database/db');

// Mock Authentication Token (Need to get a real one or bypass auth for test)
// For this test, we'll try to hit the endpoint. If it returns 401, the route exists.
// If it returns 404, the route does not exist.

async function testRoute() {
    try {
        console.log("Testing GET http://localhost:3000/api/settings/theme...");
        await axios.get('http://localhost:3000/api/settings/theme');
        console.log("Success (unexpected without auth)");
    } catch (error) {
        if (error.response) {
            console.log(`Response Status: ${error.response.status}`);
            if (error.response.status === 404) {
                console.error("❌ Route NOT FOUND (404)");
            } else if (error.response.status === 401 || error.response.status === 403) {
                console.log("✅ Route EXISTS (Auth required as expected) - Status:", error.response.status);
            } else {
                console.log(`⚠️ Other error: ${error.response.status}`);
            }
        } else {
            console.error("Network Error or Server Down:", error.message);
        }
    }
}

testRoute();
