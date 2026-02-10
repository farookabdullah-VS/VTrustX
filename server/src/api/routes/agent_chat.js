const express = require('express');
const router = express.Router();


const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const providerRepo = new PostgresRepository('ai_providers');
const formRepo = new PostgresRepository('forms'); // Direct DB access
const submissionRepo = new PostgresRepository('submissions');

// Simple In-Memory Session Store (For Demo)
const sessions = {};

// Helper to get active key
async function getActiveKey() {
    const providers = await providerRepo.findAll();
    const active = providers.find(p => p.is_active && p.provider === 'gemini');
    if (active) return active.api_key;
    const anyGemini = providers.find(p => p.provider === 'gemini' && p.api_key);
    return anyGemini ? anyGemini.api_key : null;
}

// 1. List Available Surveys (For Dropdown)
router.get('/forms', async (req, res) => {
    try {
        const forms = await formRepo.findAll();
        // Return simple list
        res.json(forms.map(f => ({ id: f.id, title: f.title })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Start a Call Session
router.post('/start', async (req, res) => {
    try {
        const { surveyId } = req.body;
        if (!surveyId) return res.status(400).json({ error: "Survey ID required" });

        const form = await formRepo.findById(surveyId);
        if (!form) return res.status(404).json({ error: "Survey not found" });

        // Extract Questions
        let questions = [];
        if (form.definition && form.definition.pages) {
            form.definition.pages.forEach(p => {
                if (p.elements) questions.push(...p.elements);
            });
        } else if (form.definition && form.definition.elements) {
            questions = form.definition.elements;
        }

        if (questions.length === 0) return res.status(400).json({ error: "Survey has no questions" });

        const sessionId = Date.now().toString();
        sessions[sessionId] = {
            id: sessionId,
            surveyId: form.id,
            surveyTitle: form.title,
            questions: questions,
            currentStep: 0,
            answers: {},
            stage: 'GREETING' // New State: GREETING, CONSENT, SURVEY
        };

        const introText = `Hello, I'm Layla from VTrustX. How are you doing today?`;

        res.json({ sessionId, text: introText, stage: 'GREETING' }); // Send stage

    } catch (err) {
        console.error("Start Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Chat / Process Answer
router.post('/chat', async (req, res) => {
    try {
        const { sessionId, message } = req.body;
        if (!sessionId || !sessions[sessionId]) {
            return res.status(404).json({ error: "Session not found or expired" });
        }

        const session = sessions[sessionId];

        const apiKey = await getActiveKey();
        if (!apiKey) return res.status(500).json({ error: "AI Config Missing" });
        const cleanKey = apiKey.trim();
        const modelId = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${cleanKey}`;

        let fetchFunc = global.fetch;
        if (!fetchFunc) fetchFunc = (await import('node-fetch')).default;

        // --- STAGE 1: GREETING ---
        if (session.stage === 'GREETING') {
            // Task: Acknowledge user feeling, then ask for consent
            const greetingPrompt = `
                You are Layla, a polite survey agent.
                User just replied to "How are you?": "${message}"
                
                Task:
                1. Briefly acknowledge their response (e.g., "Glad to hear that" or "I see").
                2. Explain you are conducting a survey: "${session.surveyTitle}".
                3. Ask for permission: "May I take a moment to ask you ${session.questions.length} questions?"
                
                Output just the spoken text.
            `;

            const resp = await fetchFunc(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: greetingPrompt }] }] })
            });
            const data = await resp.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I see. May we proceed with the survey?";

            session.stage = 'CONSENT';
            return res.json({ text });
        }

        // --- STAGE 2: CONSENT ---
        if (session.stage === 'CONSENT') {
            // Task: Check if Yes or No
            const consentPrompt = `
                User replied to permission request with: "${message}"
                Output JSON: { "authorized": boolean, "response": "polite closing if no, or brief 'Great, let's start' if yes" }
            `;

            const resp = await fetchFunc(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: consentPrompt }] }] })
            });
            const data = await resp.json();
            const txt = data.candidates?.[0]?.content?.parts?.[0]?.text;
            let result = { authorized: false, response: "Okay, thank you." };
            try {
                result = JSON.parse(txt.match(/\{[\s\S]*\}/)[0]);
            } catch (e) { }

            if (!result.authorized) {
                // End Call
                delete sessions[sessionId];
                return res.json({ text: result.response || "Okay, have a great day.", isComplete: true });
            }

            // Start Survey
            session.stage = 'SURVEY';
            const firstQ = session.questions[0];
            const nextText = `${result.response || "Great."} First question: ${firstQ.title || firstQ.name}`;
            return res.json({ text: nextText });
        }

        // --- STAGE 3: SURVEY ---
        if (session.stage === 'SURVEY') {
            const currentQ = session.questions[session.currentStep];

            // AI Validation Prompt
            const validationPrompt = `
                Current Question: "${currentQ.title || currentQ.name}"
                Type: "${currentQ.type}" Options: ${JSON.stringify(currentQ.choices || [])}
                User Input: "${message}"
                
                Task: Is valid answer? Extract value.
                Output JSON: { "isValid": boolean, "value": any, "reprompt": string }
            `;

            const valResp = await fetchFunc(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: validationPrompt }] }] })
            });
            const valData = await valResp.json();
            const valText = valData.candidates?.[0]?.content?.parts?.[0]?.text;

            let aiResult = { isValid: false, reprompt: "I didn't quite catch that." };
            try {
                const json = valText.match(/\{[\s\S]*\}/)[0];
                aiResult = JSON.parse(json);
            } catch (e) { }

            if (!aiResult.isValid) {
                return res.json({ text: aiResult.reprompt || `Could you please repeat that?` });
            }

            // Save Answer
            session.answers[currentQ.name] = aiResult.value;
            session.currentStep++;

            // Check if Done
            if (session.currentStep >= session.questions.length) {
                // Link Video Sessions to this Submission
                // Fetch associated videos for this sessionId
                const { query } = require('../../infrastructure/database/db');
                const videos = await query("SELECT id, file_path FROM video_sessions WHERE session_id = $1", [sessionId]);

                // Save Submission
                await submissionRepo.create({
                    form_id: session.surveyId,
                    data: {
                        answers: session.answers,
                        video_files: videos.rows, // Attach videos metadata
                        source: 'video_agent',
                        analysis: {
                            summary: "Survey completed via AI Video Agent.",
                            sentiment: "Pending Analysis", // Could be enhanced with real AI sentiment later
                            topics: Object.keys(session.answers)
                        }
                    },
                    form_version: 1,
                    created_at: new Date()
                });
                delete sessions[sessionId];
                return res.json({
                    text: "Thank you for your time. Your responses have been recorded. Have a wonderful day!",
                    isComplete: true
                });
            }

            // Next Question
            const nextQ = session.questions[session.currentStep];
            return res.json({ text: `Thank you. Next: ${nextQ.title || nextQ.name}?` });
        }

    } catch (error) {
        console.error("Agent Chat Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 4. Data Analyst Chat (New)
router.post('/analyze', async (req, res) => {
    try {
        const { surveyId, message, language } = req.body;
        if (!surveyId) return res.status(400).json({ error: "Survey ID required" });

        const apiKey = await getActiveKey();
        if (!apiKey) return res.status(500).json({ error: "AI Config Missing" });

        // 1. Fetch Survey Context
        const { query } = require('../../infrastructure/database/db');
        const form = await formRepo.findById(surveyId);
        if (!form) return res.status(404).json({ error: "Survey not found" });

        // 2. Pre-calculate Stats for better AI Context
        const totalSubsRes = await query(`SELECT COUNT(*) as total FROM submissions WHERE form_id = $1 AND (metadata->>'status' IS NULL OR metadata->>'status' = 'completed')`, [surveyId]);
        const totalResponses = totalSubsRes.rows[0].total;

        // Fetch questions: We aggregate stats for specific types and fetch text samples for text/comment types
        let questions = [];
        if (form.definition?.pages) {
            form.definition.pages.forEach(p => questions.push(...(p.elements || [])));
        }

        const aggregations = {};
        const textSamples = {};

        for (const q of questions) {
            if (['radiogroup', 'dropdown', 'rating', 'boolean'].includes(q.type)) {
                const distRes = await query(`
                    SELECT data->>$2 as val, COUNT(*) as count 
                    FROM submissions 
                    WHERE form_id = $1 AND data->>$2 IS NOT NULL
                    GROUP BY 1
                `, [surveyId, q.name]);
                aggregations[q.name] = distRes.rows;
            } else if (q.type === 'text' && q.inputType === 'number') {
                const statRes = await query(`
                    SELECT 
                        AVG(CAST(data->>$2 AS NUMERIC)) as avg,
                        MIN(CAST(data->>$2 AS NUMERIC)) as min,
                        MAX(CAST(data->>$2 AS NUMERIC)) as max
                    FROM submissions 
                    WHERE form_id = $1 AND data->>$2 IS NOT NULL
                `, [surveyId, q.name]);
                aggregations[q.name] = statRes.rows[0];
            } else if ((q.type === 'text' && q.inputType !== 'number') || q.type === 'comment') {
                // Fetch latest text samples for qualitative analysis (Deep Search)
                const textRes = await query(`
                    SELECT data->>$2 as val 
                    FROM submissions 
                    WHERE form_id = $1 AND data->>$2 IS NOT NULL AND length(data->>$2) > 0
                    ORDER BY created_at DESC 
                    LIMIT 50
                `, [surveyId, q.name]);
                textSamples[q.name] = textRes.rows.map(r => r.val);
            }
        }

        // 3. Construct Enhanced Prompt
        const isArabic = language && language.startsWith('ar');
        const langInstruction = isArabic ? "Answer in Arabic." : "Answer in the user's language (default to English).";

        const analystPrompt = `
            You are the "VTrustX Survey Analyst". 
            You are assisting a user who is looking at the survey: "${form.title}".
            
            AGGREGATED SURVEY STATS:
            
            RECENT TEXT RESPONSES (Latest 50 samples per question):
            ${JSON.stringify(textSamples)}
            
            GENERAL STATS:
            Total Responses: ${totalResponses}
            Question Statistics/Distributions: ${JSON.stringify(aggregations)}
            
            SURVEY DEFINITION (QUESTIONS):
            ${JSON.stringify(form.definition)}
            
            USER QUESTION: "${message}"
            
            LANGUAGE INSTRUCTION: ${langInstruction}

            STRICT SAFETY & SCOPE GUIDELINES:
            1. **NO EXPLICIT CONTENT**: Strictly prohibited. If the user question contains sexual, pornographic, or explicitly offensive content, YOU MUST REFUSE to answer. State clearly that such content is not allowed.
            2. **SYSTEM SCOPE ONLY**: You are an expert on this specific survey and the VTrustX system. Do NOT answer general knowledge questions (e.g., about history, celebrities, weather, coding) unless they are directly analogy-related to the data.
            3. **DATA FOCUS**: Your job is to analyze the survey results provided above. If the question is "What is in the database?", refer to these statistics.
            
            TASK:
            Answer the user's question based strictly on the provided aggregate data. 
            Format your response as a professional executive report.
            Include:
            - **Executive Summary**: A high-level overview of the answer.
            - **Detailed Findings**: Use bullet points or numbered lists. Refer to percentages or counts where possible (e.g., "65% of respondents chose X").
            - **Trend Analysis**: Even with static data, mention which options dominate or where the outliers are.
            - **Recommendations**: Based on the data, what should be the next step?
            
            STYLE GUIDE:
            - Use Bold for numbers and key terms.
            - Do NOT use Markdown tables. Use bulleted lists for comparisons.
            - Maintain a premium, analytical, and objective tone.
            - If data is insufficient for a specific part of the question, state it clearly.
        `;

        const cleanKey = apiKey.trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;

        let fetchFunc = global.fetch;
        if (!fetchFunc) fetchFunc = (await import('node-fetch')).default;

        const resp = await fetchFunc(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: analystPrompt }] }] })
        });

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't analyze that data right now.";

        res.json({ text });

    } catch (err) {
        console.error("Analysis Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
