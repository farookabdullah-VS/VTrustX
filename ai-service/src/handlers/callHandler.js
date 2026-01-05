const twilio = require('twilio');
const axios = require('axios');
const OpenAIProvider = require('../providers/OpenAIProvider');
const GeminiProvider = require('../providers/GeminiProvider');
const AndroidGateway = require('../gateways/AndroidGateway');

// In-memory store for active calls.
const activeCalls = new Map();

const getTwilioClient = () => {
    // If using Android Gateway, return null early
    if (process.env.USE_ANDROID_GATEWAY === 'true') return null;

    // If mocking, return null
    if (process.env.USE_MOCK_CALLS === 'true') return null;


    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
        throw new Error("Twilio credentials missing");
    }
    return twilio(accountSid, authToken);
};

const getAIProvider = () => {
    if (process.env.AI_PROVIDER === 'groq') {
        const GroqProvider = require('../providers/GroqProvider');
        return new GroqProvider(process.env.GROQ_API_KEY);
    }
    if (process.env.AI_PROVIDER === 'gemini') {
        return new GeminiProvider(process.env.GEMINI_API_KEY);
    }
    return new OpenAIProvider(process.env.OPENAI_API_KEY);
};

const saveSubmission = async (surveyId, answers) => {
    try {
        const coreUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3000';
        console.log(`Saving submission for survey ${surveyId}...`, answers);
        const savedSubmission = await axios.post(`${coreUrl}/api/submissions`, {
            formId: surveyId,
            formVersion: 1,
            data: answers,
            metadata: { source: 'voice_agent' }
        });
        console.log("Submission saved. Triggering analysis...");

        // Trigger Analysis explicitly if needed (though the server does it automatically on CREATE)
        // The server code at `src/api/routes/submissions.js` line 109 already triggers it.
        // So we don't need to do anything extra here, just logging.
    } catch (error) {
        console.error("Failed to save submission:", error.message);
    }
};

exports.initiateCall = async (req, res) => {
    try {
        const { contact, surveyId, surveyDefinition, systemContext } = req.body;

        if (!contact || !contact.phone) {
            return res.status(400).json({ error: "Contact phone number required" });
        }
        if (!surveyDefinition) {
            return res.status(400).json({ error: "Survey definition required" });
        }

        // --- ANDROID GATEWAY MODE ---
        if (process.env.USE_ANDROID_GATEWAY === 'true') {
            console.log(`[AndroidCall] Initiating hardware call to ${contact.name} (${contact.phone})`);

            const isConnected = await AndroidGateway.checkDevice();
            if (!isConnected) {
                return res.status(503).json({ error: "No Android Device Connected via ADB" });
            }

            // Dial via Hardware
            await AndroidGateway.dial(contact.phone);

            // Create a "Web Session" for the AI Brain to run the logic
            // The audio must be routed manually (Bluetooth loopback)
            const callSid = 'android_' + Date.now();

            // We tell frontend to open the "WebCallModal" but in "Listen Only" mode ideally, 
            // OR we run the brain server-side if we have audio access.
            // For this design: We will treat it as a "Mock" simulation logic-wise, 
            // BUT the user must use the System Mic/Speaker to talk to the phone.

            // Actually, we can just trigger the same logic as "Web Call" but start it automatically.
            // Problem: The browser handles Speech-to-Text. 
            // Solution: We return a success, and the frontend should open the AI interface.

            res.json({
                success: true,
                callSid: callSid,
                message: "Android Dialing... Please ensure Phone Audio is routed to PC.",
                isAndroid: true
            });

            // We do NOT start a server-side loop here because we need the Browser's specific STT engine (Web Speech API) 
            // which is free. The server-side STT (Deepgram/Google Cloud) costs money.
            // So we rely on the Frontend Component to handle the "Brain".
            return;
        }

        // --- MOCK MODE ---
        if (process.env.USE_MOCK_CALLS === 'true') {
            console.log(`[MockCall] Starting simulation for ${contact.name}`);

            // Generate a Mock ID
            const mockSid = 'mock_' + Date.now();

            // Respond immediately
            res.json({ success: true, callSid: mockSid, message: "Mock Call Simulation Started" });

            // Start async simulation loop
            simulateConversation(mockSid, contact, surveyId, surveyDefinition, systemContext);
            return;
        }
        // ----------------

        const client = getTwilioClient();
        const serverUrl = process.env.PUBLIC_URL || 'http://localhost:3001'; // User must set this to a tunnel (ngrok)

        const call = await client.calls.create({
            url: `${serverUrl}/voice/webhook`,
            to: contact.phone,
            from: process.env.TWILIO_PHONE_NUMBER,
            statusCallback: `${serverUrl}/voice/status`,
            statusCallbackEvent: ['completed', 'failed']
        });

        // Initialize call state
        activeCalls.set(call.sid, {
            contact,
            surveyId,
            surveyDefinition,
            currentQuestionIndex: -1, // -1 means intro
            answers: {},
            history: [
                { role: "system", content: systemContext || "You are a helpful survey assistant. Verify the user wants to take a survey." }
            ]
        });

        res.json({ success: true, callSid: call.sid, message: "Call initiated" });

    } catch (error) {
        console.error("Initiate Call Failed:", error);
        res.status(500).json({ error: error.message });
    }
};

