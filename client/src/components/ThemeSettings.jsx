import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';
import { useTheme } from '../contexts/ThemeContext';

const DEFAULT_THEME = {
    // Colors
    primaryColor: '#0f172a',
    secondaryColor: '#64748b',
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    successColor: '#10b981',
    warningColor: '#f59e0b',
    errorColor: '#ef4444',

    // Advanced Colors
    primaryHoverColor: '#1e293b',
    primaryGradientStart: '#0f172a',
    primaryGradientEnd: '#1e293b',
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    borderColor: '#e2e8f0',
    hoverColor: '#f8fafc',

    // Typography
    borderRadius: '12px',
    fontFamily: "'Outfit', sans-serif",
    headingFont: "'Outfit', sans-serif",
    bodyFont: "'Inter', sans-serif",
    fontSize: '16px',
    headingWeight: '700',
    bodyWeight: '400',
    lineHeight: '1.6',
    letterSpacing: 'normal',
    textTransform: 'none',

    // Company Information
    companyName: '',
    tagline: '',
    websiteUrl: '',
    supportEmail: '',

    // Logos
    logoUrl: '',
    faviconUrl: '',
    mobileLogoUrl: '',
    darkModeLogoUrl: '',

    // Email Branding
    emailFooterText: '',
    emailHeaderTemplate: 'default',
    emailSignature: '',

    // Social Media
    linkedinUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    youtubeUrl: '',

    // Layout
    pageMaxWidth: '1400px',
    sidebarPosition: 'left',
    navigationStyle: 'top',
    contentPadding: '24px',
    gridGap: '24px',

    // Buttons
    buttonStyle: 'rounded',
    buttonShadow: 'medium',
    buttonHoverEffect: 'lift',
    buttonSize: 'medium',

    // Forms
    inputStyle: 'rounded',
    inputBorderWidth: '1px',
    inputFocusColor: '#3b82f6',
    validationStyle: 'inline',

    // Dark Mode
    darkModeEnabled: false,
    autoDarkMode: false,
    darkModePrimaryColor: '#3b82f6',
    darkModeBackgroundColor: '#0f172a',
    darkModeTextColor: '#f1f5f9',

    // Mobile
    mobileBreakpoint: '768px',
    mobileFontSize: '14px',
    mobileNavigationStyle: 'bottom',

    // Notifications
    toastPosition: 'top-right',
    toastDuration: '5000',
    alertStyle: 'modern',

    // Animations
    transitionSpeed: 'normal',
    enableAnimations: true,
    loadingStyle: 'spinner',

    // Brand Assets
    backgroundImageUrl: '',
    backgroundPattern: 'none',
    watermarkUrl: '',
    watermarkOpacity: '0.1',

    // Accessibility
    highContrast: false,
    focusIndicatorColor: '#3b82f6',
    focusIndicatorWidth: '2px',
    reducedMotion: false,

    // Localization
    rtlMode: false,
    primaryLanguage: 'en',
    arabicFontOptimization: false,

    // Advanced
    customCss: ''
};

