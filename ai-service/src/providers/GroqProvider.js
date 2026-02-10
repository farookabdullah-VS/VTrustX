const axios = require('axios');
const FormData = require('form-data');

class GroqProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async transcribe(audioBuffer, filename = 'audio.webm') {
        if (!this.apiKey) {
            throw new Error("Groq API Key missing");
        }

        const url = 'https://api.groq.com/openai/v1/audio/transcriptions';

        const form = new FormData();
        form.append('file', audioBuffer, { filename });
        form.append('model', 'whisper-large-v3');
        form.append('response_format', 'json');

        try {
            const response = await axios.post(url, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data.text;
        } catch (error) {
            console.error("Groq Transcription Error:", error.response ? error.response.data : error.message);
            throw new Error("Groq STT Failed");
        }
    }

    async chat(messages) {
        if (!this.apiKey) throw new Error("Groq API Key missing");

        const url = 'https://api.groq.com/openai/v1/chat/completions';

        try {
            const response = await axios.post(url, {
                model: "llama3-70b-8192", // Extremely fast LLM
                messages: messages
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("Groq Chat Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async generate(prompt) {
        if (!this.apiKey) {
            return {
                title: "Mock Survey (Groq)",
                pages: [{
                    name: "page1",
                    elements: [{ type: "text", name: "q1", title: "How are you? (Mock)" }]
                }]
            };
        }

        const enhancedPrompt = `
            You are a SurveyJS expert. 
            Create a professional survey based on this request: "${prompt}".
            
            IMPORTANT: You must respond in JSON format.
            
            Requirements:
            1. Return ONLY a valid JSON object.
            2. Follow the SurveyJS schema.
            3. Include at least 5 relevant questions.
            4. Use varied question types (text, radiogroup, checkbox, rating).
            5. Ensure the title is descriptive.
            
            Desired Output JSON Structure:
        `;

        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama3-8b-8192", // Use a safer/smaller model for now to test
                messages: [{ role: 'user', content: enhancedPrompt }],
                response_format: { type: "json_object" }
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            const text = response.data.choices[0].message.content;
            return JSON.parse(text);
        } catch (error) {
            if (error.response) {
                console.error("Groq Generation Error Data:", JSON.stringify(error.response.data));
            }
            console.error("Groq Generation Error:", error.message);
            throw error;
        }
    }

    async complete(prompt) {
        if (!this.apiKey) return "Groq API Key missing (Mock Response)";
        try {
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama3-70b-8192",
                messages: [{ role: 'user', content: prompt }]
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });
            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("Groq Completion Error:", error.message);
            throw error;
        }
    }
}

module.exports = GroqProvider;
