const axios = require('axios');
const { query } = require('../src/infrastructure/database/db');

async function testRoute(url) {
    try {
        console.log(`Testing GET ${url}...`);
        await axios.get(url);
        console.log(`Success hitting ${url}`);
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                console.error(`❌ ${url} NOT FOUND (404)`);
            } else {
                console.log(`✅ ${url} EXISTS (Status: ${error.response.status})`);
            }
        } else {
            console.error("Network Error:", error.message);
        }
    }
}

async function run() {
    await testRoute('http://localhost:3000/api/settings');
    await testRoute('http://localhost:3000/api/settings/channels');
    await testRoute('http://localhost:3000/api/settings/theme');
}

run();
