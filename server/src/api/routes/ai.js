const express = require('express');
const router = express.Router();
const AiService = require('../../services/AiService');
const { query } = require('../../infrastructure/database/db');
const { decrypt } = require('../../infrastructure/security/encryption');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateSchema, agentInteractSchema, analyzeSurveySchema } = require('../schemas/ai.schemas');
const logger = require('../../infrastructure/logger');

// Helper to get settings from DB
// Helper to get settings from DB
async function getAiSettings() {
    try {
        // Fetch Voice/AI Provider preferences from settings
        const settingsRes = await query("SELECT key, value FROM settings WHERE key IN ('voice_agent_provider', 'ai_llm_provider')");
        const settingsMap = {};
        settingsRes.rows.forEach(r => settingsMap[r.key] = r.value);

        // Fetch API Keys from ai_providers
        const providersRes = await query("SELECT * FROM ai_providers");
        const providers = providersRes.rows;

        const config = {
            stt_provider: settingsMap.voice_agent_provider || 'google', // Default to google or browser?
            provider: settingsMap.ai_llm_provider || 'gemini',
            vertexProject: 'rayix',
            vertexLocation: 'us-central1',
            modelName: 'gemini-pro',
            apiKey: null,
            groqApiKey: null
        };

        // Find keys from ai_providers based on provider name
        const geminiProvider = providers.find(p => p.provider === 'google' || p.provider === 'gemini');
        if (geminiProvider) config.apiKey = decrypt(geminiProvider.api_key);
        if (!config.apiKey) config.apiKey = process.env.GEMINI_API_KEY; // Fallback

        const groqProvider = providers.find(p => p.provider === 'groq');
        if (groqProvider) config.groqApiKey = decrypt(groqProvider.api_key);
        if (!config.groqApiKey) config.groqApiKey = process.env.GROQ_API_KEY; // Fallback

        // If specific provider is active/selected, ensure it has a key
        // Logic handled in service, but good to check here or pass all available keys

        return config;

    } catch (e) {
        logger.error("Error fetching AI settings", { error: e.message });
        // Fallback to Env
        return {
            provider: 'gemini',
            stt_provider: 'google',
            vertexProject: 'rayix',
            variant: 'fallback',
            vertexLocation: 'us-central1',
            modelName: 'gemini-pro',
            apiKey: process.env.GEMINI_API_KEY,
            groqApiKey: process.env.GROQ_API_KEY
        };
    }
}

const multer = require('multer');

const AUDIO_MIMES = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/flac'];
const VIDEO_MIMES = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_MEDIA_MIMES = [...AUDIO_MIMES, ...VIDEO_MIMES];

const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB for audio
    fileFilter: (req, file, cb) => {
        if (AUDIO_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Audio file type not allowed. Accepted: webm, wav, mp3, mp4, ogg, flac'), false);
        }
    }
});

const uploadVideo = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for video
    fileFilter: (req, file, cb) => {
        if (VIDEO_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Video file type not allowed. Accepted: webm, mp4, mov, avi'), false);
        }
    }
});

router.post('/generate', authenticate, validate(generateSchema), async (req, res) => {
    try {
        const { prompt } = req.body;
        const axios = require('axios');
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';

        const config = await getAiSettings();
        const provider = config.provider || 'gemini';

        // Detect if it's a survey generation request or a general completion
        const isSurveyRequest = prompt.toLowerCase().includes('survey') || prompt.toLowerCase().includes('form') || prompt.toLowerCase().includes('question');
        const endpoint = isSurveyRequest ? '/generate' : '/completion';

        logger.info(`[Main Server] Forwarding to AI Service ${endpoint} (Provider: ${provider}): ${prompt.substring(0, 50)}...`);

        const response = await axios.post(`${aiServiceUrl}${endpoint}`, {
            prompt: prompt,
            aiConfig: { provider: provider }
        });

        if (endpoint === '/generate') {
            res.json({ definition: response.data.definition });
        } else {
            res.json({ text: response.data.text, definition: response.data.text });
        }
    } catch (err) {
        logger.error("AI Forwarding Error", { error: err.message });
        res.status(500).json({ error: "AI Service Error: " + (err.response?.data?.error || err.message) });
    }

});

