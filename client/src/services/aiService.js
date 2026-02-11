import { vertexAI } from '../firebase-config';
import { getGenerativeModel } from "firebase/ai";

// Define the schema for the persona output to ensure consistent JSON structure
const PERSONA_SCHEMA = {
    name: "Name of persona",
    description: "Short description",
    attributes: {
        risk_tolerance: "LOW/MEDIUM/HIGH",
        priorities: { speed: 0.5, price: 0.5, quality: 0.5, convenience: 0.5 },
        generated_profile: {
            title: "Creative Title",
            personality: "Personality Type + Emoji",
            goals: "Main goals paragraph",
            quote: "First person quote",
            background: "Back story paragraph",
            demographics: {
                age: 35,
                gender: "Male/Female/Non-binary",
                location: "City, Country",
                job: "Job Title",
                family: "Marital status/kids"
            },
            visual_description: "A detailed visual description for an image generator",
            frustrations: ["List items"],
            expectations: "Expectations paragraph",
            motivations: ["List items"],
            trusted_brands: ["List items"],
            scenarios: "Scenario paragraph"
        }
    }
};

/**
 * Generates a persona based on a text description using Client-side Firebase Vertex AI.
 * @param {string} text - The description of the persona to generate.
 * @returns {Promise<Object>} - The generated persona object.
 */
export async function generatePersonaClient(text) {
    try {
        const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

        const prompt = `
      You are a Customer Experience (CX) Persona Expert.
      Create a detailed user persona from this description:
      
      INPUT DATA:
      "${text.substring(0, 5000)}" 

      Return ONLY a valid JSON object with the following structure. 
      Do not include markdown formatting like \`\`\`json.
      
      Structure:
      ${JSON.stringify(PERSONA_SCHEMA, null, 2)}
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text();

        // Clean up potential markdown formatting if the model adds it
        const jsonStr = textResponse.replace(/^```json\n|\n```$/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        throw error;
    }
}

/**
 * Enhances an existing persona based on instructions.
 * @param {Object} currentPersona - The existing persona object.
 * @param {string} instruction - Specific enhancement instructions.
 * @returns {Promise<Object>} - The updated attributes/profile.
 */
export async function enhancePersonaClient(currentPersona, instruction) {
    try {
        const model = getGenerativeModel(vertexAI, { model: "gemini-2.0-flash" });

        let context = currentPersona.description || currentPersona.name;
        if (currentPersona.attributes?.generated_profile) {
            context += "\n\nExisting Profile Data: " + JSON.stringify(currentPersona.attributes.generated_profile);
        }

        const prompt = `
      You are a Customer Experience (CX) Persona Expert.
      Enhance and refine the existing persona based on the description and data provided.
      
      USER INSTRUCTION: ${instruction}
      (Please specifically address this instruction in your update).
      
      INPUT DATA:
      "${context.substring(0, 5000)}" 

      Return ONLY a valid JSON object with the updated attributes structure.
      Structure:
      ${JSON.stringify(PERSONA_SCHEMA, null, 2)}
    `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const textResponse = response.text();

        // Clean up potential markdown formatting
        const jsonStr = textResponse.replace(/^```json\n|\n```$/g, '').trim();

        return JSON.parse(jsonStr);
    } catch (error) {
        throw error;
    }
}
