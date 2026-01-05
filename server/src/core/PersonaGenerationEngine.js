
const providerRepo = new (require('../infrastructure/database/PostgresRepository'))('ai_providers');

class PersonaGenerationEngine {

    async _getActiveGeminiKey() {
        try {
            const providers = await providerRepo.findAll();
            // Look for Active Gemini first, then ANY valid Gemini key
            const active = providers.find(p => p.is_active && p.provider === 'gemini');
            if (active && active.api_key) return active.api_key;

            const anyGemini = providers.find(p => p.provider === 'gemini' && p.api_key);
            return anyGemini ? anyGemini.api_key : null;
        } catch (e) {
            console.error("Failed to load providers for Persona Engine", e);
            return null;
        }
    }

    async generateFromInput(text, apiKey = null) {
        // Priority: 1. Request Key (if sent), 2. System Configured Key
        let key = apiKey;
        if (!key) {
            key = await this._getActiveGeminiKey();
        }

        if (key) {
            return await this._generateWithGemini(text, key);
        }

        // Fallback to heuristic
        console.warn("[PersonaEngine] No Gemini API Key found in request or settings. Using Heuristic.");
        return this._generateHeuristic(text);
    }

    async enhanceProfile(currentPersona, apiKey = null, instruction = "") {
        let key = apiKey;
        if (!key) {
            key = await this._getActiveGeminiKey();
        }

        if (key) {
            let context = currentPersona.description || currentPersona.name;
            // Include existing profile data to help the AI understand what to enhance
            if (currentPersona.attributes?.generated_profile) {
                context += "\n\nExisting Profile Data: " + JSON.stringify(currentPersona.attributes.generated_profile);
            }

            const enhanced = await this._generateWithGemini(context, key, true, instruction);
            // Merge enhanced attributes
            return {
                ...currentPersona.attributes,
                ...enhanced.attributes,
                generated_profile: {
                    ...currentPersona.attributes?.generated_profile,
                    ...enhanced.attributes?.generated_profile
                }
            };
        }

        // Fallback to heuristic enhancement
        return this._enhanceHeuristic(currentPersona);
    }

