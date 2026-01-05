import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Mic, MicOff, Volume2, CheckCircle, Loader } from 'lucide-react';

export function VoiceSurveyRunner() {
    const { id } = useParams(); // Form ID
    const [form, setForm] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, ready, speaking, listening, processing, done
    const [currentStep, setCurrentStep] = useState(0);
    const [transcript, setTranscript] = useState('');
    const [answers, setAnswers] = useState({});

    // Speech synthesis
    const synth = window.speechSynthesis;
    // Speech recognition
    const recognitionRef = useRef(null);

    useEffect(() => {
        loadForm();
        setupRecognition();
        return () => {
            if (synth.speaking) synth.cancel();
        }
    }, [id]);

    const loadForm = async () => {
        try {
            const res = await axios.get(`/api/forms/${id}`);
            // Flatten questions
            const flatQuestions = [];
            if (res.data.definition && res.data.definition.pages) {
                res.data.definition.pages.forEach(p => {
                    if (p.elements) p.elements.forEach(e => flatQuestions.push(e));
                });
            }
            setForm({ ...res.data, questions: flatQuestions });
            setStatus('ready');
        } catch (err) {
            console.error(err);
            setStatus('error');
        }
    };

    const setupRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = true;

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                setTranscript(text);
            };

            recognition.onend = () => {
                // If we were listening, this means silence/end
                // We should process the answer
                // (In a real app, user might confirm manually)
            };

            recognitionRef.current = recognition;
        }
    };

    const startSurvey = () => {
        setCurrentStep(0);
        askQuestion(0);
    };

    const askQuestion = (index) => {
        if (!form || !form.questions[index]) {
            finishSurvey();
            return;
        }

        const q = form.questions[index];
        const text = q.title || q.name;

        setStatus('speaking');
        setTranscript('');

        const utter = new SpeechSynthesisUtterance(text);
        utter.onend = () => {
            startListening();
        };
        synth.speak(utter);
    };

    const startListening = () => {
        setStatus('listening');
        if (recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (e) { }
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) recognitionRef.current.stop();
        setStatus('processing');
        // Simulate "Agentic Parsing"
        setTimeout(() => {
            saveAnswer(currentStep, transcript);
        }, 1000);
    };

    const saveAnswer = (index, text) => {
        const q = form.questions[index];
        setAnswers(prev => ({ ...prev, [q.name]: text }));

        const next = index + 1;
        if (next < form.questions.length) {
            setCurrentStep(next);
            askQuestion(next);
        } else {
            finishSurvey();
        }
    };

    const finishSurvey = async () => {
        setStatus('done');
        // Submit to API
        try {
            await axios.post('/api/submissions', {
                formId: id,
                data: answers,
                source: 'voice_agent'
            });
            const utter = new SpeechSynthesisUtterance("Thank you. Your responses have been recorded.");
            synth.speak(utter);
        } catch (err) {
            console.error("Submission failed", err);
        }
    };

    if (status === 'loading') return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Voice Agent...</div>;
    if (status === 'error') return <div style={{ padding: '40px', textAlign: 'center', color: 'red' }}>Survey Not Found</div>;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white', fontFamily: "'Outfit', sans-serif" }}>

            {status === 'ready' && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3em', marginBottom: '20px' }}>🎙️</div>
                    <h1 style={{ marginBottom: '10px' }}>{form.title}</h1>
                    <p style={{ color: '#94a3b8', marginBottom: '40px' }}>Voice Survey</p>
                    <button
                        onClick={startSurvey}
                        style={{ padding: '15px 40px', fontSize: '1.2em', background: '#0e7490', color: 'white', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Start Conversation
                    </button>
                </div>
            )}

            {(status === 'speaking' || status === 'listening' || status === 'processing') && form.questions[currentStep] && (
                <div style={{ textAlign: 'center', maxWidth: '600px', padding: '20px' }}>
                    <h2 style={{ fontSize: '1.8em', marginBottom: '30px', lineHeight: '1.4' }}>
                        {form.questions[currentStep].title || form.questions[currentStep].name}
                    </h2>

                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {status === 'speaking' && <div className="pulse-ring" style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#0e7490' }} />}
                        {status === 'listening' && (
                            <div
                                onClick={stopListening}
                                style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' }}>
                                <Mic size={40} />
                            </div>
                        )}
                        {status === 'processing' && <Loader className="spin" size={40} />}
                    </div>

                    <div style={{ marginTop: '20px', minHeight: '40px', color: '#cbd5e1', fontSize: '1.2em', fontStyle: 'italic' }}>
                        {transcript || (status === 'listening' ? "Listening..." : "...")}
                    </div>

                    {status === 'listening' && (
                        <button onClick={stopListening} style={{ marginTop: '30px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer' }}>
                            Tap when done
                        </button>
                    )}
                </div>
            )}

            {status === 'done' && (
                <div style={{ textAlign: 'center' }}>
                    <CheckCircle size={80} color="#22c55e" style={{ marginBottom: '20px' }} />
                    <h2>Thank You!</h2>
                    <p style={{ color: '#94a3b8' }}>Your voice responses have been saved.</p>
                </div>
            )}

            <style>{`
                .pulse-ring { animation: pulse 1.5s infinite; }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 116, 144, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(14, 116, 144, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(14, 116, 144, 0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
