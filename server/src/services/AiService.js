const { VertexAI } = require('@google-cloud/vertexai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service to handle AI generation requests using either Gemini API or Vertex AI.
 */
class AiService {
    constructor() {
        // We initialize lazily or per-request based on dynamic settings, 
        // but for now we can read from env or passed config.
    }

    /**
     * Generate content based on provider settings.
     * @param {string} prompt 
     * @param {object} settings - { provider: 'vertex'|'gemini', apiKey, vertexProject, vertexLocation }
     */
    async generateContent(prompt, settings) {
        const provider = settings?.provider || 'gemini';

        try {
            const modelName = settings.modelName || 'gemini-pro';

            if (provider === 'vertex') {
                if (!settings.vertexProject || !settings.vertexLocation) {
                    throw new Error("Vertex AI requires Project ID and Location.");
                }
                const vertex_ai = new VertexAI({ project: settings.vertexProject, location: settings.vertexLocation });
                const model = vertex_ai.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.candidates[0].content.parts[0].text;
            } else {
                // Gemini API (Default)
                const apiKey = settings.apiKey || process.env.GEMINI_API_KEY;
                if (!apiKey) {
                    throw new Error("Gemini API Key is missing.");
                }
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const response = await result.response;
                return response.text();
            }
        } catch (error) {
            console.error("AI Generation Error:", error);
            throw error;
        }
    }
}

module.exports = new AiService();
