import React, { useState, useRef } from 'react';

export function AudioRecorder({ onRecordingComplete }) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioUrl, setAudioUrl] = useState(null);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioUrl(audioUrl);
                setAudioBlob(audioBlob);
                audioChunksRef.current = [];

                // Stop tracks to release mic
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const resetRecording = () => {
        setAudioUrl(null);
        setAudioBlob(null);
        setDuration(0);
    };

    const handleUseRecording = () => {
        if (audioBlob && onRecordingComplete) {
            onRecordingComplete(audioBlob);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <h4 style={{ margin: 0, color: '#475569' }}>🎙️ Record Audio Response</h4>

            {!audioUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    {!isRecording ? (
                        <button
                            onClick={startRecording}
                            style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ef4444', border: '4px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5em', color: 'white', transition: 'transform 0.1s' }}
                            title="Start Recording"
                        >
                            🎤
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#ef4444', animation: 'pulse 1.5s infinite' }}>{formatTime(duration)}</div>
                            <button
                                onClick={stopRecording}
                                style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#3b82f6', border: '4px solid #bfdbfe', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5em', color: 'white' }}
                                title="Stop Recording"
                            >
                                ⏹️
                            </button>
                            <div style={{ fontSize: '0.8em', color: '#64748b' }}>Recording...</div>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                    <audio src={audioUrl} controls style={{ width: '100%', maxWidth: '400px' }} />
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={resetRecording}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', color: '#475569', cursor: 'pointer' }}
                        >
                            Discard &amp; Retake
                        </button>
                        <button
                            onClick={handleUseRecording}
                            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#22c55e', color: 'white', cursor: 'pointer', fontWeight: '600' }}
                        >
                            <span style={{ marginRight: '5px' }}>✓</span> Attach to Survey
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
