import React, { useState } from 'react';
import axios from 'axios';
import { X, Sparkles, Loader2, Camera, Palette, User, Upload, Check } from 'lucide-react';

const AVATAR_STYLES = [
    { id: 'professional', label: 'Professional Headshot', desc: 'Clean corporate headshot', colors: ['#3b82f6', '#1d4ed8'] },
    { id: 'creative', label: 'Creative / Illustration', desc: 'Artistic illustrated style', colors: ['#ec4899', '#be185d'] },
    { id: 'minimal', label: 'Minimalist', desc: 'Clean minimal avatar', colors: ['#6366f1', '#4338ca'] },
    { id: 'warm', label: 'Warm & Friendly', desc: 'Approachable warm tones', colors: ['#f59e0b', '#d97706'] },
    { id: 'tech', label: 'Tech Professional', desc: 'Modern tech aesthetic', colors: ['#10b981', '#059669'] },
];

const GRADIENT_PALETTES = {
    professional: ['#1e3a5f', '#2563eb', '#3b82f6', '#60a5fa'],
    creative: ['#9333ea', '#c026d3', '#ec4899', '#f472b6'],
    minimal: ['#334155', '#475569', '#64748b', '#94a3b8'],
    warm: ['#b45309', '#d97706', '#f59e0b', '#fbbf24'],
    tech: ['#064e3b', '#059669', '#10b981', '#34d399'],
};