// --- SIMULATION ENGINE ---
async function simulateConversation(callSid, contact, surveyId, surveyDefinition, systemContext) {
    const state = {
        contact,
        surveyId,
        surveyDefinition,
        currentQuestionIndex: 0,
        answers: {},
        history: [{ role: "system", content: systemContext }]
    };

    activeCalls.set(callSid, state);
    const questions = surveyDefinition.pages[0].elements;

    console.log(`[MockCall] Agent: Hello ${contact.name}, I have a survey for you.`);

    // Loop through questions
    for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        // 1. Agent Asks
        const systemPrompt = `Ask question: "${q.title || q.name}". Phrase naturally.`;
        let agentMsg = "";

        try {
            agentMsg = await getAIProvider().chat([
                ...state.history,
                { role: "system", content: systemPrompt }
            ]);
        } catch (aiErr) {
            console.error("[MockCall] AI Failed, using fallback:", aiErr.message);
            agentMsg = "Question: " + (q.title || q.name); // Fallback to raw question title
        }

        console.log(`[MockCall] Agent: ${agentMsg}`);
        state.history.push({ role: "assistant", content: agentMsg });

        // Simulate delay
        await new Promise(r => setTimeout(r, 2000));

        // 2. User Answers (Simulated by generic or AI)
        const mockAnswers = ["Yes absolutely", "It was good", "Very satisfied", "No thank you", "Maybe next time", "10 out of 10"];
        const userMsg = mockAnswers[i % mockAnswers.length];

        console.log(`[MockCall] User: ${userMsg}`);
        state.history.push({ role: "user", content: userMsg });
        state.answers[q.name] = userMsg;

        // Simulate delay
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`[MockCall] Survey Complete. Saving...`);
    await saveSubmission(surveyId, state.answers);
    activeCalls.delete(callSid);
}

