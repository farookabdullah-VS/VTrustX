class AIProviderConfig {
    constructor({ id, name, provider, apiKey, isActive = false, createdAt = new Date() }) {
        this.id = id;
        this.name = name; // e.g. "My OpenAI"
        this.provider = provider; // 'openai', 'gemini', 'azure'
        this.apiKey = apiKey;
        this.isActive = isActive;
        this.createdAt = createdAt;
    }
}

module.exports = AIProviderConfig;
