import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';

const DEFAULT_THEME = {
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderRadius: '12px',
    fontFamily: "'Outfit', sans-serif"
};

const THEME_TEMPLATES = [
    {
        id: 'default',
        name: 'Default Slate',
        colors: {
            primaryColor: '#0f172a',
            secondaryColor: '#64748b',
            backgroundColor: '#ffffff',
            textColor: '#0f172a',
            borderRadius: '12px',
        }
    },
    {
        id: 'midnight',
        name: 'Midnight Blue',
        colors: {
            primaryColor: '#1e3a8a',
            secondaryColor: '#60a5fa',
            backgroundColor: '#f1f5f9',
            textColor: '#172554',
            borderRadius: '8px',
        }
    },
    {
        id: 'forest',
        name: 'Forest Green',
        colors: {
            primaryColor: '#065f46',
            secondaryColor: '#34d399',
            backgroundColor: '#f0fdf4',
            textColor: '#064e3b',
            borderRadius: '16px',
        }
    },
    {
        id: 'sunset',
        name: 'Sunset Orange',
        colors: {
            primaryColor: '#ea580c',
            secondaryColor: '#fb923c',
            backgroundColor: '#fff7ed',
            textColor: '#7c2d12',
            borderRadius: '24px',
        }
    },
    {
        id: 'corporate',
        name: 'Classic Corporate',
        colors: {
            primaryColor: '#2563eb',
            secondaryColor: '#93c5fd',
            backgroundColor: '#ffffff',
            textColor: '#333333',
            borderRadius: '4px',
        }
    },
    {
        id: 'crimson',
        name: 'Crimson Dynasty',
        colors: {
            primaryColor: '#b91c1c',
            secondaryColor: '#fca5a5',
            backgroundColor: '#fff1f2',
            textColor: '#450a0a',
            borderRadius: '0px',
        }
    }
];

export function ThemeSettings() {
    const toast = useToast();
    const [theme, setTheme] = useState(DEFAULT_THEME);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/settings/theme')
            .then(res => {
                if (res.data && Object.keys(res.data).length > 0) {
                    setTheme({ ...DEFAULT_THEME, ...res.data });
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleChange = (key, value) => {
        setTheme(prev => ({ ...prev, [key]: value }));
    };

    const applyTemplate = (template) => {
        if (confirm(`Apply ${template.name} theme? This will overwrite current changes.`)) {
            setTheme(prev => ({ ...prev, ...template.colors }));
        }
    };

    const handleSave = () => {
        axios.post('/api/settings/theme', theme)
            .then(() => {
                toast.success("Theme saved successfully! Please refresh to see changes.");
                // Optionally trigger a global theme update here if we had detailed context
            })
            .catch(err => toast.error("Error saving theme: " + err.message));
    };

    const ColorInput = ({ label, value, onChange }) => (
        <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>{label}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        width: '50px', height: '40px', padding: '0', border: 'none',
                        borderRadius: '6px', cursor: 'pointer', background: 'none'
                    }}
                />
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                        fontFamily: 'monospace', width: '120px'
                    }}
                />
            </div>
        </div>
    );

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif", maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, color: '#0f172a' }}>Tenant Branding</h1>
                    <p style={{ color: '#64748b' }}>Customize the look and feel of your platform and surveys.</p>
                </div>
                <button
                    onClick={handleSave}
                    style={{
                        background: '#0f172a', color: 'white', padding: '12px 24px',
                        border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    Save Changes
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* SETTINGS COLUMN */}
                <div style={{ padding: '0' }}>

                    {/* Template Gallery */}
                    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#1e293b' }}>✨ Choose a Template</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                            {THEME_TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    onClick={() => applyTemplate(tmpl)}
                                    style={{
                                        background: tmpl.colors.backgroundColor,
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        padding: '10px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                    title={`Apply ${tmpl.name}`}
                                >
                                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: tmpl.colors.primaryColor }}></div>
                                    <span style={{ fontSize: '0.9em', fontWeight: '500', color: '#334155' }}>{tmpl.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>Color Palette</h3>

                        <ColorInput label="Primary Color (Buttons, Highlights)" value={theme.primaryColor} onChange={v => handleChange('primaryColor', v)} />
                        <ColorInput label="Secondary Color (Accents, Borders)" value={theme.secondaryColor} onChange={v => handleChange('secondaryColor', v)} />
                        <ColorInput label="Background Color (Page Background)" value={theme.backgroundColor} onChange={v => handleChange('backgroundColor', v)} />
                        <ColorInput label="Text Color (Body Text)" value={theme.textColor} onChange={v => handleChange('textColor', v)} />

                        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1e293b' }}>Typography & Shape</h3>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>Border Radius</label>
                                <select
                                    value={theme.borderRadius}
                                    onChange={e => handleChange('borderRadius', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="0px">Square (0px)</option>
                                    <option value="4px">Small (4px)</option>
                                    <option value="8px">Standard (8px)</option>
                                    <option value="12px">Rounded (12px)</option>
                                    <option value="24px">Pill (24px)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PREVIEW COLUMN */}
            <div>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#64748b' }}>Live Preview</h3>

                <div style={{
                    background: theme.backgroundColor,
                    color: theme.textColor,
                    padding: '30px',
                    borderRadius: theme.borderRadius,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>
                    <h2 style={{ color: theme.primaryColor, marginTop: 0 }}>Form Title Preview</h2>
                    <p style={{ lineHeight: '1.6' }}>This is how your survey content might look. The colors you choose will be applied to buttons, text, and backgrounds.</p>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Sample Input Field</label>
                        <input type="text" placeholder="Type here..." style={{ width: '100%', padding: '12px', borderRadius: theme.borderRadius, border: `1px solid ${theme.secondaryColor}` }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button style={{
                            background: theme.primaryColor,
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: theme.borderRadius,
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>Primary Action</button>

                        <button style={{
                            background: 'transparent',
                            color: theme.primaryColor,
                            border: `2px solid ${theme.primaryColor}`,
                            padding: '10px 22px',
                            borderRadius: theme.borderRadius,
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}>Secondary</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