exports.handleVoiceHook = async (req, res) => {
    try {
        const { CallSid, SpeechResult } = req.body;
        const callState = activeCalls.get(CallSid);

        const twiml = new twilio.twiml.VoiceResponse();

        if (!callState) {
            twiml.say("An error occurred. Session not found.");
            twiml.hangup();
            res.type('text/xml');
            res.send(twiml.toString());
            return;
        }

        // 1. Handle previous input (if any)
        if (SpeechResult) {
            callState.history.push({ role: "user", content: SpeechResult });

            // If we were asking a question, save the answer
            if (callState.currentQuestionIndex >= 0) {
                const q = callState.surveyDefinition.pages[0].elements[callState.currentQuestionIndex];
                callState.answers[q.name] = SpeechResult;
            }
        }

        // 2. Determine next step
        // logic: Intro -> Question 1 -> ... -> Question N -> Outro

        let nextMessage = "";
        let shouldListen = true;

        if (callState.currentQuestionIndex === -1) {
            // Intro phase done, move to Q0
            callState.currentQuestionIndex = 0;
        } else if (SpeechResult) {
            // Move to next question
            callState.currentQuestionIndex++;
        }

        const questions = callState.surveyDefinition.pages[0].elements;

        if (callState.currentQuestionIndex < questions.length) {
            const q = questions[callState.currentQuestionIndex];

            // Ask AI to phrase the question naturally or acknowledge the previous answer
            // We give the AI the context + the TARGET question to ask.

            const systemPrompt = `
            You are conducting a survey. 
            The next question to ask is: "${q.title || q.name}".
            Phrase it naturally. 
            If the user just answered a previous question, acknowledge it briefly before asking the new one.
            Keep it short and conversational.
            `;

            // Add a temporary system prompt for this turn
            const completion = await getAIProvider().chat([
                ...callState.history,
                { role: "system", content: systemPrompt }
            ]);

            nextMessage = completion;
            callState.history.push({ role: "assistant", content: nextMessage });

        } else {
            // Survey Complete
            nextMessage = "Thank you for your time. Your responses have been recorded. Goodbye!";
            shouldListen = false;

            // Save submission
            await saveSubmission(callState.surveyId, callState.answers);
        }

        // 3. Construct TwiML
        twiml.say(nextMessage);

        if (shouldListen) {
            twiml.gather({
                input: 'speech',
                action: `${process.env.PUBLIC_URL || 'http://localhost:3001'}/voice/webhook`,
                timeout: 5
            });
        } else {
            twiml.hangup();
        }

        res.type('text/xml');
        res.send(twiml.toString());

    } catch (error) {
        console.error("Voice Hook Failed:", error);
        res.status(500).send("Error");
    }
};

exports.handleStatusUpdate = async (req, res) => {
    const { CallSid, CallStatus } = req.body;
    console.log(`Call ${CallSid} status: ${CallStatus}`);
    if (['completed', 'failed', 'busy', 'no-answer'].includes(CallStatus)) {
        activeCalls.delete(CallSid);
    }
    res.sendStatus(200);
};
exports.initiateWebSession = async (req, res) => {
    try {
        const { surveyId, surveyDefinition } = req.body;
        const sessionId = 'web_' + Date.now();

        // Initialize session state
        activeCalls.set(sessionId, {
            surveyId,
            surveyDefinition,
            currentQuestionIndex: -1,
            answers: {},
            history: [
                { role: "system", content: "You are a helpful survey assistant. You are talking to a user via a web interface." }
            ]
        });

        res.json({ sessionId, message: "Session Created" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.handleWebChat = async (req, res) => {
    try {
        const { sessionId, userText } = req.body;
        const state = activeCalls.get(sessionId);

        if (!state) return res.status(404).json({ error: "Session not found" });

        // 1. Save User Text
        if (userText) {
            state.history.push({ role: "user", content: userText });
            // If we were asking a question, save the answer
            if (state.currentQuestionIndex >= 0) {
                const q = state.surveyDefinition.pages[0].elements[state.currentQuestionIndex];
                state.answers[q.name] = userText;
            }
        }

        // 2. Logic to determine next step
        if (state.currentQuestionIndex === -1) {
            state.currentQuestionIndex = 0;
        } else if (userText) {
            state.currentQuestionIndex++;
        }

        const questions = state.surveyDefinition.pages[0].elements;
        let responseText = "";
        let isComplete = false;

        if (state.currentQuestionIndex < questions.length) {
            const q = questions[state.currentQuestionIndex];
            const systemPrompt = `Ask question: "${q.title || q.name}". Phrase naturally. Keep it short.`;

            try {
                responseText = await getAIProvider().chat([
                    ...state.history,
                    { role: "system", content: systemPrompt }
                ]);
            } catch (err) {
                responseText = q.title || q.name;
            }
            state.history.push({ role: "assistant", content: responseText });

        } else {
            responseText = "Thank you! Survey complete.";
            isComplete = true;
            await saveSubmission(state.surveyId, state.answers);
            activeCalls.delete(sessionId);
        }

        res.json({ text: responseText, isComplete });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
