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

        // 2. Logic to determine next step (Shared with Phone logic, but simplified return)

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
