const axios = require('axios');

class OpenAIProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = 'https://api.openai.com/v1/chat/completions';
    }

    async analyze(submission, formDefinition) {
        if (!this.apiKey) {
            console.warn("OpenAI API Key missing. Falling back to mock response.");
            return { provider: 'OpenAI (Mock)', summary: "API Key missing." };
        }

        const prompt = `Analyze this survey submission: ${JSON.stringify(submission.data)}`;

        try {
            const response = await axios.post(this.endpoint, {
                model: "gpt-4", // or gpt-3.5-turbo
                messages: [{ role: "user", content: prompt }]
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            return {
                submissionId: submission.id,
                timestamp: new Date(),
                provider: 'OpenAI',
                insights: response.data.choices[0].message.content
            };
        } catch (error) {
            console.error("OpenAI Error:", error.response ? error.response.data : error.message);
            throw new Error("OpenAI Analysis Failed");
        }
    }

    async generate(userPrompt) {
        if (!this.apiKey) {
            throw new Error("OpenAI API Key missing.");
        }

        const systemPrompt = `You are a SurveyJS expert. Generate a valid SurveyJS JSON definition based on the user's description. 
        Output ONLY valid JSON. The JSON should have a 'title' and a 'pages' array. 
        Do not include markdown formatting like \`\`\`json.`;

        try {
            const response = await axios.post(this.endpoint, {
                model: "gpt-4-1106-preview", // supports json_object
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ]
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            const content = response.data.choices[0].message.content;
            return JSON.parse(content);
        } catch (error) {
            console.error("OpenAI Generation Error:", error.response ? error.response.data : error.message);
            throw new Error("OpenAI Generation Failed: " + (error.response?.data?.error?.message || error.message));
        }
    }

    async chat(messages) {
        if (!this.apiKey) {
            throw new Error("OpenAI API Key missing.");
        }

        try {
            const response = await axios.post(this.endpoint, {
                model: "gpt-4",
                messages: messages
            }, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error("OpenAI Chat Error:", error.response ? error.response.data : error.message);
            throw new Error("OpenAI Chat Failed");
        }
    }
}

module.exports = OpenAIProvider;
