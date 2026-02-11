import React, { useState } from 'react';
import axios from 'axios';
import { X, Sparkles, Loader2, Upload, Globe, User, ShoppingCart, Laptop, HeartPulse, Landmark, Briefcase, GraduationCap, ChevronRight, Check, Eye } from 'lucide-react';

const PRESETS = [
    { id: 'ecommerce', label: 'E-commerce Shopper', icon: ShoppingCart, desc: 'Online retail customer who browses and buys products', color: '#f59e0b' },
    { id: 'saas', label: 'SaaS User', icon: Laptop, desc: 'Software-as-a-service power user or decision maker', color: '#3b82f6' },
    { id: 'healthcare', label: 'Healthcare Patient', icon: HeartPulse, desc: 'Patient navigating healthcare services', color: '#ef4444' },
    { id: 'banking', label: 'Banking Customer', icon: Landmark, desc: 'Financial services and banking customer', color: '#10b981' },
    { id: 'b2b', label: 'B2B Decision Maker', icon: Briefcase, desc: 'Enterprise buyer evaluating solutions', color: '#8b5cf6' },
    { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Student or learner in educational context', color: '#ec4899' },
];

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'Arabic' },
    { code: 'es', label: 'Spanish' },
    { code: 'fr', label: 'French' },
    { code: 'de', label: 'German' },
    { code: 'zh', label: 'Chinese' },
    { code: 'ja', label: 'Japanese' },
    { code: 'hi', label: 'Hindi' },
    { code: 'pt', label: 'Portuguese' },
];

