const axios = require('axios');

async function testV1() {
    const apiKey = "AIzaSyCt7WzUlyBXdkCOtjHTGyEBwlEGYrL8lw7ss1oqI_s";
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        console.log("Testing Gemini V1 URL...");
        const response = await axios.post(url, {
            contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
        });
        console.log("Success:", response.data);
    } catch (err) {
        console.log(`Failed: ${err.response ? err.response.status : err.message}`);
        if (err.response && err.response.data) console.log(JSON.stringify(err.response.data, null, 2));
    }
}

testV1();
