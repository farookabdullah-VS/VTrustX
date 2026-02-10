import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, X, Loader2, Map, Wand2 } from 'lucide-react';

const PRESETS = [
    { label: 'E-commerce Purchase', prompt: 'Create a customer journey map for an e-commerce purchase experience, from product discovery to post-purchase support. Include stages: Awareness, Research, Evaluation, Purchase, Delivery, Post-Purchase. Add sections for customer goals, actions, touchpoints, emotions, pain points, and opportunities.' },
    { label: 'SaaS Onboarding', prompt: 'Create a customer journey map for SaaS product onboarding, from initial sign-up to becoming an active user. Include stages: Sign-Up, Welcome, Setup, First Value, Regular Use, Advocacy. Add sections for goals, actions, touchpoints, sentiment, barriers, and opportunities.' },
    { label: 'Customer Support', prompt: 'Create a customer journey map for a customer support experience, from issue discovery to resolution. Include stages: Issue Discovery, Contact Support, Waiting, Resolution, Follow-Up. Add sections for customer emotions, actions, channels, pain points, and improvement opportunities.' },
    { label: 'Healthcare Patient', prompt: 'Create a patient journey map for a healthcare visit, from symptom onset to recovery. Include stages: Symptom Onset, Research, Appointment Booking, Visit, Diagnosis, Treatment, Follow-Up. Add sections for patient goals, emotions, touchpoints, pain points, and frontstage/backstage actions.' },
    { label: 'Banking / Fintech', prompt: 'Create a customer journey map for opening a bank account online. Include stages: Need Recognition, Research, Application, Verification, Account Setup, First Transaction, Ongoing Use. Add sections for goals, actions, channels, sentiment, barriers, and motivators.' }
];

const CJM_GENERATION_PROMPT = `You are a Customer Journey Map expert. Generate a complete journey map as a JSON object.

The JSON must have this exact structure:
{
  "project_name": "Journey Map Title",
  "stages": [
    { "id": "st_1", "name": "Stage Name", "style": { "bg_color": "#hex", "text_color": "#000000" } }
  ],
  "sections": [
    {
      "id": "sec_1",
      "type": "text|goals|think_feel|sentiment_graph|touchpoints|pain_point|opportunity|actions|barriers|motivators|channels|frontstage|backstage|kpi",
      "title": "Section Title",
      "cells": {
        "st_1": { "value": "cell content text" }
      }
    }
  ]
}

Section type rules:
- "text": cells have { "value": "text" }
- "goals": cells have { "items": ["goal1", "goal2"] }
- "think_feel": cells have { "thought": "customer quote", "feeling": "description" }
- "sentiment_graph": cells have { "value": -5 to 5 (integer), "note": "why" }
- "touchpoints": cells have { "items": [{ "label": "touchpoint name", "color": "#hex" }] }
- "pain_point": cells have { "value": "description", "severity": 1-5 }
- "opportunity": cells have { "value": "description", "impact": 1-5 }
- "actions": cells have { "items": [{ "text": "action", "assignee": "", "done": false }] }
- "barriers": cells have { "items": [{ "text": "barrier", "severity": "low|medium|high" }] }
- "motivators": cells have { "items": [{ "text": "motivator", "strength": 1-5 }] }
- "channels": cells have { "channels": [{ "id": "web|mobile|email|phone|chat|social|store|sms", "label": "Label" }] }
- "frontstage": cells have { "items": ["visible action 1"] }
- "backstage": cells have { "items": ["internal process 1"] }
- "kpi": cells have { "value": "85%", "label": "Metric Name", "trend": "up|flat|down" }

Use varied stage colors. Generate realistic, detailed content for every cell in every stage. Include at least 6-8 sections.

Return ONLY valid JSON, no markdown, no explanation.

User request: `;

export function AIMapGenerator({ onGenerate, onClose }) {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const generate = async (inputPrompt) => {
        const finalPrompt = inputPrompt || prompt;
        if (!finalPrompt.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await axios.post('/api/ai/generate', {
                prompt: CJM_GENERATION_PROMPT + finalPrompt
            });

            let text = res.data.text || res.data.definition || '';
            if (typeof text !== 'string') text = JSON.stringify(text);

            // Extract JSON from response
            let jsonStr = text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonStr = jsonMatch[0];

            const mapData = JSON.parse(jsonStr);

            // Validate structure
            if (!mapData.stages || !mapData.sections) {
                throw new Error('Invalid map structure returned');
            }

            // Ensure IDs exist
            mapData.stages = mapData.stages.map((s, i) => ({
                ...s,
                id: s.id || `st_${i + 1}`,
                style: s.style || { bg_color: '#f8fafc', text_color: '#000000' }
            }));
            mapData.sections = mapData.sections.map((s, i) => ({
                ...s,
                id: s.id || `sec_${i + 1}`,
                cells: s.cells || {}
            }));

            onGenerate(mapData);
        } catch (e) {
            console.error('AI Map Generation Error:', e);
            setError(e.message || 'Failed to generate map. Try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '560px', maxHeight: '80vh',
                overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', padding: '28px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
                        <Wand2 size={22} style={{ color: '#8b5cf6' }} /> AI Journey Map Generator
                    </h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                </div>

                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0' }}>
                    Describe your customer journey and AI will generate a complete map with stages, sections, and content.
                </p>

                {/* Preset buttons */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Quick Presets</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => { setPrompt(p.prompt); generate(p.prompt); }}
                                disabled={loading}
                                style={{
                                    padding: '6px 12px', borderRadius: '16px', border: '1px solid #e2e8f0',
                                    background: '#f8fafc', cursor: loading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.8rem', color: '#334155', fontWeight: 500,
                                    transition: 'all 0.15s'
                                }}
                                onMouseOver={e => { e.target.style.borderColor = '#8b5cf6'; e.target.style.color = '#7c3aed'; }}
                                onMouseOut={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#334155'; }}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Custom prompt */}
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Or Describe Your Journey</div>
                    <textarea
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g., Create a journey map for a hotel guest experience from booking to checkout, including digital and physical touchpoints..."
                        rows={4}
                        style={{
                            width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px',
                            fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                            boxSizing: 'border-box'
                        }}
                        onFocus={e => e.target.style.borderColor = '#8b5cf6'}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                </div>

                {error && (
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
                        background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.85rem'
                    }}>
                        {error}
                    </div>
                )}

                {loading && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                        padding: '20px', color: '#8b5cf6', fontSize: '0.9rem'
                    }}>
                        <Loader2 size={20} className="ai-spinner" />
                        Generating your journey map... This may take a moment.
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={loading} style={{
                        padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                        background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem'
                    }}>Cancel</button>
                    <button
                        onClick={() => generate()}
                        disabled={loading || !prompt.trim()}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: loading || !prompt.trim() ? '#cbd5e1' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: 'white', cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Sparkles size={16} />
                        {loading ? 'Generating...' : 'Generate Map'}
                    </button>
                </div>
            </div>
        </div>
    );
}
