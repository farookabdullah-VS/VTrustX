const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');

// 1. Get Topic Bubbles (Aggregated)
const axios = require('axios');

// Helper to extract meaningful text from submission JSON
function extractTextFromSubmission(sub) {
    const texts = [];
    if (!sub.data) return texts;

    Object.values(sub.data).forEach(val => {
        if (typeof val === 'string' && val.length > 15 && val.includes(' ')) {
            texts.push(val);
        }
    });
    return texts;
}

// 1. Get Topic Bubbles (Real AI Analysis)
router.get('/topics', async (req, res) => {
    try {
        // Fetch latest 50 submissions to analyze
        const result = await query('SELECT data FROM submissions ORDER BY created_at DESC LIMIT 50');

        if (result.rows.length === 0) {
            return res.json([]);
        }

        const allTexts = result.rows.flatMap(extractTextFromSubmission);

        // Filter unique and non-empty
        const uniqueTexts = [...new Set(allTexts)].filter(t => t.trim().length > 0);

        if (uniqueTexts.length === 0) {
            return res.json([]);
        }

        // Call AI Service
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';
        const aiRes = await axios.post(`${aiServiceUrl}/analyze-batch`, {
            texts: uniqueTexts
        });

        // The AI Service returns { topics: [...], verbatims: [...] }
        // We store this result in a temporary in-memory cache or just return it?
        // The frontend calls /topics then /verbatims.
        // We need to coordinate these two calls or merge them?
        // The current frontend implementation (TextIQDashboard.jsx):
        // 1. loadTopics -> /api/textiq/topics
        // 2. onClick -> /api/textiq/verbatims?topic=...

        // Problem: If /topics calls AI, and /verbatims calls AI again, it's inefficient and might differ.
        // Solution: Return topics here. For verbatims, we might need to re-fetch or cache.
        // BETTER SOLUTION: 
        // 1. Store the AI result in a variable (simple cache) for this session?
        // 2. Or, since we don't have a robust cache, let's just re-analyze or return "all" in one go?
        // The frontend expects /topics to return [{ topic, count, sentiment }]

        // Let's use a simple in-memory cache for demo purposes, 
        // or just return the AI topics here, and implement /verbatims to filter from the same source?

        // For simplicity/robustness in this "demo" context:
        // We will cache the last result in a global variable in this module.
        // (Not production ready but fits the request constraint to "connect" without full architecture overhaul)

        global.lastParams = {
            topics: aiRes.data.topics,
            verbatims: aiRes.data.verbatims
        };

        res.json(aiRes.data.topics);

    } catch (err) {
        console.error("TextIQ Analysis Failed:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Verbatims (Drill-down from Cache)
router.get('/verbatims', async (req, res) => {
    try {
        const { topic } = req.query;

        // Use cached result if available
        const data = global.lastParams || { verbatims: [] };

        let filtered = data.verbatims;

        if (topic) {
            filtered = filtered.filter(v => v.topics && v.topics.includes(topic));
        }

        res.json(filtered);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
