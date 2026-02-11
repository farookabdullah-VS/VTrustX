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

// 5. Platform-Wide AI Agent (Cross-platform intelligence)
router.post('/platform-agent', async (req, res) => {
    try {
        const { message, context, language } = req.body;
        if (!message) return res.status(400).json({ error: "Message is required" });

        const apiKey = await getActiveKey();
        if (!apiKey) return res.status(500).json({ error: "AI Config Missing" });

        const { query } = require('../../infrastructure/database/db');

        // --- Aggregate Platform Data ---

        // 1. Survey/Forms stats
        let formsCount = 0, totalSubmissions = 0, recentSubmissions = 0;
        try {
            const formsRes = await query("SELECT COUNT(*) as count FROM forms");
            formsCount = parseInt(formsRes.rows[0].count);

            const subsRes = await query("SELECT COUNT(*) as count FROM submissions");
            totalSubmissions = parseInt(subsRes.rows[0].count);

            const recentSubsRes = await query("SELECT COUNT(*) as count FROM submissions WHERE created_at >= NOW() - INTERVAL '7 days'");
            recentSubmissions = parseInt(recentSubsRes.rows[0].count);
        } catch (e) { /* tables may not exist */ }

        // 2. CSAT/NPS metrics
        let csatData = null;
        try {
            const csatRes = await query(`
                SELECT
                    AVG(CAST(data->>'csat' AS NUMERIC)) as avg_csat,
                    AVG(CAST(data->>'nps' AS NUMERIC)) as avg_nps,
                    COUNT(CASE WHEN data->>'csat' IS NOT NULL THEN 1 END) as csat_count,
                    COUNT(CASE WHEN data->>'nps' IS NOT NULL THEN 1 END) as nps_count,
                    COUNT(CASE WHEN CAST(data->>'nps' AS NUMERIC) >= 9 THEN 1 END) as promoters,
                    COUNT(CASE WHEN CAST(data->>'nps' AS NUMERIC) <= 6 THEN 1 END) as detractors
                FROM submissions
                WHERE (data->>'csat' IS NOT NULL OR data->>'nps' IS NOT NULL)
                AND (metadata->>'status' IS NULL OR metadata->>'status' = 'completed')
            `);
            const row = csatRes.rows[0];
            const npsTotal = parseInt(row.nps_count) || 0;
            csatData = {
                avgCSAT: row.avg_csat ? parseFloat(row.avg_csat).toFixed(1) : 'N/A',
                avgNPS: row.avg_nps ? parseFloat(row.avg_nps).toFixed(1) : 'N/A',
                csatResponses: parseInt(row.csat_count) || 0,
                npsResponses: npsTotal,
                npsScore: npsTotal > 0
                    ? Math.round(((parseInt(row.promoters) - parseInt(row.detractors)) / npsTotal) * 100)
                    : 'N/A'
            };
        } catch (e) { /* no csat data */ }

        // 3. Submissions by form (top 5)
        let submissionsByForm = [];
        try {
            const byFormRes = await query(`
                SELECT f.title, COUNT(s.id) as count
                FROM submissions s
                JOIN forms f ON s.form_id = f.id
                GROUP BY f.title
                ORDER BY count DESC
                LIMIT 5
            `);
            submissionsByForm = byFormRes.rows.map(r => ({ form: r.title, responses: parseInt(r.count) }));
        } catch (e) { /* skip */ }

        // 4. CJM data
        let cjmCount = 0;
        try {
            const cjmRes = await query("SELECT COUNT(*) as count FROM cjm_maps");
            cjmCount = parseInt(cjmRes.rows[0].count);
        } catch (e) { /* table may not exist */ }

        // 5. Personas count
        let personasCount = 0;
        try {
            const personasRes = await query("SELECT COUNT(*) as count FROM cx_personas");
            personasCount = parseInt(personasRes.rows[0].count);
        } catch (e) { /* table may not exist */ }

        // 6. Recent text feedback samples (latest 20)
        let recentFeedback = [];
        try {
            const feedbackRes = await query(`
                SELECT f.title as form_title, s.data, s.created_at
                FROM submissions s
                JOIN forms f ON s.form_id = f.id
                WHERE s.created_at >= NOW() - INTERVAL '30 days'
                ORDER BY s.created_at DESC
                LIMIT 20
            `);
            recentFeedback = feedbackRes.rows.map(r => {
                const textFields = {};
                if (r.data) {
                    Object.entries(r.data).forEach(([k, v]) => {
                        if (typeof v === 'string' && v.length > 10 && !['ticket_code', 'formId'].includes(k)) {
                            textFields[k] = v.substring(0, 200);
                        }
                    });
                }
                return { form: r.form_title, date: r.created_at, feedback: textFields };
            }).filter(r => Object.keys(r.feedback).length > 0);
        } catch (e) { /* skip */ }

        // --- Construct System Prompt ---
        const isArabic = language && language.startsWith('ar');
        const langInstruction = isArabic ? "Answer in Arabic." : "Answer in the user's language (default to English).";

        const platformPrompt = `
            You are the **VTrustX AI Agent** - an intelligent assistant for the VTrustX Customer Experience Management Platform.

            PLATFORM CAPABILITIES:
            VTrustX is a comprehensive CX platform that includes:
            - **Survey Management**: Create, distribute, and analyze surveys (NPS, CSAT, CES, custom forms)
            - **Customer Journey Mapping (CJM)**: Visual journey maps with touchpoints, emotions, and pain points
            - **CX Personas**: Customer persona builder with demographics, behaviors, and goals
            - **Analytics Studio**: Advanced analytics with cross-tabulation, key drivers, anomaly detection
            - **Ticket/CRM System**: Customer support ticketing with SLA tracking
            - **AI Features**: AI survey generation, AI video agents, voice agents, text analytics
            - **Reports & Dashboards**: Dynamic dashboards, PDF exports, public report sharing
            - **Integrations**: Webhook, Slack, Email, WhatsApp distribution channels

            LIVE PLATFORM METRICS:
            - Total Surveys/Forms: ${formsCount}
            - Total Submissions: ${totalSubmissions}
            - Submissions This Week: ${recentSubmissions}
            - CSAT Average: ${csatData ? csatData.avgCSAT : 'No data'} (from ${csatData ? csatData.csatResponses : 0} responses)
            - NPS Average Score: ${csatData ? csatData.avgNPS : 'No data'} (from ${csatData ? csatData.npsResponses : 0} responses)
            - NPS Score (Calculated): ${csatData ? csatData.npsScore : 'No data'}
            - Customer Journey Maps: ${cjmCount}
            - CX Personas: ${personasCount}

            TOP SURVEYS BY RESPONSES:
            ${submissionsByForm.length > 0 ? submissionsByForm.map(s => `- "${s.form}": ${s.responses} responses`).join('\n') : 'No survey data available yet.'}

            RECENT CUSTOMER FEEDBACK (Last 30 days):
            ${recentFeedback.length > 0 ? JSON.stringify(recentFeedback.slice(0, 10)) : 'No recent feedback available.'}

            ${context ? `ADDITIONAL CONTEXT: ${context}` : ''}

            USER QUESTION: "${message}"

            LANGUAGE INSTRUCTION: ${langInstruction}

            STRICT SAFETY & SCOPE GUIDELINES:
            1. **NO EXPLICIT CONTENT**: If the user question contains sexual, pornographic, or offensive content, REFUSE to answer.
            2. **SYSTEM SCOPE ONLY**: You are an expert on the VTrustX platform and its data. Do NOT answer general knowledge questions unless directly related to CX analytics.
            3. **DATA FOCUS**: Base your answers on the real metrics provided above. If data is insufficient, say so clearly.
            4. **PROACTIVE INSIGHTS**: When appropriate, suggest actions the user can take within VTrustX.

            RESPONSE FORMAT:
            - Use **bold** for key numbers and terms
            - Use bullet points for lists
            - Include an Executive Summary when giving analysis
            - Include Recommendations when relevant
            - Maintain a professional, analytical tone
            - Keep responses concise but thorough
        `;

        const cleanKey = apiKey.trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${cleanKey}`;

        let fetchFunc = global.fetch;
        if (!fetchFunc) fetchFunc = (await import('node-fetch')).default;

        const resp = await fetchFunc(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: platformPrompt }] }] })
        });

        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that right now. Please try again.";

        res.json({
            text,
            data: {
                formsCount,
                totalSubmissions,
                recentSubmissions,
                csat: csatData,
                cjmCount,
                personasCount
            }
        });

    } catch (err) {
        console.error("Platform Agent Error:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
