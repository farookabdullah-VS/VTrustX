const axios = require('axios');

async function testModels() {
    const apiKey = "AIzaSyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";
    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-2.0-flash-exp'];

    for (const modelId of models) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        try {
            console.log(`Testing Model: ${modelId}...`);
            const response = await axios.post(url, {
                contents: [{ role: 'user', parts: [{ text: "Hi" }] }]
            });
            console.log(`Success with ${modelId}!`);
            return;
        } catch (err) {
            console.log(`Failed ${modelId}: ${err.response ? err.response.status : err.message}`);
            if (err.response && err.response.data && err.response.data.error) {
                console.log(`Reason: ${err.response.data.error.message.substring(0, 100)}...`);
            }
        }
    }
}

testModels();
