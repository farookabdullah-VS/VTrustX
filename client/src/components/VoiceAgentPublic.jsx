import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mic, Bot, User, Volume2, Send } from 'lucide-react';

export function VoiceAgentPublic({ slug }) {
    const [status, setStatus] = useState('initializing'); // initializing, ready, speaking, listening, processing, ended, error
    const [transcript, setTranscript] = useState([]);
    const [form, setForm] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1); // -1 = Not started
    const [aiConfig, setAiConfig] = useState({});

    // Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const currentUtteranceRef = useRef(null);
    const mountedRef = useRef(true);

    // Styling constants
    const styles = {
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

    useEffect(() => {
        mountedRef.current = true;
        loadForm();
        setupSpeech();

        return () => {
            mountedRef.current = false;
            cancelSpeech();
        };
    }, [slug]);

    const loadForm = async () => {
        try {
            // Find by Slug first, if fails try ID (backend logic handles this but let's be safe)
            const res = await axios.get(`/api/forms/slug/${slug}`);
            const formData = res.data;

            setForm(formData);
            setAiConfig(formData.ai || {});

            // Parse Questions
            const def = formData.definition || {};
            const qList = [];
            (def.pages || []).forEach(p => {
                (p.elements || []).forEach(e => {
                    qList.push({
                        title: e.title || e.name,
                        name: e.name,
                        type: e.type
                    });
                });
            });
            setQuestions(qList);

            if (!formData.enableVoiceAgent) {
                setStatus('disabled');
                addMessage('agent', "This survey does not have the Voice Agent enabled.");
            } else {
                setStatus('ready');
            }

        } catch (err) {
            console.error("Load Error", err);
            setStatus('error');
            addMessage('agent', "Sorry, I couldn't load the survey. Please check the link and try again.");
        }
    };

    const setupSpeech = () => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                addMessage('user', text);
                processResponse(text);
            };

            recognition.onerror = (event) => {
                console.warn("Speech Error:", event.error);
                if (event.error === 'no-speech') {
                    // Silent fail, user can click mic again
                    setStatus('waiting');
                } else {
                    setStatus('error');
                }
            };

            recognition.onend = () => {
                if (status === 'listening' && mountedRef.current) {
                    // recognition stopped unexpectedly?
                }
            }

            recognitionRef.current = recognition;
        }
    };

    const startSession = () => {
        setCurrentQuestionIndex(0);
        const greeting = `Hello! I am the AI assistant for ${form?.title || 'this survey'}. I'll ask you a few questions. Ready?`;
        speak(greeting);
    };

    const cancelSpeech = () => {
        if (synthRef.current) synthRef.current.cancel();
        if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { }
    };

    const speak = (text) => {
        if (!mountedRef.current) return;
        addMessage('agent', text);

        if (synthRef.current) {
            synthRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setStatus('speaking');
            utterance.onend = () => {
                if (status !== 'ended') {
                    startListening();
                }
            };
            synthRef.current.speak(utterance);
        } else {
            // Fallback if no TTS
            startListening();
        }
    };

    const startListening = () => {
        if (!mountedRef.current) return;
        if (recognitionRef.current) {
            try {
                setStatus('listening');
                recognitionRef.current.start();
            } catch (e) {
                console.warn("Start Listen Error", e);
                setStatus('waiting');
            }
        } else {
            setStatus('waiting');
        }
    };

    const addMessage = (sender, text) => {
        setTranscript(prev => [...prev, { sender, text, time: new Date() }]);
    };

    const processResponse = async (userText) => {
        setStatus('processing');

        try {
            // Check termination
            if (currentQuestionIndex >= questions.length || currentQuestionIndex === -1) {
                endSession();
                return;
            }

            // AI Decision Loop
            // Ask AI to generate next step based on user input + current question
            // We pass the Model Name via aiConfig settings

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
                2. If yes, acknowledge briefly and ask the Next Question exact text. Set action="next".
                3. If no, politely clarify or probe. Set action="stay".
                4. If user says 'stop' or 'bye', set action="end".
                5. If this was the last question (no Next Question), thank them. Set action="end".

                Return ONLY raw JSON: { "speak": "...", "action": "next" | "stay" | "end" }
            `;

            const res = await axios.post('/api/ai/generate', {
                prompt: systemPrompt,
                settings: aiConfig
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

            if (decision.action === 'next') {
                setCurrentQuestionIndex(prev => prev + 1);
            } else if (decision.action === 'end') {
                setCurrentQuestionIndex(questions.length); // Mark done
                await saveSubmission(userText); // Save final bit?
                speak(decision.speak || "Thank you for your time!");
                setStatus('ended');
                return;
            }

            speak(decision.speak);

            // Background save (simple)
            if (decision.action === 'next') {
                // In a real app we'd accumulate answers properly matched to IDs
            }

        } catch (err) {
            console.error("AI Process Error", err);
            speak("I'm sorry, I had a glitch. Let's move to the next item.");
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const saveSubmission = async (lastText) => {
        // Simple transcript dump
        try {
            await axios.post('/api/submissions', {
                formId: form.id,
                formVersion: form.version,
                data: {
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
