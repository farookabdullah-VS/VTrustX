import React, { useEffect, useState } from 'react';
import { Serializer, QuestionRatingModel } from "survey-core";
import { ReactQuestionFactory } from "survey-react-ui";
import axios from 'axios';
import { AudioRecorder } from './AudioRecorder';
import { useToast } from './common/Toast';

// Helper for reactivity
const useQuestionValue = (question) => {
    const [value, setValue] = useState(question.value);
    useEffect(() => {
        if (!question) return;
        const handler = () => setValue(question.value);
        if (question && question.onValueChanged && typeof question.onValueChanged.add === 'function') {
            question.onValueChanged.add(handler);
        }
        return () => {
            if (question && question.onValueChanged && typeof question.onValueChanged.remove === 'function') {
                question.onValueChanged.remove(handler);
            }
        };
    }, [question]);
    return value;
};

const CustomRating = ({ question, colors, start, end }) => {
    const val = useQuestionValue(question);
    const range = [];
    for (let i = start; i <= end; i++) range.push(i);

    return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {range.map((num, idx) => {
                const isSelected = val == num;
                // Color logic: if selected, full color. If not, maybe lighter or grey?
                // User requirement: Gradient.
                // We show full colors always to show the scale, or just valid ones?
                // Usually rating scales show all buttons.
                const bg = colors[idx % colors.length];

                return (
                    <button
                        key={num}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            question.value = num;
                        }}
                        style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '50%', // Circle for better look? Or square with radius. User didn't specify. Round is standard for scores.
                            border: isSelected ? '4px solid #1e293b' : '2px solid transparent',
                            backgroundColor: bg,
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            cursor: 'pointer',
                            opacity: isSelected ? 1 : 0.85,
                            transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                        title={`${question.name} ${num}`}
                    >
                        {num}
                    </button>
                );
            })}
        </div>
    );
};

export const initCustomControls = () => {
    // Check if already registered
    if (Serializer.findClass("csat")) return;

    // CSAT: Red (1) -> Green (5)
    // We extend 'rating' to inherit logic (required/storage), but override rendering type
    Serializer.addClass("csat", [], undefined, "rating");

    ReactQuestionFactory.Instance.registerQuestion("csat", (props) => {
        return <CustomRating question={props.question} start={1} end={10} colors={['#ef4444','#f06b2e','#f19118','#f2ae0d','#eab308','#c9cc07','#a3d506','#7ede05','#4de704','#22c55e']} />;
    });

    // CES: Green (1) -> Red (5)
    Serializer.addClass("ces", [], undefined, "rating");

    ReactQuestionFactory.Instance.registerQuestion("ces", (props) => {
        return <CustomRating question={props.question} start={1} end={10} colors={['#22c55e','#4de704','#7ede05','#a3d506','#c9cc07','#eab308','#f2ae0d','#f19118','#f06b2e','#ef4444']} />;
    });

    // --- AUDIO RECORDER ---
    Serializer.addClass("audiorecorder", [], undefined, "question");

    // Wrapper Component
    const AudioWrapper = ({ question }) => {
        const toast = useToast();
        const handleRecordingComplete = (blob) => {
            const formData = new FormData();
            const filename = `audio_${Date.now()}.webm`;
            formData.append('file', blob, filename);

            axios.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            }).then(res => {
                const url = res.data.url;
                question.value = url;
            }).catch(err => {
                console.error("Audio Upload Failed:", err);
                toast.error("Failed to upload audio. Please try again.");
            });
        };

        return (
            <div>
                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                {question.value && (
                    <div style={{ marginTop: '10px', fontSize: '0.9em', color: '#059669' }}>
                        ✓ Audio saved
                    </div>
                )}
            </div>
        );
    };

    ReactQuestionFactory.Instance.registerQuestion("audiorecorder", (props) => {
        return <AudioWrapper question={props.question} />;
    });

    // --- AUTHENTICATOR ---
    Serializer.addClass("authenticator", [], undefined, "question");

    const AuthenticatorWrapper = ({ question }) => {
        const [password, setPassword] = useState('');
        const [error, setError] = useState(null);
        const [unlocked, setUnlocked] = useState(false);
        const correctPassword = question.survey?.jsonObj?.password; // Access password from survey definition

        const handleUnlock = (e) => {
            e.preventDefault();
            if (password === correctPassword) {
                setUnlocked(true);
                question.value = "Authenticated via Password"; // Store success
                setError(null);
            } else {
                setError("Incorrect Password");
            }
        };

        if (unlocked) {
            return (
                <div style={{ padding: '20px', background: '#ecfdf5', color: '#065f46', borderRadius: '8px', textAlign: 'center' }}>
                    <strong>✓ Authenticated</strong>
                    <div style={{ fontSize: '0.9em' }}>You may proceed with the survey.</div>
                </div>
            );
        }

        return (
            <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ marginBottom: '15px', color: '#64748b' }}>
                    {question.title || "This section is password protected."}
                </div>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Password"
                    style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '10px' }}
                />
                {error && <div style={{ color: '#ef4444', marginBottom: '10px', fontSize: '0.9em' }}>{error}</div>}
                <button
                    onClick={handleUnlock}
                    style={{ background: '#0f172a', color: 'white', padding: '10px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                    Unlock
                </button>
            </div>
        );
    };

    ReactQuestionFactory.Instance.registerQuestion("authenticator", (props) => {
        return <AuthenticatorWrapper question={props.question} />;
    });
};
