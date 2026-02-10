
const axios = require('axios');

async function testGenerate() {
    const url = 'http://localhost:3000/api/ai/generate';
    const prompt = 'Create a customer satisfaction survey with 5 questions';

    console.log(`Testing AI Generation via Main Server: ${url}`);
    try {
        const response = await axios.post(url, { prompt });
        console.log("Success! Response (truncated):");
        console.log(JSON.stringify(response.data).substring(0, 200) + "...");
    } catch (error) {
        console.error("Test Failed!");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(`Data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(error.message);
        }
    }
}

testGenerate();
