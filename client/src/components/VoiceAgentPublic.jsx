import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, Bot, User, Volume2, Send } from 'lucide-react';

export function VoiceAgentPublic({ slug }) {
    const [status, setStatus] = useState('initializing'); // initializing, ready, speaking, listening, processing, ended, error
    const [transcript, setTranscript] = useState([]);
    const [form, setForm] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 = Not started
    const [answers, setAnswers] = useState({});

    // styling constants...
    const styles = {
        // ... (keep existing styles)
        container: {
            maxWidth: '600px',
            margin: '0 auto',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#f8fafc',
            fontFamily: "'Inter', 'Outfit', sans-serif"
        },
        header: {
            padding: '20px',
            backgroundColor: 'white',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        },
        chatArea: {
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        },
        controls: {
            padding: '20px',
            backgroundColor: 'white',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '10px',
            alignItems: 'center'
        },
        bubble: (sender) => ({
            alignSelf: sender === 'agent' ? 'flex-start' : 'flex-end',
            backgroundColor: sender === 'agent' ? 'white' : '#0f172a',
            color: sender === 'agent' ? '#1e293b' : 'white',
            padding: '16px 20px',
            borderRadius: '16px',
            borderTopLeftRadius: sender === 'agent' ? '4px' : '16px',
            borderTopRightRadius: sender === 'agent' ? '16px' : '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            maxWidth: '80%',
            lineHeight: '1.6',
            fontSize: '1em'
        }),
        statusIndicator: {
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85em',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: status === 'listening' ? '#dcfce7' : status === 'processing' ? '#e0f2fe' : '#f1f5f9',
            color: status === 'listening' ? '#166534' : status === 'processing' ? '#0369a1' : '#64748b'
        }
    };

    const [voiceSettings, setVoiceSettings] = useState({ stt_provider: 'browser' });
    const mediaRecorderRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        // Load Form
        if (slug) {
            axios.get(`/api/forms/public/${slug}`)
                .then(res => {
                    setForm(res.data);
                    // Handle different schema structures if needed
                    const elements = res.data.schema?.pages?.[0]?.elements || res.data.schema?.elements || [];
                    setQuestions(elements);
                    setStatus('ready');
                })
                .catch(err => {
                    console.error("Link invalid", err);
                    setStatus('error');
                });
        }

        // Load Voice Settings
        axios.get('/api/settings').then(res => {
            // Check for 'voice_agent_provider' setting
            const provider = res.data.voice_agent_provider || 'browser';
            setVoiceSettings({ stt_provider: provider });
        }).catch(() => { });

    }, [slug]);

    const speak = (text) => {
        if (!text) return;

        // Simple synthesis
        const synth = window.speechSynthesis;
        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => {
            if (status !== 'ended') {
                setStatus('waiting');
                // Auto-listen after speaking
                setTimeout(() => startListening(), 500);
            }
        };
        setStatus('speaking');
        synth.speak(u);
    };

    const startSession = () => {
        setCurrentQuestionIndex(0);
        setTranscript([]);
        setAnswers({});
        // Find first question title or generic welcome
        const welcome = "Hello! I am your AI interviewer. I'm ready to start the survey.";
        speak(welcome);
    };

    const endSession = () => {
        setStatus('ended');
        speak("Thank you for your time. The survey is complete.");
    };

    const startListening = () => {
        if (status === 'listening' || status === 'processing' || status === 'speaking') return;

        const provider = voiceSettings.stt_provider;

        if (provider === 'browser') {
            const SpeechOrWebkit = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechOrWebkit) {
                // Fallback to server if browser not supported? Or alert.
                alert("Browser speech recognition not supported.");
                return;
            }
            const rec = new SpeechOrWebkit();
            rec.lang = 'en-US';
            rec.continuous = false;
            rec.interimResults = false;
            rec.onstart = () => setStatus('listening');
            rec.onresult = (e) => {
                const text = e.results[0][0].transcript;
                setTranscript(prev => [...prev, { sender: 'user', text }]);
                processResponse(text);
            };
            rec.onerror = (e) => {
                console.error("Speech Error", e);
                // If no speech detected, maybe prompt? 
                if (e.error === 'no-speech') {
                    // speak("I didn't hear anything.");
                }
                setStatus('waiting');
            };
            rec.start();
            recognitionRef.current = rec;
        } else {
            // Server Mode (Google / Groq)
            handleServerListening();
        }
    };

    const handleServerListening = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const chunks = [];

            mediaRecorder.ondataavailable = e => chunks.push(e.data);
            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setStatus('processing');

                const formData = new FormData();
                formData.append('audio', blob);
                formData.append('stt_provider', voiceSettings.stt_provider);

                try {
                    const res = await axios.post('/api/ai/transcribe', formData);
                    const text = res.data.text;
                    setTranscript(prev => [...prev, { sender: 'user', text }]);
                    processResponse(text);
                } catch (err) {
                    console.error("Transcribe Error", err);
                    speak("Sorry, I had trouble hearing you.");
                    setStatus('waiting');
                }
            };

            mediaRecorder.start();
            setStatus('listening');

            // Auto-stop after 5 seconds of silence? 
            // Simple timeout for MVP
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    stream.getTracks().forEach(t => t.stop());
                }
            }, 6000);

        } catch (err) {
            console.error("Mic Error", err);
            alert("Could not access microphone.");
            setStatus('error');
        }
    };

    // (Inside processResponse)
    const processResponse = async (userText) => {
        setStatus('processing');

        try {
            // Check termination
            if (currentQuestionIndex >= questions.length || currentQuestionIndex === -1) {
                endSession();
                return;
            }

            const currentQ = questions[currentQuestionIndex];
            const nextQ = questions[currentQuestionIndex + 1];

            const systemPrompt = `
                You are a professional surveyor.
                Context: Survey "${form?.title}".
                Current Question [${currentQuestionIndex + 1}/${questions.length}]: "${currentQ?.title}".
                Next Question: "${nextQ?.title || 'End of Survey'}".
                User Response: "${userText}".
                
                Instructions:
                1. Did the user answer the question?
                2. If yes:
                   - Extract their answer as clear text (e.g. "Yes", "Very Good", "I like X").
                   - Predict sentiment (Positive/Negative/Neutral).
                   - Set action="next".
                   - Phrase the next speak to acknowledge the answer briefly then ask the Next Question.
                3. If no (or asking for clarification):
                   - Set action="stay".
                   - Politely clarify/probe.
                   - set predicted_answer=null.
                4. If user says 'stop' or 'bye', set action="end".
                5. If this was the last question (no Next Question), set action="end".

                Return ONLY raw JSON: 
                { 
                  "speak": "...", 
                  "action": "next" | "stay" | "end",
                  "extracted_answer": "string or null",
                  "sentiment": "Positive" | "Negative" | "Neutral" | "N/A"
                }
            `;

            const res = await axios.post('/api/ai/generate', {
                prompt: systemPrompt,
                settings: form?.ai_config || {}
            });

            // Parse response - Handle potental Markdown wrapping
            let cleanJson = res.data.text || "{}";
            cleanJson = cleanJson.replace(/```json/g, '').replace(/```/g, '').trim();

            let decision;
            try {
                decision = JSON.parse(cleanJson);
            } catch (e) {
                console.warn("JSON Parse Fail", cleanJson);
                decision = { speak: "Thank you. Moving to the next question.", action: "next" };
            }

            if (decision.action === 'next' || decision.action === 'end') {
                // Save Answer
                if (decision.extracted_answer) {
                    setAnswers(prev => ({
                        ...prev,
                        [currentQ.name]: {
                            value: decision.extracted_answer,
                            sentiment: decision.sentiment,
                            transcript: userText
                        }
                    }));
                }

                if (decision.action === 'next') {
                    setCurrentQuestionIndex(prev => prev + 1);
                } else {
                    setCurrentQuestionIndex(questions.length); // Mark done

                    // Wait for state update before saving? No, use local var or functional update logic.
                    // Ideally we should wait, but for now lets pass the LATEST answer manually to save
                    const finalAnswers = {
                        ...answers,
                        [currentQ.name]: {
                            value: decision.extracted_answer,
                            sentiment: decision.sentiment,
                            transcript: userText
                        }
                    };

                    await saveSubmission(finalAnswers, userText);
                    speak(decision.speak || "Thank you for your time!");
                    setStatus('ended');
                    return;
                }
            }

            speak(decision.speak);

        } catch (err) {
            console.error("AI Process Error", err);
            speak("I'm sorry, I had a glitch. Let's move to the next item.");
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const saveSubmission = async (finalAnswers, lastText) => {
        try {
            await axios.post('/api/submissions', {
                formId: form.id,
                formVersion: form.version,
                data: {
                    answers: finalAnswers || answers,
                    ai_transcript: [...transcript, { sender: 'user', text: lastText }],
                    mode: 'voice_agent_public'
                }
            });
        } catch (e) { console.error("Save Error", e); }
    };

    // Render
    if (status === 'initializing') return <div style={styles.container}><div style={{ padding: '40px', textAlign: 'center' }}>Loading Voice Agent...</div></div>;
    if (status === 'error') return <div style={styles.container}><div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Unable to load survey.</div></div>;
    if (status === 'disabled') return <div style={styles.container}><div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Voice Agent is disabled for this survey.<br />Please contact the administrator.</div></div>;

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                    <Bot size={24} />
                </div>
                <div>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{form?.title}</div>
                    <div style={{ fontSize: '0.85em', color: '#64748b' }}>AI Interviewer • {questions.length} Questions</div>
                </div>
            </div>

            {/* Chat Area */}
            <div style={styles.chatArea}>
                {transcript.length === 0 && (
                    <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
                        <Bot size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                        <p>Tap the microphone to start the survey.</p>
                    </div>
                )}
                {transcript.map((t, i) => (
                    <div key={i} style={styles.bubble(t.sender)}>
                        {t.text}
                    </div>
                ))}
                <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
            </div>

            {/* Controls */}
            <div style={styles.controls}>
                {transcript.length === 0 ? (
                    <button
                        onClick={startSession}
                        style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <Mic /> Start Interview
                    </button>
                ) : status === 'ended' ? (
                    <div style={{ width: '100%', textAlign: 'center', color: '#166534', fontWeight: 'bold' }}>Survey Completed</div>
                ) : (
                    <>
                        <div style={styles.statusIndicator}>
                            {status === 'speaking' && <Volume2 size={16} className="animate-pulse" />}
                            {status === 'listening' && <Mic size={16} className="animate-bounce" />}
                            {status === 'processing' && <Bot size={16} className="animate-spin" />}
                            <span style={{ textTransform: 'uppercase' }}>{status}</span>
                        </div>
                        {status === 'waiting' && <button onClick={startListening} style={{ marginLeft: 'auto', padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Resume</button>}
                    </>
                )}
            </div>

            <style>{`
                .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                .animate-bounce { animation: bounce 1s infinite; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
                @keyframes bounce { 0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); } 50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