const THEME_TEMPLATES = [
    {
        id: 'saudi-royal',
        name: 'Saudi Royal',
        badge: 'KSA',
        colors: {
            primaryColor: '#1E3A5F',
            secondaryColor: '#B8860B',
            backgroundColor: '#FAFBFD',
            textColor: '#1A1A2E',
            borderRadius: '16px',
        }
    },
    {
        id: 'saudi-green',
        name: 'Saudi Green',
        badge: 'KSA',
        colors: {
            primaryColor: '#006C35',
            secondaryColor: '#C8A052',
            backgroundColor: '#F0F7F2',
            textColor: '#1A2E1A',
            borderRadius: '16px',
        }
    },
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
        id: 'founding-day',
        name: 'Founding Day',
        badge: 'KSA Heritage',
        colors: {
            primaryColor: '#7C4F3B',
            secondaryColor: '#C5A059',
            backgroundColor: '#FDF9F2',
            textColor: '#2D1B14',
            borderRadius: '8px',
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

const FONT_OPTIONS = [
    { value: "'Outfit', sans-serif", label: 'Outfit (Modern)' },
    { value: "'Inter', sans-serif", label: 'Inter (Professional)' },
    { value: "'Roboto', sans-serif", label: 'Roboto (Clean)' },
    { value: "'Poppins', sans-serif", label: 'Poppins (Friendly)' },
    { value: "'Playfair Display', serif", label: 'Playfair Display (Elegant)' },
    { value: "'Montserrat', sans-serif", label: 'Montserrat (Bold)' },
    { value: "'Lato', sans-serif", label: 'Lato (Light)' },
    { value: "'Open Sans', sans-serif", label: 'Open Sans (Readable)' },
    { value: "'Raleway', sans-serif", label: 'Raleway (Stylish)' },
    { value: "'Cairo', sans-serif", label: 'Cairo (Arabic Support)' },
    { value: "'Tajawal', sans-serif", label: 'Tajawal (Arabic)' },
    { value: "Georgia, serif", label: 'Georgia (Classic)' },
    { value: "'Times New Roman', serif", label: 'Times New Roman (Traditional)' },
    { value: "Arial, sans-serif", label: 'Arial (System)' },
];

export function ThemeSettings() {
    const toast = useToast();
    const { isDark, toggleDarkMode } = useTheme();
    const [theme, setTheme] = useState(DEFAULT_THEME);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('colors'); // colors, typography, company, logos, email, social, layout, buttons, forms, darkmode, mobile, notifications, animations, brandAssets, accessibility, localization, advanced

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

    const handleFileUpload = async (file, key) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            handleChange(key, response.data.url);
            toast.success('File uploaded successfully!');
        } catch (err) {
            toast.error('Failed to upload file: ' + err.message);
        }
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
            <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px' }}>{label}</label>
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
                        padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border, #cbd5e1)',
                        fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)',
                        color: 'var(--text-color)',
                    }}
                />
            </div>
        </div>
    );

    return (
        <div style={{ padding: '40px', fontFamily: "'Outfit', sans-serif", maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, color: 'var(--text-color)' }}>Tenant Branding</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Customize the look and feel of your platform and surveys.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Dark/Light mode toggle */}
                    <button
                        onClick={toggleDarkMode}
                        style={{
                            padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                            background: isDark ? 'var(--gold-light)' : 'var(--input-bg)',
                            color: isDark ? 'var(--primary-color)' : 'var(--text-color)',
                            border: `1px solid ${isDark ? 'var(--primary-color)' : 'var(--input-border)'}`,
                            fontSize: '0.9em',
                        }}
                    >
                        {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            background: 'var(--primary-color)', color: 'var(--button-text)', padding: '12px 24px',
                            border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ background: 'var(--card-bg)', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap', border: '1px solid var(--glass-border)' }}>
                {[
                    { key: 'colors', label: '🎨 Colors' },
                    { key: 'typography', label: '✏️ Typography' },
                    { key: 'company', label: '🏢 Company' },
                    { key: 'logos', label: '🖼️ Logos' },
                    { key: 'email', label: '📧 Email' },
                    { key: 'social', label: '🌐 Social' },
                    { key: 'layout', label: '📐 Layout' },
                    { key: 'buttons', label: '🔘 Buttons' },
                    { key: 'forms', label: '📝 Forms' },
                    { key: 'darkmode', label: '🌙 Dark Mode' },
                    { key: 'mobile', label: '📱 Mobile' },
                    { key: 'notifications', label: '🔔 Alerts' },
                    { key: 'animations', label: '✨ Effects' },
                    { key: 'brandAssets', label: '🎨 Brand Assets' },
                    { key: 'accessibility', label: '♿ Access' },
                    { key: 'localization', label: '🌍 Locale' },
                    { key: 'advanced', label: '⚙️ Advanced' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === tab.key ? 'var(--primary-color)' : 'transparent',
                            color: activeTab === tab.key ? 'white' : 'var(--text-color)',
                            fontWeight: activeTab === tab.key ? '700' : '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            fontSize: '0.85em',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                {/* SETTINGS COLUMN */}
                <div style={{ padding: '0' }}>

                    {/* Template Gallery - Show on colors tab */}
                    {activeTab === 'colors' && (
                        <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)', marginBottom: '30px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)' }}>Choose a Template</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                {THEME_TEMPLATES.map(tmpl => (
                                    <button
                                        key={tmpl.id}
                                        onClick={() => applyTemplate(tmpl)}
                                        style={{
                                            background: tmpl.colors.backgroundColor,
                                            border: '1px solid var(--input-border, #cbd5e1)',
                                            borderRadius: '10px',
                                            padding: '12px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            position: 'relative',
                                        }}
                                        title={`Apply ${tmpl.name}`}
                                    >
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: tmpl.colors.primaryColor, flexShrink: 0,
                                            border: `2px solid ${tmpl.colors.secondaryColor}`,
                                        }} />
                                        <span style={{ fontSize: '0.85em', fontWeight: '600', color: tmpl.colors.textColor }}>{tmpl.name}</span>
                                        {tmpl.badge && (
                                            <span style={{
                                                position: 'absolute', top: '4px', right: '4px',
                                                fontSize: '0.6em', fontWeight: '700', padding: '1px 5px',
                                                borderRadius: '4px', background: '#006C35', color: '#fff',
                                                letterSpacing: '0.5px',
                                            }}>{tmpl.badge}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Colors Tab */}
                    {activeTab === 'colors' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Color Palette</h3>

                            <ColorInput label="Primary Color (Buttons, Links, Highlights)" value={theme.primaryColor} onChange={v => handleChange('primaryColor', v)} />
                            <ColorInput label="Secondary Color (Accents, Borders, Icons)" value={theme.secondaryColor} onChange={v => handleChange('secondaryColor', v)} />
                            <ColorInput label="Background Color (Page Background)" value={theme.backgroundColor} onChange={v => handleChange('backgroundColor', v)} />
                            <ColorInput label="Text Color (Body Text, Labels)" value={theme.textColor} onChange={v => handleChange('textColor', v)} />

                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)', fontSize: '1em' }}>Status Colors</h4>
                                <ColorInput label="Success Color (Checkmarks, Success Messages)" value={theme.successColor || '#10b981'} onChange={v => handleChange('successColor', v)} />
                                <ColorInput label="Warning Color (Alerts, Cautions)" value={theme.warningColor || '#f59e0b'} onChange={v => handleChange('warningColor', v)} />
                                <ColorInput label="Error Color (Errors, Warnings)" value={theme.errorColor || '#ef4444'} onChange={v => handleChange('errorColor', v)} />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>💡 Tip:</strong> Use the color picker or enter hex codes directly. Colors will be applied to buttons, forms, and all branded elements across your platform.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Typography Tab */}
                    {activeTab === 'typography' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Typography Settings</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Heading Font Family</label>
                                <select
                                    value={theme.headingFont || theme.fontFamily}
                                    onChange={e => handleChange('headingFont', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value}>{font.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Body Font Family</label>
                                <select
                                    value={theme.bodyFont || theme.fontFamily}
                                    onChange={e => handleChange('bodyFont', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    {FONT_OPTIONS.map(font => (
                                        <option key={font.value} value={font.value}>{font.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Base Font Size</label>
                                <select
                                    value={theme.fontSize || '16px'}
                                    onChange={e => handleChange('fontSize', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="14px">Small (14px)</option>
                                    <option value="16px">Medium (16px) - Recommended</option>
                                    <option value="18px">Large (18px)</option>
                                    <option value="20px">Extra Large (20px)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Heading Font Weight</label>
                                <select
                                    value={theme.headingWeight || '700'}
                                    onChange={e => handleChange('headingWeight', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="400">Normal (400)</option>
                                    <option value="500">Medium (500)</option>
                                    <option value="600">Semi-Bold (600)</option>
                                    <option value="700">Bold (700)</option>
                                    <option value="800">Extra Bold (800)</option>
                                    <option value="900">Black (900)</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)', fontSize: '1em' }}>Shape & Spacing</h4>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Border Radius</label>
                                    <select
                                        value={theme.borderRadius}
                                        onChange={e => handleChange('borderRadius', e.target.value)}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                    >
                                        <option value="0px">Square (0px)</option>
                                        <option value="4px">Small (4px)</option>
                                        <option value="8px">Standard (8px)</option>
                                        <option value="12px">Rounded (12px)</option>
                                        <option value="16px">Extra Rounded (16px)</option>
                                        <option value="24px">Pill (24px)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>💡 Font Preview:</strong> Your selected fonts will be applied to all headings, body text, and UI elements. Google Fonts are loaded automatically.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Company Info Tab */}
                    {activeTab === 'company' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Company Information</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Organization / Company Name</label>
                                <input
                                    type="text"
                                    value={theme.companyName || ''}
                                    onChange={e => handleChange('companyName', e.target.value)}
                                    placeholder="e.g., Acme Corporation"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Tagline / Slogan</label>
                                <input
                                    type="text"
                                    value={theme.tagline || ''}
                                    onChange={e => handleChange('tagline', e.target.value)}
                                    placeholder="e.g., Empowering Better Experiences"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Company Website URL</label>
                                <input
                                    type="url"
                                    value={theme.websiteUrl || ''}
                                    onChange={e => handleChange('websiteUrl', e.target.value)}
                                    placeholder="https://www.example.com"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Support Email</label>
                                <input
                                    type="email"
                                    value={theme.supportEmail || ''}
                                    onChange={e => handleChange('supportEmail', e.target.value)}
                                    placeholder="support@example.com"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>ℹ️ Usage:</strong> This information will be displayed in surveys, email footers, and support pages to help customers contact you.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Logos Tab */}
                    {activeTab === 'logos' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Logos & Visual Assets</h3>

                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Company Logo</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Used in navigation bar and email headers (Recommended: 200x60px, PNG with transparent background)</p>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    onChange={e => handleFileUpload(e.target.files[0], 'logoUrl')}
                                    style={{ marginBottom: '10px' }}
                                />
                                {theme.logoUrl && (
                                    <div style={{ marginTop: '12px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', textAlign: 'center' }}>
                                        <img src={theme.logoUrl} alt="Logo Preview" style={{ maxWidth: '200px', maxHeight: '80px' }} />
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={theme.logoUrl || ''}
                                    onChange={e => handleChange('logoUrl', e.target.value)}
                                    placeholder="Or enter logo URL"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box', marginTop: '8px' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Favicon</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Displayed in browser tabs (Recommended: 32x32px or 64x64px, PNG or ICO)</p>
                                <input
                                    type="file"
                                    accept="image/png,image/x-icon,image/svg+xml"
                                    onChange={e => handleFileUpload(e.target.files[0], 'faviconUrl')}
                                    style={{ marginBottom: '10px' }}
                                />
                                {theme.faviconUrl && (
                                    <div style={{ marginTop: '12px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px' }}>
                                        <img src={theme.faviconUrl} alt="Favicon Preview" style={{ width: '32px', height: '32px' }} />
                                    </div>
                                )}
                                <input
                                    type="text"
                                    value={theme.faviconUrl || ''}
                                    onChange={e => handleChange('faviconUrl', e.target.value)}
                                    placeholder="Or enter favicon URL"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box', marginTop: '8px' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>📸 Tip:</strong> Use high-quality PNG files with transparent backgrounds for best results. Logos will be automatically resized to fit different contexts.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Email Branding Tab */}
                    {activeTab === 'email' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Email Branding</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Email Footer Text</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Appears at the bottom of all automated emails sent from your platform</p>
                                <textarea
                                    value={theme.emailFooterText || ''}
                                    onChange={e => handleChange('emailFooterText', e.target.value)}
                                    placeholder="e.g., © 2024 Acme Corporation. All rights reserved.\n123 Main Street, City, Country\nUnsubscribe | Privacy Policy"
                                    rows={6}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.9em', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>📧 Email Preview:</strong> Your logo, colors, and footer text will be applied to all survey invitations, reports, and system emails.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Social Media Tab */}
                    {activeTab === 'social' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Social Media Links</h3>
                            <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginBottom: '24px' }}>Add your social media profiles to display in survey footers and email signatures</p>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>🔗 LinkedIn</label>
                                <input
                                    type="url"
                                    value={theme.linkedinUrl || ''}
                                    onChange={e => handleChange('linkedinUrl', e.target.value)}
                                    placeholder="https://www.linkedin.com/company/yourcompany"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>🐦 Twitter (X)</label>
                                <input
                                    type="url"
                                    value={theme.twitterUrl || ''}
                                    onChange={e => handleChange('twitterUrl', e.target.value)}
                                    placeholder="https://twitter.com/yourcompany"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>📘 Facebook</label>
                                <input
                                    type="url"
                                    value={theme.facebookUrl || ''}
                                    onChange={e => handleChange('facebookUrl', e.target.value)}
                                    placeholder="https://www.facebook.com/yourcompany"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>📷 Instagram</label>
                                <input
                                    type="url"
                                    value={theme.instagramUrl || ''}
                                    onChange={e => handleChange('instagramUrl', e.target.value)}
                                    placeholder="https://www.instagram.com/yourcompany"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>▶️ YouTube</label>
                                <input
                                    type="url"
                                    value={theme.youtubeUrl || ''}
                                    onChange={e => handleChange('youtubeUrl', e.target.value)}
                                    placeholder="https://www.youtube.com/@yourcompany"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🌐 Display:</strong> Social media icons with links will appear in survey footers and email signatures. Leave blank to hide.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Layout Tab */}
                    {activeTab === 'layout' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Layout Customization</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Page Max Width</label>
                                <select
                                    value={theme.pageMaxWidth || '1400px'}
                                    onChange={e => handleChange('pageMaxWidth', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="1200px">Narrow (1200px)</option>
                                    <option value="1400px">Standard (1400px)</option>
                                    <option value="1600px">Wide (1600px)</option>
                                    <option value="100%">Full Width</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Sidebar Position</label>
                                <select
                                    value={theme.sidebarPosition || 'left'}
                                    onChange={e => handleChange('sidebarPosition', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="left">Left Sidebar</option>
                                    <option value="right">Right Sidebar</option>
                                    <option value="none">No Sidebar</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Navigation Style</label>
                                <select
                                    value={theme.navigationStyle || 'top'}
                                    onChange={e => handleChange('navigationStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="top">Top Navigation</option>
                                    <option value="side">Side Navigation</option>
                                    <option value="compact">Compact Top</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Content Padding</label>
                                <select
                                    value={theme.contentPadding || '24px'}
                                    onChange={e => handleChange('contentPadding', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="12px">Compact (12px)</option>
                                    <option value="24px">Normal (24px)</option>
                                    <option value="32px">Spacious (32px)</option>
                                    <option value="48px">Extra Spacious (48px)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Grid Gap</label>
                                <select
                                    value={theme.gridGap || '24px'}
                                    onChange={e => handleChange('gridGap', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="12px">Tight (12px)</option>
                                    <option value="16px">Compact (16px)</option>
                                    <option value="24px">Normal (24px)</option>
                                    <option value="32px">Spacious (32px)</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>📐 Layout:</strong> Control the overall structure and spacing of your application interface.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Buttons Tab */}
                    {activeTab === 'buttons' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Button Styling</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Button Style</label>
                                <select
                                    value={theme.buttonStyle || 'rounded'}
                                    onChange={e => handleChange('buttonStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="square">Square</option>
                                    <option value="rounded">Rounded</option>
                                    <option value="pill">Pill</option>
                                    <option value="sharp">Sharp Edges</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Button Shadow</label>
                                <select
                                    value={theme.buttonShadow || 'medium'}
                                    onChange={e => handleChange('buttonShadow', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="none">No Shadow</option>
                                    <option value="small">Small Shadow</option>
                                    <option value="medium">Medium Shadow</option>
                                    <option value="large">Large Shadow</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Hover Effect</label>
                                <select
                                    value={theme.buttonHoverEffect || 'lift'}
                                    onChange={e => handleChange('buttonHoverEffect', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="none">No Effect</option>
                                    <option value="darken">Darken</option>
                                    <option value="lighten">Lighten</option>
                                    <option value="lift">Lift (Transform)</option>
                                    <option value="glow">Glow Effect</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Button Size Preset</label>
                                <select
                                    value={theme.buttonSize || 'medium'}
                                    onChange={e => handleChange('buttonSize', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="small">Small (Compact)</option>
                                    <option value="medium">Medium (Standard)</option>
                                    <option value="large">Large (Touch-Friendly)</option>
                                    <option value="xlarge">Extra Large</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🔘 Buttons:</strong> Customize the appearance and interaction of all buttons across your platform.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Forms Tab */}
                    {activeTab === 'forms' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Form Customization</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Input Field Style</label>
                                <select
                                    value={theme.inputStyle || 'rounded'}
                                    onChange={e => handleChange('inputStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="square">Square</option>
                                    <option value="rounded">Rounded</option>
                                    <option value="pill">Pill</option>
                                    <option value="underline">Underline Only</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Input Border Width</label>
                                <select
                                    value={theme.inputBorderWidth || '1px'}
                                    onChange={e => handleChange('inputBorderWidth', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="0px">No Border</option>
                                    <option value="1px">Thin (1px)</option>
                                    <option value="2px">Medium (2px)</option>
                                    <option value="3px">Bold (3px)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Input Focus Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        value={theme.inputFocusColor || '#3b82f6'}
                                        onChange={e => handleChange('inputFocusColor', e.target.value)}
                                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        value={theme.inputFocusColor || '#3b82f6'}
                                        onChange={e => handleChange('inputFocusColor', e.target.value)}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Validation Message Style</label>
                                <select
                                    value={theme.validationStyle || 'inline'}
                                    onChange={e => handleChange('validationStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="inline">Inline Messages</option>
                                    <option value="tooltip">Tooltip Style</option>
                                    <option value="banner">Banner at Top</option>
                                    <option value="modal">Modal Dialog</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>📝 Forms:</strong> Customize input fields, dropdowns, checkboxes, and validation styling.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Dark Mode Tab */}
                    {activeTab === 'darkmode' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Dark Mode Settings</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.darkModeEnabled || false}
                                        onChange={e => handleChange('darkModeEnabled', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Enable Dark Mode Option</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Allow users to switch to dark mode</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.autoDarkMode || false}
                                        onChange={e => handleChange('autoDarkMode', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Auto Dark Mode</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Automatically switch based on system preference</p>
                            </div>

                            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '15px', color: 'var(--text-color)', fontSize: '1em' }}>Dark Mode Colors</h4>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px' }}>Dark Mode Primary Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="color"
                                            value={theme.darkModePrimaryColor || '#3b82f6'}
                                            onChange={e => handleChange('darkModePrimaryColor', e.target.value)}
                                            style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                                        />
                                        <input
                                            type="text"
                                            value={theme.darkModePrimaryColor || '#3b82f6'}
                                            onChange={e => handleChange('darkModePrimaryColor', e.target.value)}
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px' }}>Dark Mode Background</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="color"
                                            value={theme.darkModeBackgroundColor || '#0f172a'}
                                            onChange={e => handleChange('darkModeBackgroundColor', e.target.value)}
                                            style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                                        />
                                        <input
                                            type="text"
                                            value={theme.darkModeBackgroundColor || '#0f172a'}
                                            onChange={e => handleChange('darkModeBackgroundColor', e.target.value)}
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px' }}>Dark Mode Text Color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="color"
                                            value={theme.darkModeTextColor || '#f1f5f9'}
                                            onChange={e => handleChange('darkModeTextColor', e.target.value)}
                                            style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                                        />
                                        <input
                                            type="text"
                                            value={theme.darkModeTextColor || '#f1f5f9'}
                                            onChange={e => handleChange('darkModeTextColor', e.target.value)}
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🌙 Dark Mode:</strong> Provide a dark theme option for better viewing in low-light conditions.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Mobile Tab */}
                    {activeTab === 'mobile' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Mobile Customization</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Mobile Breakpoint</label>
                                <select
                                    value={theme.mobileBreakpoint || '768px'}
                                    onChange={e => handleChange('mobileBreakpoint', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="640px">Small Devices (640px)</option>
                                    <option value="768px">Standard Mobile (768px)</option>
                                    <option value="1024px">Tablets (1024px)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Mobile Font Size</label>
                                <select
                                    value={theme.mobileFontSize || '14px'}
                                    onChange={e => handleChange('mobileFontSize', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="12px">Extra Small (12px)</option>
                                    <option value="14px">Small (14px)</option>
                                    <option value="16px">Same as Desktop (16px)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Mobile Navigation Style</label>
                                <select
                                    value={theme.mobileNavigationStyle || 'bottom'}
                                    onChange={e => handleChange('mobileNavigationStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="bottom">Bottom Navigation</option>
                                    <option value="top">Top Navigation</option>
                                    <option value="hamburger">Hamburger Menu</option>
                                    <option value="drawer">Side Drawer</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Mobile Logo URL (Optional)</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Use a smaller or alternate logo for mobile devices</p>
                                <input
                                    type="text"
                                    value={theme.mobileLogoUrl || ''}
                                    onChange={e => handleChange('mobileLogoUrl', e.target.value)}
                                    placeholder="Leave blank to use main logo"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>📱 Mobile:</strong> Optimize the experience for smartphones and tablets.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Notification Styling</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Toast Position</label>
                                <select
                                    value={theme.toastPosition || 'top-right'}
                                    onChange={e => handleChange('toastPosition', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="top-left">Top Left</option>
                                    <option value="top-center">Top Center</option>
                                    <option value="top-right">Top Right</option>
                                    <option value="bottom-left">Bottom Left</option>
                                    <option value="bottom-center">Bottom Center</option>
                                    <option value="bottom-right">Bottom Right</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Toast Duration</label>
                                <select
                                    value={theme.toastDuration || '5000'}
                                    onChange={e => handleChange('toastDuration', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="2000">2 seconds</option>
                                    <option value="3000">3 seconds</option>
                                    <option value="5000">5 seconds</option>
                                    <option value="7000">7 seconds</option>
                                    <option value="10000">10 seconds</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Alert Style</label>
                                <select
                                    value={theme.alertStyle || 'modern'}
                                    onChange={e => handleChange('alertStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="modern">Modern (Cards)</option>
                                    <option value="minimal">Minimal</option>
                                    <option value="bold">Bold (High Contrast)</option>
                                    <option value="classic">Classic</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🔔 Alerts:</strong> Customize toast notifications, alerts, and success/error messages.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Animations Tab */}
                    {activeTab === 'animations' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Animation & Effects</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.enableAnimations !== false}
                                        onChange={e => handleChange('enableAnimations', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Enable Animations</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Turn off to improve performance or reduce motion</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Transition Speed</label>
                                <select
                                    value={theme.transitionSpeed || 'normal'}
                                    onChange={e => handleChange('transitionSpeed', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="instant">Instant (0ms)</option>
                                    <option value="fast">Fast (150ms)</option>
                                    <option value="normal">Normal (300ms)</option>
                                    <option value="slow">Slow (500ms)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Loading Indicator Style</label>
                                <select
                                    value={theme.loadingStyle || 'spinner'}
                                    onChange={e => handleChange('loadingStyle', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="spinner">Spinner</option>
                                    <option value="dots">Dots</option>
                                    <option value="bar">Progress Bar</option>
                                    <option value="pulse">Pulse</option>
                                    <option value="skeleton">Skeleton Screen</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>✨ Effects:</strong> Control transitions, animations, and loading indicators.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Brand Assets Tab */}
                    {activeTab === 'brandAssets' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Brand Assets & Patterns</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Background Image URL</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Full-page background image (subtle patterns work best)</p>
                                <input
                                    type="text"
                                    value={theme.backgroundImageUrl || ''}
                                    onChange={e => handleChange('backgroundImageUrl', e.target.value)}
                                    placeholder="https://example.com/background.png"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Background Pattern</label>
                                <select
                                    value={theme.backgroundPattern || 'none'}
                                    onChange={e => handleChange('backgroundPattern', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="none">No Pattern</option>
                                    <option value="dots">Dots</option>
                                    <option value="grid">Grid</option>
                                    <option value="diagonal">Diagonal Lines</option>
                                    <option value="waves">Waves</option>
                                    <option value="geometric">Geometric</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Watermark URL</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Subtle watermark for branding (appears on reports/exports)</p>
                                <input
                                    type="text"
                                    value={theme.watermarkUrl || ''}
                                    onChange={e => handleChange('watermarkUrl', e.target.value)}
                                    placeholder="https://example.com/watermark.png"
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Watermark Opacity</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={theme.watermarkOpacity || '0.1'}
                                    onChange={e => handleChange('watermarkOpacity', e.target.value)}
                                    style={{ width: '100%' }}
                                />
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>Opacity: {theme.watermarkOpacity || '0.1'}</p>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🎨 Assets:</strong> Add background images, patterns, and watermarks for enhanced branding.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Accessibility Tab */}
                    {activeTab === 'accessibility' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Accessibility Options</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.highContrast || false}
                                        onChange={e => handleChange('highContrast', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>High Contrast Mode</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Increase contrast for better visibility</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.reducedMotion || false}
                                        onChange={e => handleChange('reducedMotion', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Reduced Motion</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Minimize animations for users sensitive to motion</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Focus Indicator Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        value={theme.focusIndicatorColor || '#3b82f6'}
                                        onChange={e => handleChange('focusIndicatorColor', e.target.value)}
                                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'none' }}
                                    />
                                    <input
                                        type="text"
                                        value={theme.focusIndicatorColor || '#3b82f6'}
                                        onChange={e => handleChange('focusIndicatorColor', e.target.value)}
                                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', width: '120px', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px' }}>Color of the outline when elements are focused via keyboard</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Focus Indicator Width</label>
                                <select
                                    value={theme.focusIndicatorWidth || '2px'}
                                    onChange={e => handleChange('focusIndicatorWidth', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="1px">Thin (1px)</option>
                                    <option value="2px">Medium (2px)</option>
                                    <option value="3px">Bold (3px)</option>
                                    <option value="4px">Extra Bold (4px)</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>♿ Access:</strong> Make your platform more accessible for users with disabilities.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Localization Tab */}
                    {activeTab === 'localization' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Localization Support</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.rtlMode || false}
                                        onChange={e => handleChange('rtlMode', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Enable RTL (Right-to-Left) Mode</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>For Arabic, Hebrew, and other RTL languages</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={theme.arabicFontOptimization || false}
                                        onChange={e => handleChange('arabicFontOptimization', e.target.checked)}
                                        style={{ marginRight: '10px', width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontWeight: '600', color: 'var(--text-color)' }}>Arabic Font Optimization</span>
                                </label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '8px', marginLeft: '28px' }}>Use optimized fonts and spacing for Arabic text</p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Primary Language</label>
                                <select
                                    value={theme.primaryLanguage || 'en'}
                                    onChange={e => handleChange('primaryLanguage', e.target.value)}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                                >
                                    <option value="en">English</option>
                                    <option value="ar">Arabic (العربية)</option>
                                    <option value="es">Spanish (Español)</option>
                                    <option value="fr">French (Français)</option>
                                    <option value="de">German (Deutsch)</option>
                                    <option value="zh">Chinese (中文)</option>
                                    <option value="ja">Japanese (日本語)</option>
                                    <option value="pt">Portuguese (Português)</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--input-bg)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                                    <strong>🌍 Locale:</strong> Configure language and regional settings for international users.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Advanced Tab */}
                    {activeTab === 'advanced' && (
                        <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-color)' }}>Advanced Settings</h3>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-color)' }}>Custom CSS</label>
                                <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px' }}>Add custom CSS to further customize your brand appearance (Advanced users only)</p>
                                <textarea
                                    value={theme.customCss || ''}
                                    onChange={e => handleChange('customCss', e.target.value)}
                                    placeholder="/* Custom CSS */\n.my-custom-class {\n  color: #333;\n  font-size: 16px;\n}"
                                    rows={10}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: '#1e1e1e', color: '#d4d4d4', boxSizing: 'border-box', fontFamily: 'monospace', fontSize: '0.85em', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ marginTop: '20px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24', color: '#78350f' }}>
                                <p style={{ margin: 0, fontSize: '0.85em', lineHeight: '1.6' }}>
                                    <strong>⚠️ Warning:</strong> Custom CSS can break the layout if used incorrectly. Only use this if you understand CSS. Changes are applied globally across your platform.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            {/* PREVIEW COLUMN */}
            <div>
                <h3 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-muted)' }}>Live Preview</h3>

                <div style={{
                    background: theme.backgroundColor,
                    color: theme.textColor,
                    padding: '30px',
                    borderRadius: theme.borderRadius,
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    fontFamily: theme.bodyFont || theme.fontFamily,
                    fontSize: theme.fontSize || '16px',
                }}>
                    {/* Logo Preview */}
                    {theme.logoUrl && (
                        <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                            <img src={theme.logoUrl} alt="Company Logo" style={{ maxWidth: '180px', maxHeight: '60px' }} />
                        </div>
                    )}

                    {/* Company Info Preview */}
                    {theme.companyName && (
                        <div style={{ marginBottom: '20px' }}>
                            <h2 style={{ color: theme.primaryColor, marginTop: 0, marginBottom: '8px', fontFamily: theme.headingFont || theme.fontFamily, fontWeight: theme.headingWeight || '700' }}>{theme.companyName}</h2>
                            {theme.tagline && (
                                <p style={{ margin: 0, fontSize: '0.9em', color: theme.secondaryColor, fontStyle: 'italic' }}>{theme.tagline}</p>
                            )}
                        </div>
                    )}

                    <h2 style={{ color: theme.primaryColor, marginTop: 0, fontFamily: theme.headingFont || theme.fontFamily, fontWeight: theme.headingWeight || '700' }}>Survey Title Preview</h2>
                    <p style={{ lineHeight: '1.6', marginBottom: '20px' }}>This is how your survey content will look with your selected branding. The colors, fonts, and styling you choose will be applied consistently across all surveys and forms.</p>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Sample Input Field</label>
                        <input type="text" placeholder="Type here..." style={{ width: '100%', padding: '12px', borderRadius: theme.borderRadius, border: `1px solid ${theme.secondaryColor}`, boxSizing: 'border-box', fontSize: theme.fontSize || '16px' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
                        <button style={{
                            background: theme.primaryColor,
                            color: 'white',
                            padding: '12px 24px',
                            border: 'none',
                            borderRadius: theme.borderRadius,
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: theme.fontSize || '16px',
                        }}>Primary Button</button>

                        <button style={{
                            background: 'transparent',
                            color: theme.primaryColor,
                            border: `2px solid ${theme.primaryColor}`,
                            padding: '10px 22px',
                            borderRadius: theme.borderRadius,
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: theme.fontSize || '16px',
                        }}>Secondary</button>
                    </div>

                    {/* Status Colors Preview */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        <div style={{ padding: '8px 16px', borderRadius: theme.borderRadius, background: theme.successColor || '#10b981', color: 'white', fontSize: '0.85em', fontWeight: '600' }}>
                            ✓ Success
                        </div>
                        <div style={{ padding: '8px 16px', borderRadius: theme.borderRadius, background: theme.warningColor || '#f59e0b', color: 'white', fontSize: '0.85em', fontWeight: '600' }}>
                            ⚠ Warning
                        </div>
                        <div style={{ padding: '8px 16px', borderRadius: theme.borderRadius, background: theme.errorColor || '#ef4444', color: 'white', fontSize: '0.85em', fontWeight: '600' }}>
                            ✕ Error
                        </div>
                    </div>

                    {/* Social Media Preview */}
                    {(theme.linkedinUrl || theme.twitterUrl || theme.facebookUrl || theme.instagramUrl || theme.youtubeUrl) && (
                        <div style={{ paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                            <p style={{ fontSize: '0.85em', color: theme.secondaryColor, marginBottom: '12px', fontWeight: '600' }}>Connect with us:</p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {theme.linkedinUrl && <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em', fontWeight: 'bold' }}>in</div>}
                                {theme.twitterUrl && <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em', fontWeight: 'bold' }}>𝕏</div>}
                                {theme.facebookUrl && <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em', fontWeight: 'bold' }}>f</div>}
                                {theme.instagramUrl && <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em', fontWeight: 'bold' }}>📷</div>}
                                {theme.youtubeUrl && <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: theme.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.8em', fontWeight: 'bold' }}>▶</div>}
                            </div>
                        </div>
                    )}

                    {/* Email Footer Preview */}
                    {theme.emailFooterText && (
                        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)' }}>
                            <p style={{ fontSize: '0.75em', color: theme.secondaryColor, lineHeight: '1.6', whiteSpace: 'pre-line', margin: 0 }}>
                                {theme.emailFooterText}
                            </p>
                        </div>
                    )}
                </div>

                {/* Color accent preview bar */}
                <div style={{ display: 'flex', gap: '4px', marginTop: '16px', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ flex: 3, height: '8px', background: theme.primaryColor }} title="Primary Color" />
                    <div style={{ flex: 2, height: '8px', background: theme.secondaryColor }} title="Secondary Color" />
                    <div style={{ flex: 1, height: '8px', background: theme.successColor || '#10b981' }} title="Success Color" />
                    <div style={{ flex: 1, height: '8px', background: theme.warningColor || '#f59e0b' }} title="Warning Color" />
                    <div style={{ flex: 1, height: '8px', background: theme.errorColor || '#ef4444' }} title="Error Color" />
                </div>

                {/* Font Preview */}
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginBottom: '12px', fontWeight: '600' }}>Typography Preview:</p>
                    <p style={{ fontFamily: theme.headingFont || theme.fontFamily, fontWeight: theme.headingWeight || '700', fontSize: '1.1em', marginBottom: '8px', color: 'var(--text-color)' }}>
                        Heading Font: {(theme.headingFont || theme.fontFamily).split(',')[0].replace(/['"]/g, '')}
                    </p>
                    <p style={{ fontFamily: theme.bodyFont || theme.fontFamily, fontWeight: theme.bodyWeight || '400', fontSize: theme.fontSize || '16px', margin: 0, color: 'var(--text-color)' }}>
                        Body Font: {(theme.bodyFont || theme.fontFamily).split(',')[0].replace(/['"]/g, '')} · Size: {theme.fontSize || '16px'}
                    </p>
                </div>
            </div>
        </div>
    );
}