export function AIPhotoGenerator({ isOpen, onClose, personaData, onApply }) {
    const [selectedStyle, setSelectedStyle] = useState('professional');
    const [customDesc, setCustomDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedAvatar, setGeneratedAvatar] = useState(null);

    if (!isOpen) return null;

    const getPersonaInitials = () => {
        const name = personaData?.name || 'P';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const generateAvatar = async () => {
        setLoading(true);

        const prompt = `You are generating a visual description for a persona avatar. Based on the following persona details, generate a JSON object for a styled avatar.

Persona: ${personaData?.name || 'Unknown'}
Role: ${personaData?.role || 'Unknown'}
Style: ${selectedStyle}
${customDesc ? `Additional context: ${customDesc}` : ''}

Return a JSON object (no markdown, no code fences) with:
{
  "gradientStart": "#hex color for gradient start",
  "gradientEnd": "#hex color for gradient end",
  "accentColor": "#hex color for accent/border",
  "emoji": "single emoji representing this persona",
  "bgPattern": "one of: circles, dots, waves, none",
  "textColor": "#hex color for initials text"
}

Choose colors that match the ${selectedStyle} style and the persona's role/industry.`;

        try {
            const res = await axios.post('/api/ai/generate', { prompt });
            let text = res.data.text || res.data.definition || '';
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(text);
            setGeneratedAvatar(parsed);
        } catch (e) {
            // Fallback to preset colors
            const palette = GRADIENT_PALETTES[selectedStyle] || GRADIENT_PALETTES.professional;
            setGeneratedAvatar({
                gradientStart: palette[0],
                gradientEnd: palette[2],
                accentColor: palette[1],
                emoji: '👤',
                bgPattern: 'none',
                textColor: '#ffffff'
            });
        } finally {
            setLoading(false);
        }
    };

    const buildSVGDataUrl = () => {
        if (!generatedAvatar) return null;
        const { gradientStart, gradientEnd, accentColor, emoji, bgPattern, textColor } = generatedAvatar;
        const initials = getPersonaInitials();

        let patternSvg = '';
        if (bgPattern === 'circles') {
            patternSvg = `<circle cx="20" cy="20" r="15" fill="${accentColor}" opacity="0.1"/>
            <circle cx="80" cy="80" r="25" fill="${accentColor}" opacity="0.08"/>
            <circle cx="60" cy="30" r="10" fill="${accentColor}" opacity="0.12"/>`;
        } else if (bgPattern === 'dots') {
            let dots = '';
            for (let x = 10; x < 100; x += 15) {
                for (let y = 10; y < 100; y += 15) {
                    dots += `<circle cx="${x}" cy="${y}" r="1.5" fill="${accentColor}" opacity="0.15"/>`;
                }
            }
            patternSvg = dots;
        } else if (bgPattern === 'waves') {
            patternSvg = `<path d="M0,60 Q25,45 50,60 T100,60" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.15"/>
            <path d="M0,70 Q25,55 50,70 T100,70" fill="none" stroke="${accentColor}" stroke-width="1" opacity="0.1"/>`;
        }

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${gradientStart}"/><stop offset="100%" style="stop-color:${gradientEnd}"/></linearGradient></defs>
            <rect width="100" height="100" rx="50" fill="url(#bg)"/>
            ${patternSvg}
            <text x="50" y="55" text-anchor="middle" dominant-baseline="middle" fill="${textColor}" font-size="32" font-weight="bold" font-family="Outfit,system-ui,sans-serif">${initials}</text>
        </svg>`;

        return `data:image/svg+xml;base64,${btoa(svg)}`;
    };

    const handleApply = () => {
        if (generatedAvatar && onApply) {
            onApply(generatedAvatar);
        }
        onClose();
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, fontFamily: "'Outfit', sans-serif"
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', width: '550px', maxWidth: '95%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 28px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Camera size={20} color="#7c3aed" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>
                            AI Avatar Styler
                        </h3>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8'
                    }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px 28px' }}>
                    {/* Preview */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', marginBottom: '24px'
                    }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '50%',
                            overflow: 'hidden', border: '4px solid #e2e8f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: generatedAvatar
                                ? `linear-gradient(135deg, ${generatedAvatar.gradientStart}, ${generatedAvatar.gradientEnd})`
                                : '#f1f5f9',
                            position: 'relative'
                        }}>
                            {generatedAvatar ? (
                                <span style={{
                                    fontSize: '40px', fontWeight: 'bold',
                                    color: generatedAvatar.textColor || 'white'
                                }}>
                                    {getPersonaInitials()}
                                </span>
                            ) : (
                                <User size={48} color="#cbd5e1" />
                            )}
                        </div>
                    </div>

                    {/* Style Selector */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '10px' }}>
                            <Palette size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                            Style
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {AVATAR_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style.id)}
                                    style={{
                                        padding: '8px 14px', borderRadius: '8px',
                                        border: selectedStyle === style.id ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                                        background: selectedStyle === style.id ? '#f5f3ff' : 'white',
                                        color: '#475569', fontSize: '0.82rem', fontWeight: '500',
                                        cursor: 'pointer', transition: 'all 0.15s'
                                    }}
                                >
                                    {style.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom description */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                            Additional Details (optional)
                        </label>
                        <input
                            value={customDesc}
                            onChange={e => setCustomDesc(e.target.value)}
                            placeholder="e.g., corporate look, tech startup vibe, creative industry..."
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid #e2e8f0', fontSize: '0.85rem', outline: 'none',
                                boxSizing: 'border-box'
                            }}
                            onFocus={e => e.target.style.borderColor = '#7c3aed'}
                            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 28px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between'
                }}>
                    <button onClick={onClose} style={{
                        padding: '10px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
                        background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
                    }}>
                        Cancel
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={generateAvatar}
                            disabled={loading}
                            style={{
                                padding: '10px 18px', borderRadius: '10px', border: 'none',
                                background: '#7c3aed', color: 'white',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: '700', fontSize: '0.85rem',
                                display: 'flex', alignItems: 'center', gap: '6px',
                                opacity: loading ? 0.7 : 1
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating...
                                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                                </>
                            ) : (
                                <><Sparkles size={15} /> Generate</>
                            )}
                        </button>
                        {generatedAvatar && (
                            <button
                                onClick={handleApply}
                                style={{
                                    padding: '10px 18px', borderRadius: '10px', border: 'none',
                                    background: '#10b981', color: 'white', cursor: 'pointer',
                                    fontWeight: '700', fontSize: '0.85rem',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Check size={15} /> Apply
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
