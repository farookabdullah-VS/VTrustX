import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export function WebCallModal({ survey, onClose }) {
    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]); // { role: 'agent' | 'user', text: '' }
    const [status, setStatus] = useState("Initializing...");
    const [isListening, setIsListening] = useState(false);

    const recognition = useRef(null);
    const synthesis = window.speechSynthesis;

    useEffect(() => {
        // Initialize Session
        axios.post('/api/ai-service/web/initiate', {
            surveyId: survey.id,
            surveyDefinition: survey.definition
        })
            .then(res => {
                setSessionId(res.data.sessionId);
                setStatus(res.data.isAndroid ? "📞 Phone Dialing... Connect Audio!" : "Ready. Agent connecting...");

                // If Android, we might want to delay the first "Hello" until the call is answered.
                // But we don't know when it acts. 
                // For now, start immediately.
                sendChat(res.data.sessionId, null);
            })
            .catch(err => setStatus("Error: " + err.message));

        // Setup Speech Recognition
        if ('webkitSpeechRecognition' in window) {
            const r = new window.webkitSpeechRecognition();
            r.continuous = false;
            r.interimResults = false;
            r.lang = 'en-US';

            r.onstart = () => setIsListening(true);
            r.onend = () => setIsListening(false);

            r.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                addMessage('user', transcript);
                sendChat(sessionId, transcript); // WARNING: Close closure issue if using plain state
            };

            recognition.current = r;
        } else {
            alert("Your browser does not support Speech Recognition (Chrome recommended).");
        }

        return () => {
            synthesis.cancel();
            if (recognition.current) recognition.current.stop();
        };
    }, []);

    // Helper to access latest sessionId in closure
    const sessionRef = useRef(sessionId);
    useEffect(() => { sessionRef.current = sessionId; }, [sessionId]);

    const addMessage = (role, text) => {
        setMessages(prev => [...prev, { role, text }]);
    };

    const speak = (text) => {
        setStatus("Agent speaking...");
        const utterance = new SpeechSynthesisUtterance(text);

        // Try to pick a Google Voice
        const voices = synthesis.getVoices();
        const googleVoice = voices.find(v => v.name.includes('Google US English'));
        if (googleVoice) utterance.voice = googleVoice;

        utterance.onend = () => {
            setStatus("Listening...");
            recognition.current.start();
        };

        synthesis.speak(utterance);
    };

    const sendChat = (sid, text) => {
        const activeSid = sid || sessionRef.current; // Fallback

        setStatus("Agent thinking...");
        axios.post('/api/ai-service/web/chat', {
            sessionId: activeSid,
            userText: text
        })
            .then(res => {
                const agentText = res.data.text;
                addMessage('agent', agentText);

                if (res.data.isComplete) {
                    setStatus("Survey Complete!");
                    synthesis.speak(new SpeechSynthesisUtterance(agentText));
                    setTimeout(onClose, 5000);
                } else {
                    speak(agentText);
                }
            })
            .catch(err => setStatus("Error: " + err.message));
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
            <div style={{ background: '#1e293b', padding: '40px', borderRadius: '24px', width: '400px', textAlign: 'center', color: 'white' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>
                    {isListening ? '🎤' : '🤖'}
                </div>

                <h2 style={{ margin: 0, marginBottom: '10px' }}>AI Voice Agent</h2>
                <p style={{ color: '#94a3b8', marginBottom: '30px' }}>{status}</p>

                <div style={{ height: '200px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'left' }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ marginBottom: '10px', textAlign: m.role === 'user' ? 'right' : 'left' }}>
                            <span style={{
                                display: 'inline-block', padding: '8px 12px', borderRadius: '12px',
                                background: m.role === 'user' ? '#3b82f6' : '#334155', fontSize: '0.9em'
                            }}>
                                {m.text}
                            </span>
                        </div>
                    ))}
                </div>

                <button onClick={onClose} style={{ padding: '10px 30px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '30px', fontWeight: 'bold', cursor: 'pointer' }}>
                    End Call
                </button>
            </div>
        </div>
    );
}