router.post('/agent-interact', authenticate, validate(agentInteractSchema), async (req, res) => {
    try {
        const { prompt, systemContext } = req.body;
        const axios = require('axios');
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';

        logger.info("[Main Server] Forwarding to AI Service /agent-interact");
        const response = await axios.post(`${aiServiceUrl}/agent-interact`, {
            prompt, systemContext
        });

        res.json(response.data);
    } catch (err) {
        logger.error("Agent Interact Proxy Error", { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

router.post('/transcribe', authenticate, uploadAudio.single('audio'), async (req, res) => {
    try {
        const fileData = req.file;
        if (!fileData) return res.status(400).json({ error: 'No audio file provided' });

        const axios = require('axios');
        const FormData = require('form-data');
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';

        const form = new FormData();
        form.append('audio', fileData.buffer, { filename: fileData.originalname, contentType: fileData.mimetype });

        logger.info("[Main Server] Forwarding transcription to AI Service");

        const response = await axios.post(`${aiServiceUrl}/transcribe`, form, {
            headers: form.getHeaders()
        });

        res.json({ text: response.data.text });
    } catch (err) {
        logger.error("Transcription Forwarding Error", { error: err.message });
        res.status(500).json({ error: "Transcription Error: " + (err.response?.data?.error || err.message) });
    }
});

router.post('/upload-video', authenticate, uploadVideo.single('video'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No video file provided' });

        // Generate transcript
        // Re-use transcribe but for video file (audio track handled by Gemini/Whisper usually)
        let transcript = "";
        try {
            const settings = { ...(await getAiSettings()) };
            transcript = await AiService.transcribe(file.buffer, file.mimetype, settings);
        } catch (e) {
            logger.error("Video Transcript Error", { error: e.message });
            transcript = "[Transcription Failed]";
        }

        const fs = require('fs');
        const path = require('path');
        // Use /tmp for Cloud Run or a local uploads folder for dev
        const uploadDir = process.env.K_SERVICE ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        const fileName = `session_${Date.now()}.webm`;
        const uploadPath = path.join(uploadDir, fileName);

        fs.writeFileSync(uploadPath, file.buffer);

        // Save record in DB
        await query(`
            CREATE TABLE IF NOT EXISTS video_sessions (
                id SERIAL PRIMARY KEY,
                survey_id VARCHAR(50),
                session_id VARCHAR(50),
                file_path TEXT,
                transcript TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        let saved;
        if (req.body.surveyId) {
            saved = await query(
                "INSERT INTO video_sessions (survey_id, session_id, file_path, transcript) VALUES ($1, $2, $3, $4) RETURNING *",
                [req.body.surveyId, req.body.sessionId, `/uploads/${fileName}`, transcript]
            );
        } else {
            saved = await query(
                "INSERT INTO video_sessions (file_path, transcript) VALUES ($1, $2) RETURNING *",
                [`/uploads/${fileName}`, transcript]
            );
        }

        res.json({
            success: true,
            data: saved.rows[0]
        });
    } catch (err) {
        logger.error("Upload video error", { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

router.post('/analyze-survey', authenticate, validate(analyzeSurveySchema), async (req, res) => {
    try {
        const { formId, surveyTitle, questions, submissions } = req.body;

        // Construct Prompt
        const prompt = `
        Analyze the following survey results for: "${surveyTitle}".
        
        Questions:
        ${JSON.stringify(questions.map(q => ({ name: q.name, title: q.title, type: q.type })))}

        Submissions (Sample of up to 50):
        ${JSON.stringify(submissions.slice(0, 50).map(s => s.data))}

        Provide a "Management Executive Report" in strict JSON format (no markdown code blocks) with the following key fields:
        1. sentiment: "Positive", "Neutral", "Negative"
        2. sentiment_confidence: number (0-100)
        3. summary: A professional executive summary paragraph (max 100 words).
        4. strengths: Array of strings (key positive findings).
        5. weaknesses: Array of strings (areas for improvement).
        6. recommendations: Array of strings (actionable steps).

        Ensure the tone is professional and suitable for C-level executives.
        `;

        const config = await getAiSettings();
        const settings = {
            provider: config.provider,
            apiKey: config.apiKey,
            vertexProject: config.vertexProject,
            vertexLocation: config.vertexLocation,
            modelName: 'gemini-1.5-flash' // Fast and capable
        };

        const resultText = await AiService.generateContent(prompt, settings);

        // Parse JSON safely
        let analysisData;
        try {
            // Remove markdown format if present
            const cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
            analysisData = JSON.parse(cleanText);
        } catch (e) {
            logger.error("AI JSON Parse Error", { error: e.message, resultText });
            // Fallback
            analysisData = {
                sentiment: "Neutral",
                sentiment_confidence: 0,
                summary: resultText,
                strengths: [],
                weaknesses: [],
                recommendations: []
            };
        }

        // Save to Database if formId provided
        if (formId) {
            await query('UPDATE forms SET ai = $1 WHERE id = $2', [analysisData, formId]);
        }

        res.json(analysisData);

    } catch (err) {
        logger.error("Analyze Survey Error", { error: err.message });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
