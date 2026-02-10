const axios = require('axios');

async function testAiGenerate() {
    try {
        console.log("Testing POST http://localhost:3000/api/ai/generate...");
        const response = await axios.post('http://localhost:3000/api/ai/generate', {
            prompt: "Create a survey about customer service"
        });
        console.log("Success! Response:", JSON.stringify(response.data).substring(0, 500) + "...");
    } catch (err) {
        if (err.response) {
            console.error("Error Status:", err.response.status);
            console.error("Error Data:", JSON.stringify(err.response.data));
        } else {
            console.error("Error Message:", err.message);
        }
    }
}

testAiGenerate();
