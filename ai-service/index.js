require('dotenv').config();
const express = require('express');
const cors = require('cors');
const processSubmission = require('./src/handlers/submissionHandler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const generateSurvey = require('./src/handlers/generationHandler');
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
                const callbackUrl = `http://localhost:3000/api/submissions/${submission.id}/analysis`;

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