export function AIPersonaGenerator({ isOpen, onClose, onGenerate }) {
    const [step, setStep] = useState('input'); // input | generating | preview
    const [description, setDescription] = useState('');
    const [language, setLanguage] = useState('en');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [generatedData, setGeneratedData] = useState(null);
    const [selectedPreset, setSelectedPreset] = useState(null);

    if (!isOpen) return null;

    const applyPreset = (preset) => {
        setSelectedPreset(preset.id);
        const presetDescs = {
            ecommerce: 'Create a persona for an online e-commerce shopper. Include their shopping habits, preferred devices, pain points with online shopping, and what motivates them to purchase. Consider their age range 25-40, tech-savvy, values convenience and fast delivery.',
            saas: 'Create a persona for a SaaS product user who is a mid-level professional. Include their daily workflow, software tools they use, frustrations with current solutions, and goals for productivity improvement. Consider them being 30-45, working in a tech company.',
            healthcare: 'Create a persona for a healthcare patient navigating medical services. Include their health concerns, experience with healthcare providers, frustrations with the system, and what they value in healthcare. Consider them being 35-60, managing a chronic condition.',
            banking: 'Create a persona for a banking and financial services customer. Include their financial goals, banking habits, frustrations with traditional banking, and interest in digital financial tools. Consider them being 28-45, middle-income professional.',
            b2b: 'Create a persona for a B2B enterprise decision maker evaluating software solutions. Include their business challenges, decision-making criteria, stakeholders involved, and what drives their purchasing decisions. Consider them being a VP or Director level, 35-50.',
            student: 'Create a persona for a university student or online learner. Include their learning goals, challenges with education, preferred learning methods, and technology usage. Consider them being 18-25, digitally native, budget-conscious.',
        };
        setDescription(presetDescs[preset.id] || '');
    };

    const handleGenerate = async () => {
        if (!description.trim()) return;

        setLoading(true);
        setError(null);
        setStep('generating');

        const langName = LANGUAGES.find(l => l.code === language)?.label || 'English';

        const prompt = `You are a UX research expert. Generate a complete, detailed customer persona based on this description:

"${description}"

Language: ${langName}

Return a valid JSON object (no markdown, no code fences, just pure JSON) with this exact structure:
{
  "name": "Full Name",
  "title": "Job Title / Role",
  "persona_type": "Rational",
  "sections": [
    {
      "id": "header_1",
      "type": "header",
      "title": "Identity",
      "icon": "user",
      "style": { "backgroundColor": "#FFFFFF", "padding": "0" },
      "data": {
        "name": "Person Name",
        "role": "Their Role",
        "marketSize": 45,
        "type": "Rational",
        "description": "Brief bio sentence"
      },
      "layout": { "i": "header_1", "x": 0, "y": 0, "w": 12, "h": 6 }
    },
    {
      "id": "goals_1",
      "type": "list",
      "title": "Goals",
      "icon": "target",
      "style": { "borderLeft": "4px solid #10B981", "backgroundColor": "#F9FAFB" },
      "data": ["Goal 1", "Goal 2", "Goal 3", "Goal 4"],
      "layout": { "i": "goals_1", "x": 0, "y": 6, "w": 6, "h": 5 }
    },
    {
      "id": "frustrations_1",
      "type": "list",
      "title": "Frustrations",
      "icon": "alert-circle",
      "style": { "borderLeft": "4px solid #EF4444", "backgroundColor": "#FEF2F2" },
      "data": ["Frustration 1", "Frustration 2", "Frustration 3"],
      "layout": { "i": "frustrations_1", "x": 6, "y": 6, "w": 6, "h": 5 }
    },
    {
      "id": "motivations_1",
      "type": "list",
      "title": "Motivations",
      "icon": "zap",
      "style": { "borderLeft": "4px solid #10B981", "backgroundColor": "#F0FDF4" },
      "data": ["Motivation 1", "Motivation 2", "Motivation 3"],
      "layout": { "i": "motivations_1", "x": 0, "y": 11, "w": 6, "h": 5 }
    },
    {
      "id": "quote_1",
      "type": "quote",
      "title": "Quote",
      "icon": "quote",
      "style": { "backgroundColor": "#FFFFFF", "fontStyle": "italic" },
      "content": "\\"A realistic quote from this persona\\"",
      "layout": { "i": "quote_1", "x": 6, "y": 11, "w": 6, "h": 3 }
    },
    {
      "id": "challenges_1",
      "type": "text",
      "title": "Challenges",
      "icon": "shield",
      "style": { "borderTop": "3px solid #10B981", "backgroundColor": "#F9FAFB" },
      "content": "A paragraph about their main challenges",
      "layout": { "i": "challenges_1", "x": 6, "y": 14, "w": 6, "h": 4 }
    },
    {
      "id": "context_1",
      "type": "text",
      "title": "Context",
      "icon": "map-pin",
      "style": { "backgroundColor": "#FFFFFF" },
      "content": "Their work/life context description",
      "layout": { "i": "context_1", "x": 0, "y": 16, "w": 6, "h": 4 }
    },
    {
      "id": "demographic_1",
      "type": "demographic",
      "title": "Demographic",
      "icon": "user",
      "style": { "backgroundColor": "#FFFFFF" },
      "data": [
        { "label": "Gender", "value": "Male/Female", "icon": "user", "isComposite": true, "gender": "Male", "age": 32 },
        { "label": "Location", "value": "City, Country", "icon": "map-pin" },
        { "label": "Occupation", "value": "Job Title", "icon": "briefcase" },
        { "label": "Education", "value": "Degree Level", "icon": "graduation-cap" },
        { "label": "Income", "value": "Range", "icon": "dollar" }
      ],
      "layout": { "i": "demographic_1", "x": 6, "y": 18, "w": 6, "h": 6 }
    },
    {
      "id": "skills_1",
      "type": "skills",
      "title": "Skills",
      "icon": "sliders",
      "style": { "backgroundColor": "#FFFFFF" },
      "data": [
        { "id": "s1", "label": "Skill Name 1", "value": 75 },
        { "id": "s2", "label": "Skill Name 2", "value": 60 },
        { "id": "s3", "label": "Skill Name 3", "value": 45 }
      ],
      "layout": { "i": "skills_1", "x": 0, "y": 20, "w": 6, "h": 6 }
    },
    {
      "id": "channels_1",
      "type": "channels",
      "title": "Channels",
      "icon": "smartphone",
      "style": { "backgroundColor": "#FFFFFF" },
      "data": [
        { "id": "smartphone", "label": "Smartphone" },
        { "id": "laptop", "label": "Laptop" },
        { "id": "email", "label": "Email" }
      ],
      "layout": { "i": "channels_1", "x": 0, "y": 26, "w": 6, "h": 5 }
    },
    {
      "id": "touchpoints_1",
      "type": "touchpoints",
      "title": "Touchpoints",
      "icon": "mouse-pointer",
      "style": { "backgroundColor": "#FFFFFF" },
      "data": [
        { "id": "t1", "label": "Touchpoint 1", "color": "#FDBA74", "icon": "zap" },
        { "id": "t2", "label": "Touchpoint 2", "color": "#FCD34D", "icon": "search" },
        { "id": "t3", "label": "Touchpoint 3", "color": "#2DD4BF", "icon": "mouse-pointer" }
      ],
      "layout": { "i": "touchpoints_1", "x": 6, "y": 24, "w": 6, "h": 5 }
    }
  ]
}

Make the persona realistic, detailed, and relevant to the description. Choose an appropriate personality type from: Rational, Idealist, Artisan, Guardian. Generate 3-5 items for each list section. Make the quote authentic and emotional. All content must be in ${langName}.`;

        try {
            const res = await axios.post('/api/ai/generate', { prompt });
            let text = res.data.text || res.data.definition || '';

            // Clean up any markdown code fences
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            const parsed = JSON.parse(text);
            setGeneratedData(parsed);
            setStep('preview');
        } catch (e) {
            console.error('AI Generation error:', e);
            if (e instanceof SyntaxError) {
                setError('AI returned an invalid response. Please try again.');
            } else {
                setError(e.response?.data?.error || e.message || 'Failed to generate persona. Please try again.');
            }
            setStep('input');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        if (generatedData && onGenerate) {
            onGenerate(generatedData);
        }
    };

    const handleClose = () => {
        setStep('input');
        setDescription('');
        setGeneratedData(null);
        setError(null);
        setSelectedPreset(null);
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, fontFamily: "'Inter', sans-serif"
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', width: '900px', maxWidth: '95%',
                maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 32px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Sparkles size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '800', color: '#0f172a' }}>
                                AI Persona Generator
                            </h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                                Describe your persona and let AI build it
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', padding: '8px', borderRadius: '8px'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    {step === 'input' && (
                        <>
                            {/* Presets */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '12px' }}>
                                    Quick Presets
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                    {PRESETS.map(preset => {
                                        const Icon = preset.icon;
                                        const isActive = selectedPreset === preset.id;
                                        return (
                                            <div
                                                key={preset.id}
                                                onClick={() => applyPreset(preset)}
                                                style={{
                                                    padding: '14px', borderRadius: '12px', cursor: 'pointer',
                                                    border: isActive ? `2px solid ${preset.color}` : '1px solid #e2e8f0',
                                                    background: isActive ? `${preset.color}08` : 'white',
                                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px'
                                                }}
                                            >
                                                <div style={{
                                                    width: '36px', height: '36px', borderRadius: '10px',
                                                    background: `${preset.color}15`, color: preset.color,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <Icon size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>{preset.label}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{preset.desc}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Description */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                                    Describe Your Persona
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Describe the persona you want to create. Include details about their role, industry, demographics, behaviors, goals, and pain points..."
                                    style={{
                                        width: '100%', minHeight: '140px', padding: '16px', borderRadius: '12px',
                                        border: '1px solid #e2e8f0', fontSize: '0.95rem', fontFamily: 'inherit',
                                        resize: 'vertical', outline: 'none', lineHeight: '1.6',
                                        boxSizing: 'border-box'
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#10b981'}
                                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>

                            {/* Language Selector */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                                    <Globe size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    Language
                                </label>
                                <select
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    style={{
                                        padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                        fontSize: '0.9rem', outline: 'none', cursor: 'pointer', minWidth: '200px'
                                    }}
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.code} value={l.code}>{l.label}</option>
                                    ))}
                                </select>
                            </div>

                            {error && (
                                <div style={{
                                    padding: '12px 16px', borderRadius: '8px', background: '#fef2f2',
                                    color: '#b91c1c', fontSize: '0.85rem', marginBottom: '20px'
                                }}>
                                    {error}
                                </div>
                            )}
                        </>
                    )}

                    {step === 'generating' && (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: '60px 20px', gap: '20px'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                animation: 'pulse 2s ease-in-out infinite'
                            }}>
                                <Loader2 size={32} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ margin: '0 0 8px 0', color: '#0f172a', fontWeight: '700' }}>Generating Your Persona</h3>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                    AI is crafting a detailed persona based on your description...
                                </p>
                            </div>
                            <style>{`
                                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                            `}</style>
                        </div>
                    )}

                    {step === 'preview' && generatedData && (
                        <div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px',
                                padding: '12px 16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0'
                            }}>
                                <Check size={18} color="#16a34a" />
                                <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '600' }}>
                                    Persona generated successfully! Review and create.
                                </span>
                            </div>

                            {/* Preview Card */}
                            <div style={{
                                background: '#f8fafc', borderRadius: '16px', padding: '24px',
                                border: '1px solid #e2e8f0'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                    <div style={{
                                        width: '56px', height: '56px', borderRadius: '50%',
                                        background: '#60A5FA', display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '24px', color: 'white', fontWeight: 'bold'
                                    }}>
                                        {(generatedData.name || 'P')[0]}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: '#0f172a' }}>
                                            {generatedData.name || 'Generated Persona'}
                                        </h3>
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                            {generatedData.title || 'User'}
                                        </p>
                                    </div>
                                </div>

                                {/* Section summary */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {(generatedData.sections || []).map(s => (
                                        <div key={s.id} style={{
                                            padding: '10px 12px', background: 'white', borderRadius: '8px',
                                            border: '1px solid #e2e8f0', fontSize: '0.8rem'
                                        }}>
                                            <div style={{ fontWeight: '600', color: '#374151', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.7rem' }}>
                                                {s.title}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                                {s.type === 'list' && Array.isArray(s.data) ? `${s.data.length} items` : ''}
                                                {s.type === 'text' || s.type === 'quote' ? (s.content || '').substring(0, 50) + '...' : ''}
                                                {s.type === 'header' ? `${s.data?.name || ''} - ${s.data?.role || ''}` : ''}
                                                {s.type === 'demographic' && Array.isArray(s.data) ? `${s.data.length} fields` : ''}
                                                {s.type === 'skills' && Array.isArray(s.data) ? `${s.data.length} skills` : ''}
                                                {s.type === 'channels' && Array.isArray(s.data) ? `${s.data.length} channels` : ''}
                                                {s.type === 'touchpoints' && Array.isArray(s.data) ? `${s.data.length} touchpoints` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px 32px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <button onClick={handleClose} style={{
                        padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
                    }}>
                        Cancel
                    </button>

                    {step === 'input' && (
                        <button
                            onClick={handleGenerate}
                            disabled={!description.trim() || loading}
                            style={{
                                padding: '10px 24px', borderRadius: '10px', border: 'none',
                                background: description.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                                color: description.trim() ? 'white' : '#94a3b8',
                                cursor: description.trim() ? 'pointer' : 'not-allowed',
                                fontWeight: '700', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: description.trim() ? '0 4px 6px rgba(16, 185, 129, 0.3)' : 'none'
                            }}
                        >
                            <Sparkles size={16} /> Generate Persona
                        </button>
                    )}

                    {step === 'preview' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => { setStep('input'); setGeneratedData(null); }}
                                style={{
                                    padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                                    background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem'
                                }}
                            >
                                Regenerate
                            </button>
                            <button
                                onClick={handleCreate}
                                style={{
                                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                    color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.3)'
                                }}
                            >
                                <Check size={16} /> Create Persona
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
