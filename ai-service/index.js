require('dotenv').config();
const express = require('express');
const cors = require('cors');
const processSubmission = require('./src/handlers/submissionHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const generateSurvey = require('./src/handlers/generationHandler');
const completeText = require('./src/handlers/completionHandler');
const callHandler = require('./src/handlers/callHandler');

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'ai-analytics', timestamp: new Date() });
});

// Twilio webhook support
app.use(express.urlencoded({ extended: true }));

// Voice Routes
// Voice Routes (Phone)
app.post('/voice/call', callHandler.initiateCall);
app.post('/voice/webhook', callHandler.handleVoiceHook);
app.post('/voice/status', callHandler.handleStatusUpdate);

// Web Voice Routes
app.post('/web/initiate', callHandler.initiateWebSession);
app.post('/web/chat', callHandler.handleWebChat);

app.post('/generate', async (req, res) => {
    try {
        const { prompt, aiConfig } = req.body;
        console.log("Received generation request for:", prompt);

        const result = await generateSurvey(prompt, aiConfig);
        res.json({ definition: result });
    } catch (error) {
        console.error("Generation failed:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/completion', async (req, res) => {
    try {
        const { prompt, aiConfig } = req.body;
        console.log("Received completion request");

        const text = await completeText(prompt, aiConfig);
        res.json({ text });
    } catch (error) {
        console.error("Completion failed:", error);
        res.status(500).json({ error: error.message });
    }
});

const { handleBatchAnalysis } = require('./src/handlers/batchHandler');
const { handleAgentInteract } = require('./src/handlers/agentHandler');
const { analyzeSentiment } = require('./src/handlers/sentimentHandler');

app.post('/analyze-batch', handleBatchAnalysis);
app.post('/agent-interact', handleAgentInteract);

const { analyzeSocialMention } = require('./src/handlers/socialListeningHandler');

app.post('/analyze-social', async (req, res) => {
    try {
        const { text, platform, author, aiConfig } = req.body;
        console.log(`[SocialListeningEndpoint] Analyzing mention from ${platform}`);

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const result = await analyzeSocialMention(text, platform, author, aiConfig);
        res.json(result);

    } catch (error) {
        console.error('[SocialListeningEndpoint] Analysis failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/analyze-sentiment', async (req, res) => {
    try {
        const { prompt, aiConfig } = req.body;
        console.log('[SentimentEndpoint] Received sentiment analysis request');

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const sentiment = await analyzeSentiment(prompt, aiConfig);
        res.json({ sentiment });

    } catch (error) {
        console.error('[SentimentEndpoint] Analysis failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/analyze', async (req, res) => {
    try {
        const { submission, formDefinition, aiConfig } = req.body;
        console.log(`Received analysis request for submission ${submission.id}`);

        // Immediate response to acknowledge receipt
        // In a real message queue system, we'd enqueue here.
        // For this simple http flow, we can respond "Processing" and do the work async.
        res.json({ status: 'processing', message: 'Analysis started' });

        // Fire and forget (Async processing)
        (async () => {
            try {
                const result = await processSubmission(submission, formDefinition, aiConfig);

                // Callback to Main Server
                // Assuming Main Server is at localhost:3000 (configurable via input or env?)
                // Ideally passing the callback URL in the payload is safer.
                const coreUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3000';
                const callbackUrl = `${coreUrl}/api/submissions/${submission.id}/analysis`;

                // Need axios or fetch. AI service has axios installed? (See Geminiprovider, yes)
                const axios = require('axios');
                await axios.put(callbackUrl, { analysis: result });
                console.log(`Callback sent to ${callbackUrl}`);

            } catch (innerErr) {
                console.error("Async Analysis Failed:", innerErr.message);
            }
        })();

    } catch (error) {
        console.error("Analysis request failed:", error);
        res.status(500).json({ error: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`AI Service running on port ${PORT}`);
});
