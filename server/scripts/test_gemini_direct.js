const axios = require('axios');
require('dotenv').config();

async function testGeminiDirect() {
    const apiKey = "AIzaSyCt7WzUlyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";
    const modelId = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    try {
        console.log("Testing Gemini Direct...");
        const response = await axios.post(url, {
            contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
        });
        console.log("Success:", response.data);
    } catch (err) {
        if (err.response) {
            console.error("Status:", err.response.status);
            console.error("Data:", JSON.stringify(err.response.data, null, 2));
        } else {
            console.error("Message:", err.message);
        }
    }
}

testGeminiDirect();
