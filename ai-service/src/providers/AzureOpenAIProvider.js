const axios = require('axios');

class AzureOpenAIProvider {
    constructor(endpoint, apiKey, deploymentId) {
        this.endpoint = endpoint; // https://YOUR_RESOURCE_NAME.openai.azure.com/
        this.apiKey = apiKey;
        this.deploymentId = deploymentId;
    }

    async analyze(submission, formDefinition) {
        if (!this.apiKey || !this.endpoint) {
            return { provider: 'Azure (Mock)', summary: "Configuration missing." };
        }

        const url = `${this.endpoint}/openai/deployments/${this.deploymentId}/chat/completions?api-version=2023-05-15`;
        const prompt = `Analyze: ${JSON.stringify(submission.data)}`;

        try {
            const response = await axios.post(url, {
                messages: [{ role: "user", content: prompt }]
            }, {
                headers: { 'api-key': this.apiKey }
            });

            return {
                submissionId: submission.id,
                timestamp: new Date(),
                provider: 'AzureOpenAI',
                insights: response.data.choices[0].message.content
            };
        } catch (error) {
            console.error("Azure Error:", error.message);
            throw error;
        }
    }
}

module.exports = AzureOpenAIProvider;
