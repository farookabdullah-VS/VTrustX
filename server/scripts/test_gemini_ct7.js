const axios = require('axios');

async function testGeminiDirect() {
    // Key with Ct7WzUl
    const apiKey = "AIzaSyCt7WzUlyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";
    const modelId = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    try {
        console.log("Testing Gemini Direct with Ct7WzUl key...");
        const response = await axios.post(url, {
            contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
        });
        console.log("Success:", JSON.stringify(response.data, null, 2));
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
