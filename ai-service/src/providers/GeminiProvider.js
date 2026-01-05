const axios = require('axios');

class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async analyze(submission, formDefinition) {
        if (!this.apiKey) {
            return { provider: 'Gemini (Mock)', summary: "API Key missing." };
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
        const prompt = `Analyze: ${JSON.stringify(submission.data)}`;

        try {
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }]
            });

            return {
                submissionId: submission.id,
                timestamp: new Date(),
                provider: 'Gemini',
                insights: response.data.candidates[0].content.parts[0].text
            };
        } catch (error) {
            console.error("Gemini Error:", error.message);
            throw error;
        }
    }

    async chat(messages) {
        if (!this.apiKey) {
            console.warn("Gemini API Key missing. Returning mock response.");
            return "I am a simulated AI agent (No Key). How can I help?";
        }

        // Allow user to configure model version in .env (Default: gemini-1.5-flash)
        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        let contents = [];
        let systemInstruction = "";

        // 1. Extract System Instruction and Map Messages
        messages.forEach((m, index) => {
            if (m.role === 'system') {
                systemInstruction += m.content + "\n";
            } else if (m.role === 'user') {
                contents.push({ role: "user", parts: [{ text: m.content }] });
            } else if (m.role === 'assistant') {
                contents.push({ role: "model", parts: [{ text: m.content }] });
            }
        });

        // 2. Attach System Instruction
        if (systemInstruction) {
            if (contents.length > 0 && contents[0].role === 'user') {
                contents[0].parts[0].text = `System: ${systemInstruction}\nUser: ${contents[0].parts[0].text}`;
            } else { // Prompt start
                contents.unshift({ role: "user", parts: [{ text: `System Instruction: ${systemInstruction}` }] });
            }
        }

        try {
            const response = await axios.post(url, {
                contents: contents
            });
            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Gemini Chat API Error:", error.response ? error.response.data : error.message);
            // Fallback to simulation instead of throwing, to let the user test the UI
            return "Minimulated AI: I heard you, but my cognitive circuits (API) are unreachable. Please check your API Key.";
        }
    }
}

module.exports = GeminiProvider;