    async _generateWithGemini(text, apiKey, isEnhance = false, instruction = "") {
        try {
            console.log(`[PersonaEngine] Calling Gemini (Enhance=${isEnhance})...`);

            let promptInstruction = isEnhance
                ? 'Enhance and refine the existing persona based on the description and data provided.'
                : 'Create a detailed user persona from this description:';

            if (instruction) {
                promptInstruction += `\n\nUSER INSTRUCTION: ${instruction}\n(Please specifically address this instruction in your update).`;
            }

            const prompt = `
                You are a Customer Experience (CX) Persona Expert.
                ${promptInstruction}
                
                INPUT DATA:
                "${text.substring(0, 5000)}" 

                Return ONLY a valid JSON object with this structure. Do not include markdown formatting like \`\`\`json.
                {
                    "name": "Name of persona",
                    "description": "Short description",
                    "attributes": {
                        "risk_tolerance": "LOW/MEDIUM/HIGH",
                        "priorities": { "speed": 0.5, "price": 0.5, "quality": 0.5, "convenience": 0.5 },
                        "generated_profile": {
                            "title": "Creative Title",
                            "personality": "Personality Type + Emoji",
                            "goals": "Main goals paragraph",
                            "quote": "First person quote",
                            "background": "Back story paragraph",
                            "demographics": {
                                "age": 35,
                                "gender": "Male/Female/Non-binary",
                                "location": "City, Country",
                                "job": "Job Title",
                                "family": "Marital status/kids"
                            },
                            "visual_description": "A detailed visual description for an image generator (e.g. 'A professional woman in her 40s wearing smart casual attire, sitting in a modern coffee shop with a laptop.')",
                            "frustrations": ["List items"],
                            "expectations": "Expectations paragraph",
                            "motivations": ["List items"],
                            "trusted_brands": ["List items"],
                            "scenarios": "Scenario paragraph"
                        }
                    }
                }
            `;

            // Trim key just in case
            const cleanKey = apiKey.trim();
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;

            // Dynamic import to avoid require issues if node-fetch not global, 
            // but in Node 18+ global fetch is available. We'll try global fetch first.
            let response;
            if (global.fetch) {
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
            } else {
                const fetch = (await import('node-fetch')).default;
                response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                console.error("Gemini API detailed error:", errText);
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errText}`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error("No candidates returned from Gemini");
            }

            const content = data.candidates[0].content.parts[0].text;

            // Extract JSON
            let jsonStr = content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            return JSON.parse(jsonStr);

        } catch (err) {
            console.error("AI Generation failed, falling back to heuristic:", err);
            return isEnhance ? this._enhanceHeuristic({ description: text, attributes: {} }) : this._generateHeuristic(text);
        }
    }

    _generateHeuristic(text) {
        // Simple heuristic parser
        const profile = {
            name: "Generated Persona",
            description: text,
            attributes: {
                risk_tolerance: "MEDIUM",
                priorities: { speed: 0.5, price: 0.5, quality: 0.5, convenience: 0.5 },
                generated_profile: {}
            }
        };

        // Extract Name (First 2-3 words if capitalized?)
        // Or if starts with "Name: "
        const nameMatch = text.match(/Name:\s*([^\n\.,]+)/i);
        if (nameMatch) {
            profile.name = nameMatch[1].trim();
        } else {
            // Take first few words if it looks like a name
            const words = text.split(' ');
            if (words.length > 0 && words.length < 4) {
                // Only if capitalized
                if (text[0] === text[0].toUpperCase()) {
                    profile.name = text;
                }
            }
        }

        // Risk Analysis
        const lower = text.toLowerCase();
        if (lower.includes('safe') || lower.includes('secure') || lower.includes('wary') || lower.includes('careful') || lower.includes('concern')) {
            profile.attributes.risk_tolerance = 'LOW';
        } else if (lower.includes('fast') || lower.includes('quick') || lower.includes('risk') || lower.includes('aggressive') || lower.includes('new')) {
            profile.attributes.risk_tolerance = 'HIGH';
        }

        // Priorities
        if (lower.includes('cheap') || lower.includes('budget') || lower.includes('cost') || lower.includes('expensive')) {
            profile.attributes.priorities.price = 0.9;
        }
        if (lower.includes('fast') || lower.includes('immediate') || lower.includes('wait') || lower.includes('time')) {
            profile.attributes.priorities.speed = 0.9;
        }
        if (lower.includes('quality') || lower.includes('best') || lower.includes('premium')) {
            profile.attributes.priorities.quality = 0.9;
        }

        // Generate detailed profile
        profile.attributes.generated_profile = this._synthesizeProfile(profile.name, text, profile.attributes.risk_tolerance);

        return profile;
    }

    _enhanceHeuristic(currentPersona) {
        const attributes = currentPersona.attributes || {};
        const profile = attributes.generated_profile || {};
        const risk = attributes.risk_tolerance || 'MEDIUM';

        // Add more detail if missing
        const newProfile = { ...profile };

        if (!newProfile.motivations || newProfile.motivations.length < 4) {
            const extra = [
                "To feel valued and respected as a customer",
                "To solve their problems quickly and efficiently",
                "To get the best value for their money",
                "To trust the brand's ethical standards"
            ];
            newProfile.motivations = [...(newProfile.motivations || []), ...extra].slice(0, 5);
        }

        if (!newProfile.frustrations || newProfile.frustrations.length < 4) {
            const extra = [
                "Long wait times on support calls",
                "Having to repeat information to multiple agents",
                "Unclear instructions on the website",
                "Hidden fees or unexpected charges"
            ];
            newProfile.frustrations = [...(newProfile.frustrations || []), ...extra].slice(0, 5);
        }

        if (!newProfile.quote) {
            newProfile.quote = risk === 'LOW'
                ? `"I just want to know that my money is safe and I can talk to a real person."`
                : `"I need a solution that moves as fast as I do."`;
        }

        if (!newProfile.topic_interest) {
            newProfile.topic_interest = "High";
        }

        // Update attributes
        return {
            ...attributes,
            generated_profile: newProfile
        };
    }

    _synthesizeProfile(name, input, risk) {
        return {
            title: "The " + (risk === 'LOW' ? "Cautious" : (risk === 'HIGH' ? "Dynamic" : "Balanced")) + " Customer",
            personality: risk === 'LOW' ? "Guardian 🛡️" : (risk === 'HIGH' ? "Explorer 🚀" : "Citizen 🤝"),
            goals: risk === 'LOW'
                ? "To maintain stability and avoid unnecessary risks in their daily transactions."
                : "To find the most efficient and innovative solutions available.",
            quote: risk === 'LOW' ? "\"Better safe than sorry.\"" : "\"Time is money.\"",
            background: `${name || 'The persona'} is characterized by the following description: "${input.substring(0, 100)}...". They tend to prioritize ${risk === 'LOW' ? 'security and proven reliability' : 'speed and performance'}.`,
            frustrations: ["Lack of transparency", "Inefficient processes"],
            expectations: `Expects ${risk === 'LOW' ? 'clear communication and reliability' : 'agility and modern features'}.`,
            motivations: ["Security", "Convenience"],
            trusted_brands: ["Established Industry Leaders", "Consumer Reports"],
            scenarios: "Engaging with a new product launch and evaluating its fit for their lifestyle."
        };
    }
}

module.exports = new PersonaGenerationEngine();
