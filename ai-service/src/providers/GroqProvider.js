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
}

module.exports = GroqProvider;
