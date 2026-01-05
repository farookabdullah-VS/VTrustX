import React from 'react';
import { Copy, Mic } from 'lucide-react';

export function VoiceAgentSettings({ formId, form }) {
    const voiceUrl = `${window.location.origin}/s/voice/${formId}`;
    const isEnabled = form?.enableVoiceAgent;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(voiceUrl);
        alert("Voice Agent URL Copied!");
    };

    return (
        <div style={{ padding: '30px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                {!isEnabled && (
                    <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '15px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #fecaca' }}>
                        <strong>Note:</strong> Voice Agent is currently disabled. Go to <strong>Settings</strong> to enable it.
                    </div>
                )}
                <div style={{ width: '80px', height: '80px', background: isEnabled ? '#ecfdf5' : '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <Mic size={40} color={isEnabled ? "#059669" : "#94a3b8"} />
                </div>

                <h2 style={{ color: '#1e293b', marginBottom: '10px' }}>AI Voice Agent Survey</h2>
                <p style={{ color: '#64748b', marginBottom: '30px', maxWidth: '500px', margin: '0 auto 30px' }}>
                    Share this link to allow respondents to take the survey via an interactive Voice AI Agent.
                    The agent will ask questions verbally and intelligent transcribe and structure the answers.
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ padding: '12px 20px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace', color: '#334155', width: '100%', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {voiceUrl}
                    </div>
                    <button
                        onClick={copyToClipboard}
                        style={{ padding: '12px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Copy size={18} /> Copy Link
                    </button>
                </div>

                <div style={{ marginTop: '40px', padding: '20px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd', textAlign: 'left' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>How it works?</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#334155', lineHeight: '1.6' }}>
                        <li>The AI Agent greets the user and asks questions one by one.</li>
                        <li>Respondents answer naturally using their voice.</li>
                        <li><strong>Gemini AI</strong> processes the speech, extracts the relevant answer, and maps it to your survey fields.</li>
                        <li>Data is saved automatically to your Results dashboard.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
