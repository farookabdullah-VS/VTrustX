import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Play, Phone, Square, Mic, Volume2, User, Bot, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AISurveyor() {
    const { t } = useTranslation();
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState('');
    const [phoneNumber, setPhoneNumber] = useState(''); // Simulation
    const [isCallActive, setIsCallActive] = useState(false);
    const [transcript, setTranscript] = useState([]);
    const [agentStatus, setAgentStatus] = useState('idle'); // idle, speaking, listening, processing
    const [contacts, setContacts] = useState([]);

    // Web Speech API Refs
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const currentUtteranceRef = useRef(null);
    const aiConfigRef = useRef({}); // Store AI Settings

    // Load available surveys
    useEffect(() => {
        axios.get('/api/forms').then(res => setForms(res.data)).catch(console.error);
        axios.get('/api/contacts').then(res => setContacts(res.data)).catch(console.error);
    }, []);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const text = event.results[0][0].transcript;
                addTranscript('user', text);
                processUserResponse(text);
            };

            recognitionRef.current.onend = () => {
                if (isCallActive && agentStatus === 'listening') {
                    // unexpected end, restart? or wait
                    // recognitionRef.current.start();
                }
            };

            recognitionRef.current.onerror = (e) => {
                console.error("Speech error", e);
                setAgentStatus('error');
            };
        }
    }, [isCallActive, agentStatus]); // Dependencies might need tuning

    const addTranscript = (sender, text) => {
        setTranscript(prev => [...prev, { sender, text, time: new Date() }]);
    };

    const speak = (text) => {
        if (!synthRef.current) return;

        // Cancel previous
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setAgentStatus('speaking');
        utterance.onend = () => {
            setAgentStatus('listening');
            startListening();
        };
        currentUtteranceRef.current = utterance;
        synthRef.current.speak(utterance);
        addTranscript('agent', text);
    };

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
            } catch (e) {
                // If already started
                console.warn(e);
            }
        } else {
            // Fallback for no speech api
            setAgentStatus('waiting_input');
        }
    };

    // AI Logic (Simulation of "Agentic" behavior)
    // In a real app, this would send audio/text to Backend -> LLM -> Backend -> Audio
    // Here we simulate the flow locally for demo speed, or call backend /generate
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState([]);

    const startCall = async () => {
        if (!selectedFormId) return alert("Select a survey first");

        setIsCallActive(true);
        setTranscript([]);
        setAgentStatus('connecting');

        // Load Definition
        try {
            // We can use the existing form list if full definition is there, 
            // but often lists are summarized. Fetch full.
            const res = await axios.get(`/api/forms/${selectedFormId}`);
            const formDef = res.data.definition;
            aiConfigRef.current = res.data.ai || {}; // Load AI Config

            // Extract Questions (simple linear)
            const flatQuestions = [];
            (formDef.pages || []).forEach(p => {
                (p.elements || []).forEach(e => {
                    flatQuestions.push({ title: e.title || e.name, type: e.type, name: e.name });
                });
            });
            setQuestions(flatQuestions);
            setCurrentQuestionIndex(0);

            // Start
            setTimeout(() => {
                setAgentStatus('connected');
                speak(`Hello! I am an AI assistant calling from RayiX. We are conducting a survey about ${formDef.title}. Do you have a moment?`);
            }, 1500);

        } catch (e) {
            alert("Failed to start: " + e.message);
            setIsCallActive(false);
        }
    };

    const endCall = () => {
        if (synthRef.current) synthRef.current.cancel();
        if (recognitionRef.current) recognitionRef.current.stop();
        setIsCallActive(false);
        setAgentStatus('ended');

        // Save Transcript as Submission
        if (selectedFormId && transcript.length > 0) {
            axios.post('/api/submissions', {
                formId: selectedFormId,
                formVersion: 1, // Default, logic should ideally fetch version
                data: {
                    ai_transcript: transcript,
                    summary: "AI Agent Call"
                },
                metadata: {
                    channel: 'voice_ai',
                    agent: 'AISurveyor',
                    duration: 'unknown'
                }
            }).then(() => alert("Call ended. Transcript saved to Submissions."))
                .catch(err => console.error("Failed to save transcript", err));
        }
    };

    const processUserResponse = async (text) => {
        setAgentStatus('processing');

        // Simple Logic:
        // If first interaction (greeting), check if positive.
        // Then iterate questions.

        // We can use the Real AI Backend for "Analysis" of the response to decide next step?
        // Let's use the valid /api/ai/generate endpoint if we want "Agentic" feel.

        try {
            // Construct prompt for LLM to decide what to say next
            const prompt = `
                You are a phone surveyor conducting a survey.
                Current State: Question ${currentQuestionIndex} of ${questions.length}.
                Current Question: ${currentQuestionIndex === -1 ? 'Greeting' : (questions[currentQuestionIndex]?.title || 'Finished')}.
                User said: "${text}".
                
                Task:
                1. Analyze if user answered the question.
                2. If yes, move to next question.
                3. If no, clarify.
                4. If user declines, end politely.
                5. Provide the EXACT response text to speak.
                6. Provide 'action': 'next', 'repeat', 'end'.
                
                Questions List: ${JSON.stringify(questions.map(q => q.title))}

                Respond in JSON: { "speak": "...", "action": "..." }
            `;

            // Call AI Agent Endpoint
            const res = await axios.post('/api/ai/agent-interact', {
                prompt,
                systemContext: "You are an expert phone surveyor using Gemini AI."
            });

            // The endpoint returns the parsed JSON directly
            const aiResponse = res.data;

            if (aiResponse && aiResponse.speak) {
                speak(aiResponse.speak);
                if (aiResponse.action === 'next') {
                    setCurrentQuestionIndex(prev => prev + 1);
                } else if (aiResponse.action === 'end') {
                    setTimeout(endCall, 3000);
                }
            } else {
                // Fallback
                speak("Thank you. Moving on to the next question.");
                setCurrentQuestionIndex(prev => prev + 1);
            }

        } catch (e) {
            console.error("AI Error", e);
            // Fallback logic
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                speak(`Okay. Next question: ${questions[currentQuestionIndex + 1].title}`);
            } else {
                speak("Thank you for your time. Goodbye!");
                setTimeout(endCall, 2000);
            }
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <h1 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Rayi - Conversational AI Agent</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>Deploy autonomous voice agents powered by Gemini AI.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '30px' }}>

                {/* CONFIGURATION PANEL */}
                <div style={{ background: 'var(--input-bg)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: 'fit-content', border: '1px solid var(--input-border)' }}>
                    <h3 style={{ marginTop: 0, color: 'var(--text-color)' }}>Campaign Setup</h3>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Select Survey</label>
                        <select
                            value={selectedFormId}
                            onChange={e => setSelectedFormId(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                        >
                            <option value="">-- Choose a Survey --</option>
                            {forms.map(f => (
                                <option key={f.id} value={f.id}>{f.title}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Target Contact (Simulation)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <select
                                onChange={e => setPhoneNumber(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            >
                                <option value="">Custom Number...</option>
                                {contacts.map(c => <option key={c.id} value={c.phone}>{c.name} ({c.phone})</option>)}
                            </select>
                            {/* If custom */}
                            <input
                                type="text"
                                placeholder="+1 555-0123"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Agent Voice</label>
                        <select style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}>
                            <option>Sarah (Professional)</option>
                            <option>John (Casual)</option>
                            <option>Emma (Empathetic)</option>
                        </select>
                    </div>

                    {!isCallActive ? (
                        <button
                            onClick={startCall}
                            disabled={!selectedFormId}
                            style={{
                                width: '100%', padding: '14px', background: 'var(--primary-color)', color: 'var(--button-text)',
                                border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1.1em',
                                cursor: selectedFormId ? 'pointer' : 'not-allowed', opacity: selectedFormId ? 1 : 0.7,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            <Phone size={20} /> Initiate Call
                        </button>
                    ) : (
                        <button
                            onClick={endCall}
                            style={{
                                width: '100%', padding: '14px', background: '#dc2626', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: '600', fontSize: '1.1em',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                            }}
                        >
                            <Square size={20} fill="white" /> End Call
                        </button>
                    )}

                    {isCallActive && (
                        <div style={{ marginTop: '20px', padding: '15px', background: 'var(--sidebar-hover-bg)', borderRadius: '8px', border: '1px solid var(--primary-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '12px', height: '12px', background: 'var(--primary-color)', borderRadius: '50%' }}></div>
                                <div style={{
                                    position: 'absolute', top: '-4px', left: '-4px', right: '-4px', bottom: '-4px',
                                    border: '2px solid var(--primary-color)', borderRadius: '50%', opacity: 0.5,
                                    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                                }}></div>
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                                {agentStatus === 'speaking' ? 'Agent Speaking...' :
                                    agentStatus === 'listening' ? 'Listening...' :
                                        agentStatus === 'processing' ? 'AI Thinking...' : 'Connected'}
                            </span>
                        </div>
                    )}

                    <style>{`
                        @keyframes ping {
                            75%, 100% { transform: scale(2); opacity: 0; }
                        }
                    `}</style>
                </div>

                {/* VISUALIZATION / TRANSCRIPT */}
                <div style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
                    <div style={{ padding: '16px', background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--input-border)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                        <AlertCircle size={16} /> Live Transcript
                    </div>

                    <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {transcript.length === 0 && !isCallActive && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '100px' }}>
                                <Bot size={48} style={{ marginBottom: '10px', opacity: 0.5 }} />
                                <p>Ready to start.</p>
                            </div>
                        )}

                        {transcript.map((t, i) => (
                            <div key={i} style={{
                                alignSelf: t.sender === 'agent' ? 'flex-start' : 'flex-end',
                                maxWidth: '80%',
                                display: 'flex', gap: '10px',
                                flexDirection: t.sender === 'user' ? 'row-reverse' : 'row'
                            }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: t.sender === 'agent' ? 'var(--primary-color)' : 'var(--secondary-color)', color: 'var(--button-text)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                }}>
                                    {t.sender === 'agent' ? <Bot size={18} /> : <User size={18} />}
                                </div>
                                <div style={{
                                    background: t.sender === 'agent' ? 'var(--sidebar-hover-bg)' : 'var(--input-border)',
                                    padding: '12px 16px', borderRadius: '12px',
                                    color: 'var(--text-color)', lineHeight: '1.5'
                                }}>
                                    {t.text}
                                </div>
                            </div>
                        ))}
                        {agentStatus === 'processing' && (
                            <div style={{ alignSelf: 'flex-start', marginLeft: '42px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Generating response...
                            </div>
                        )}
                    </div>

                    {/* Manual Input Fallback */}
                    <div style={{ padding: '16px', borderTop: '1px solid var(--input-border)', display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="Type to simulate user voice..."
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.target.value) {
                                    addTranscript('user', e.target.value);
                                    processUserResponse(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <button style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--sidebar-hover-bg)', cursor: 'pointer' }}>
                            <Mic size={20} color="var(--text-muted)" />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
