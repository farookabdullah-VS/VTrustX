import React, { useState, useEffect } from 'react';
import axios from 'axios';
import VideoAgentInterface from './VideoAgentInterface';
import { Video, Play } from 'lucide-react';

export function AIVideoAgentPage() {
    const [forms, setForms] = useState([]);
    const [selectedFormId, setSelectedFormId] = useState('');
    const [isSessionActive, setIsSessionActive] = useState(false);

    useEffect(() => {
        axios.get('/api/forms').then(res => setForms(res.data)).catch(console.error);
    }, []);

    const startSession = () => {
        if (!selectedFormId) return alert("Please select a survey.");
        setIsSessionActive(true);
    };

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            {!isSessionActive ? (
                <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', background: '#e0f2fe', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                        color: '#0284c7'
                    }}>
                        <Video size={40} />
                    </div>
                    <h1 style={{ color: '#0f172a', marginBottom: '10px' }}>AI Video Agent Survey</h1>
                    <p style={{ color: '#64748b', marginBottom: '40px' }}>
                        Connect with our AI Video Agent for a face-to-face interview experience.
                        The agent will conduct the survey verbally and visually.
                    </p>

                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'left' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#334155' }}>Select Survey Campaign</label>
                        <select
                            value={selectedFormId}
                            onChange={e => setSelectedFormId(e.target.value)}
                            style={{
                                width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
                                marginBottom: '20px', fontSize: '16px'
                            }}
                        >
                            <option value="">-- Choose Survey --</option>
                            {forms.map(f => (
                                <option key={f.id} value={f.id}>{f.title}</option>
                            ))}
                        </select>

                        <button
                            onClick={startSession}
                            disabled={!selectedFormId}
                            style={{
                                width: '100%', padding: '16px', background: selectedFormId ? '#0284c7' : '#94a3b8',
                                color: 'white', border: 'none', borderRadius: '8px',
                                fontWeight: '700', fontSize: '18px', cursor: selectedFormId ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                transition: 'background 0.2s'
                            }}
                        >
                            <Play size={24} fill="white" /> Start Video Interview
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'black' }}>
                    <VideoAgentInterface surveyId={selectedFormId} onClose={() => setIsSessionActive(false)} />
                </div>
            )}
        </div>
    );
}
