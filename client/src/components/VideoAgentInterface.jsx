import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './VideoAgentInterface.css';

// Layla (Arabic Agent)
const DEFAULT_AVATAR = "/agent_layla_video.png";

const VideoAgentInterface = ({ onClose, surveyId }) => {
    const [status, setStatus] = useState("Initializing...");
    const [agentState, setAgentState] = useState("idle"); // idle, listening, thinking, speaking
    const [caption, setCaption] = useState("");
    const [showCaption, setShowCaption] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [currentQuestionType, setCurrentQuestionType] = useState(null); // 'text', 'boolean', 'rating', 'nps'

    const videoRef = useRef(null);
    const recognition = useRef(null);
    const synthesis = window.speechSynthesis;

    // Manage Stream
    useEffect(() => {
        let stream = null;
        async function enableVideo() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Camera Error:", err);
                setStatus("Camera Access Denied");
            }
        }
        enableVideo();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Manage Speech Logic
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            setStatus("Browser not supported (Use Chrome)");
            return;
        }

        const r = new window.webkitSpeechRecognition();
        r.continuous = false; // We want turn-taking
        r.interimResults = true; // Show what user is saying in real-time
        r.lang = 'en-US';

        r.onstart = () => {
            setAgentState('listening');
            setStatus("Listening...");
        };

        r.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');

            setCaption(transcript);
            setShowCaption(true);

            // If final, send to agent
            if (event.results[0].isFinal) {
                handleUserMessage(transcript);
            }
        };

        r.onend = () => {
            // If we didn't just switch to thinking (meaning we got a result), go back to idle or restart
            if (agentState === 'listening') {
                // Restart listening if we didn't get a final result that triggered 'thinking'
                // But simply calling start() here might cause loops if it stopped for other reasons.
                // Ideally, we wait for 'speak' to finish before listening again.
            }
        };

        r.onerror = (event) => {
            console.error("Speech Error", event.error);
            if (event.error === 'no-speech') {
                // Silent restart?
            }
        };

        recognition.current = r;

        // Auto-start listening after a delay
        setTimeout(() => startListening(), 1000);

        return () => {
            r.stop();
            synthesis.cancel();
        };
    }, []); // Run once on mount

    const startListening = () => {
        if (agentState === 'speaking' || agentState === 'thinking') return;
        try {
            // Stop any previous instance
            try { recognition.current.stop(); } catch (e) { }

            setTimeout(() => {
                recognition.current.start();
            }, 200);
        } catch (e) {
            // Already started or busy
        }
    };

    // Start Call Logic
    useEffect(() => {
        if (!surveyId) {
            setStatus("Error: No Survey Selected");
            return;
        }

        setStatus("Connecting to Agent...");
        axios.post('/api/agent-chat/start', { surveyId })
            .then(res => {
                setSessionId(res.data.sessionId);
                setStatus("Connected");
                // Agent Speaks First
                speakResponse(res.data.text);
            })
            .catch(err => {
                console.error("Start Call Error", err);
                setStatus("Connection Failed");
                speakResponse("I am sorry, I cannot connect right now.");
            });
    }, [surveyId]);

    const handleUserMessage = async (text) => {
        if (!sessionId) return;

        recognition.current.stop();
        setAgentState('thinking');
        setStatus("Thinking...");

        try {
            // Call our new backend endpoint
            const res = await axios.post('/api/agent-chat/chat', {
                sessionId,
                message: text
            });

            const agentResponse = res.data.text;
            speakResponse(agentResponse);

            if (res.data.isComplete) {
                setTimeout(onClose, 6000); // Close after saying goodbye
            }

        } catch (err) {
            console.error("Agent Error:", err);
            speakResponse("I'm having trouble connecting to the server.");
        }
    };

    const speakResponse = (text) => {
        setAgentState('speaking');
        setStatus("Speaking...");
        setCaption(text);
        setShowCaption(true);

        const u = new SpeechSynthesisUtterance(text);
        u.onend = () => {
            setAgentState('idle');
            setStatus("Listening...");
            setShowCaption(false);
            startListening(); // Turn-taking: start listening again
        };

        // Pick a nice voice
        const voices = synthesis.getVoices();
        const preferred = voices.find(v => v.name.includes('Google US English')) || voices[0];
        if (preferred) u.voice = preferred;

        synthesis.speak(u);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getAudioTracks().forEach(t => t.enabled = isMuted);
        }
    };

    return (
        <div className="video-agent-overlay">
            <div className="status-indicator">
                {status}
            </div>

            <div className="agent-stage">
                <div className={`agent-avatar-container ${agentState}`}>
                    {/* Video Avatar Logic */}
                    <video
                        key="agent-video"
                        src={agentState === 'speaking' ? "/agent_speaking.mp4" : "/agent_idle.mp4"}
                        poster={DEFAULT_AVATAR}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="agent-avatar-img"
                        onError={(e) => {
                            // Fallback to image if video is missing
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                        }}
                    />
                    <img
                        src={DEFAULT_AVATAR}
                        alt="AI Agent"
                        className="agent-avatar-img"
                        style={{ display: 'none' }} // Hidden by default, shown on video error
                    />
                </div>
            </div>

            <div className={`realtime-caption ${showCaption ? 'visible' : ''}`} style={{
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                maxWidth: '80%',
                margin: '0 auto',
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '1.2em',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                {caption}
            </div>

            <div className="user-feed">
                <video ref={videoRef} autoPlay muted playsInline className="user-video" />
            </div>

            <div className="controls-bar">
                <button className={`control-btn btn-mute ${isMuted ? 'muted' : ''}`} onClick={toggleMute}>
                    {isMuted ? '🔇' : '🎤'}
                </button>
                <button className="control-btn btn-end" onClick={onClose}>
                    📞
                </button>
            </div>
        </div>
    );
};

export default VideoAgentInterface;
