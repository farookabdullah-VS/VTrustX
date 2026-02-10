const axios = require('axios');

class GeminiProvider {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    async retryWithBackoff(fn, retries = 3, delay = 2000) {
        try {
            return await fn();
        } catch (error) {
            // Retry on 429 (Too Many Requests) or 5xx (Server Errors)
            const status = error.response?.status;
            if (retries > 0 && (status === 429 || (status >= 500 && status < 600))) {
                console.warn(`[Gemini] Request failed with status ${status}. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryWithBackoff(fn, retries - 1, delay * 2);
            }
            throw error;
        }
    }

    async analyze(submission, formDefinition) {
        if (!this.apiKey) {
            return { provider: 'Gemini (Mock)', summary: "API Key missing." };
        }

        // Use standard flash model for consistency and speed
        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;
        const prompt = `Analyze: ${JSON.stringify(submission.data)}`;

        return this.retryWithBackoff(async () => {
            const response = await axios.post(url, {
                contents: [{ parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            });

            return {
                submissionId: submission.id,
                timestamp: new Date(),
                provider: 'Gemini',
                insights: response.data.candidates[0].content.parts[0].text
            };
        });
    }

    async chat(messages) {
        if (!this.apiKey) {
            console.warn("Gemini API Key missing. Returning mock response.");
            return "I am a simulated AI agent (No Key). How can I help?";
        }

        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        let contents = [];
        const guardrails = "You are VTrustX AI. You help with surveys, forms, and data analysis. REFUSE questions about unrelated topics (e.g. general knowledge, politics). DO NOT generate sexual, hateful, or misleading content. Be professional.";
        let systemInstruction = guardrails;

        // 1. Extract System Instruction and Map Messages
        messages.forEach((m) => {
            if (m.role === 'system') {
                systemInstruction += "\n" + m.content;
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
            const response = await this.retryWithBackoff(async () => axios.post(url, {
                contents: contents,
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            }));
            return response.data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Gemini Chat API Error:", error.response ? error.response.data : error.message);
            return "Minimulated AI: I heard you, but my cognitive circuits (API) are unreachable. Please check your API Key.";
        }
    }

    async generate(prompt) {
        if (!this.apiKey) {
            return {
                title: "Mock Survey",
                pages: [{
                    name: "page1",
                    elements: [{ type: "text", name: "q1", title: "How are you? (Mock)" }]
                }]
            };
        }

        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        const enhancedPrompt = `
            You are a strict and professional SurveyJS expert for VTrustX.
            User Request: "${prompt}"

            STRICT GUARDRAILS:
            1. If the request implies sexual, violent, hateful, or illegal content -> REFUSE.
            2. If the request is NOT about a survey/form -> REFUSE with error.
            3. Do NOT generate misleading or fake information.
            
            If refused, return strictly: {"error": "Request refused: Content policy violation or irrelevant topic."}

            Otherwise, create a professional survey following these rules:
            1. Return ONLY a valid JSON object.
            2. Follow the SurveyJS schema.
            3. Include at least 5 relevant questions.
            4. Use varied question types.
            5. Ensure the title is descriptive.
            
            JSON Output:
        `;

        try {
            const response = await this.retryWithBackoff(async () => axios.post(url, {
                contents: [{ role: 'user', parts: [{ text: enhancedPrompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            }));

            const candidate = response.data.candidates?.[0];
            if (!candidate) throw new Error("No candidates returned (Safety Block?).");
            if (candidate.finishReason === 'SAFETY') throw new Error("Generation blocked by safety filters.");

            const text = candidate.content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (result.error) throw new Error(result.error);
                return result;
            }
            throw new Error("No JSON found in AI response");
        } catch (error) {
            const fs = require('fs');
            const logMsg = `[${new Date().toISOString()}] Gemini Error: ${error.message}\n` +
                (error.response ? `Data: ${JSON.stringify(error.response.data, null, 2)}\n` : '');
            // Attempt to write to log, ignore if fails
            try { fs.appendFileSync('error.log', logMsg); } catch (e) { }

            console.error("Gemini Generation Error:", error.message);
            throw error;
        }
    }

    async complete(prompt) {
        if (!this.apiKey) return "API Key missing (Mock Response)";

        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        return this.retryWithBackoff(async () => {
            const response = await axios.post(url, {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            });
            return response.data.candidates[0].content.parts[0].text;
        });
    }

    async batchAnalyze(texts) {
        if (!this.apiKey) {
            // Mock Fallback if no key
            return {
                topics: [{ id: '1', topic: 'Mock Topic (No Key)', count: texts.length, sentiment: 0 }],
                verbatims: texts.map((t, i) => ({ id: i, text: t, sentiment: 0, topics: ['Mock Topic (No Key)'] }))
            };
        }

        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        const prompt = `
            Analyze the following list of customer verbatims.
            
            Input Data:
            ${JSON.stringify(texts)}

            Tasks:
            1. Identify the top 5-8 recurring topics/themes.
            2. For each topic, calculate the number of mentions and average sentiment (-1.0 to 1.0).
            3. For each verbatim, assign relevant topics and a sentiment score.

            Return ONLY a valid JSON object with this structure:
            {
                "topics": [
                    { "id": "1", "topic": "Brief Label", "count": 10, "sentiment": 0.5 }
                ],
                "verbatims": [
                    { "text": "Original Text", "sentiment": 0.8, "topics": ["Brief Label"] }
                ]
            }
        `;

        return this.retryWithBackoff(async () => {
            const response = await axios.post(url, {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            });

            const candidate = response.data.candidates?.[0];
            if (!candidate) throw new Error("No candidates returned.");

            const textResponse = candidate.content.parts[0].text;
            // Clean markdown code blocks if present
            const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                return JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse Gemini batch analysis JSON:", cleanText);
                throw new Error("Invalid JSON from AI model");
            }
        });
    }

    async generateJson(prompt, systemContext) {
        if (!this.apiKey) {
            return { error: "API Key missing (Mock Mode)" };
        }

        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${this.apiKey}`;

        // Construct a prompt that enforces JSON
        const finalPrompt = `
            ${systemContext || 'You are a helpful AI assistant.'}
            
            Instruction:
            ${prompt}

            IMPORTANT: Return ONLY valid JSON. No markdown formatting. No preamble.
        `;

        return this.retryWithBackoff(async () => {
            const response = await axios.post(url, {
                contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' }
                ]
            });

            const candidate = response.data.candidates?.[0];
            if (!candidate) throw new Error("No candidates returned.");

            const textResponse = candidate.content.parts[0].text;
            const cleanText = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                return JSON.parse(cleanText);
            } catch (e) {
                console.error("Gemini JSON Parse Error:", cleanText);
                throw new Error("AI returned invalid JSON: " + cleanText.substring(0, 50) + "...");
            }
        });
    }
}

module.exports = GeminiProvider;
