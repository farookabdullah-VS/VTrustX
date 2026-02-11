import React, { useState, useEffect } from 'react';
import VideoAgentInterface from './VideoAgentInterface';
import axios from 'axios';
import { Settings, Shield, Globe, Database, Mail, Mic, Cpu, Save } from 'lucide-react';
import { useToast } from './common/Toast';

export function SystemSettings() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
        // Tenant Profile
        tenant_name: '',
        tenant_logo: '',
        brand_color_primary: '#2563eb',
        brand_color_secondary: '#0f172a',
        default_timezone: 'UTC',
        default_language: 'en',

        // SMTP
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        smtp_from: '',
        enable_workflow: 'false',

        // AI Configuration
        ai_provider: 'browser', // Default backend provider
        gemini_api_key: '',
        gemini_model: 'gemini-1.5-flash',
        openai_api_key: '',
        groq_api_key: '',

        // Voice Agent (Frontend/Legacy)
        voice_agent_provider: 'browser', // 'browser', 'google', 'groq'

        // Telephony (Twilio)
        twilio_account_sid: '',
        twilio_auth_token: '',
        twilio_phone_number: '',

        // Database (New)
        db_host: '',
        db_port: '5432',
        db_name: '',
        db_user: '',
        db_password: '',

        // Feature Flags & System
        use_android_gateway: 'false',
        use_mock_calls: 'false',
        idle_timeout: '0',
        public_url: '', // ngrok
        core_service_url: 'http://localhost:3000'
    });

    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);

    // AI Agent States
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [surveys, setSurveys] = useState([]);
    const [selectedSurvey, setSelectedSurvey] = useState('');

    useEffect(() => {
        axios.get('/api/settings')
            .then(res => {
                if (Object.keys(res.data).length > 0) {
                    setSettings(prev => ({ ...prev, ...res.data }));
                }
            })
            .catch(err => console.error(err));

        // Load Surveys for Agent
        axios.get('/api/agent-chat/forms')
            .then(res => {
                setSurveys(res.data);
                if (res.data.length > 0) setSelectedSurvey(res.data[0].id);
            })
            .catch(e => console.error("Failed to load surveys", e));

        // Load DB Config (Separate endpoint if needed, or included in settings)
        // Note: For security, the backend might mask the DB password.
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleCheckboxChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.checked ? 'true' : 'false' });
    };

    const handleSave = () => {
        setLoading(true);
        axios.post('/api/settings', settings)
            .then(() => toast.success("Settings saved successfully!"))
            .catch(err => toast.error("Failed to save settings: " + (err.response?.data?.error || err.message)))
            .finally(() => setLoading(false));
    };

    const handleTestEmail = () => {
        const email = prompt("Enter email address to send test to:");
        if (!email) return;

        setTesting(true);
        axios.post('/api/settings/test-email', {
            host: settings.smtp_host,
            port: settings.smtp_port,
            user: settings.smtp_user,
            pass: settings.smtp_pass,
            from: settings.smtp_from,
            to: email
        })
            .then(res => toast.info(res.data.message))
            .catch(err => toast.error("Test failed: " + (err.response?.data?.error || err.message)))
            .finally(() => setTesting(false));
    };

    const handleLogoUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        axios.post('/api/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        }).then(res => {
            const logoUrl = res.data.url;
            setSettings(prev => ({ ...prev, tenant_logo: logoUrl }));
            toast.success("Logo uploaded successfully!");
        }).catch(err => {
            console.error(err);
            toast.error("Logo upload failed: " + err.message);
        });
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                background: activeTab === id ? 'var(--sidebar-hover-bg)' : 'transparent',
                color: activeTab === id ? 'var(--primary-color)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: activeTab === id ? '2px solid var(--primary-color)' : '2px solid transparent',
                fontWeight: activeTab === id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
            }}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--text-color)' }}>
                    <Settings size={32} />
                    System Settings
                </h1>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        padding: '10px 24px',
                        background: 'var(--primary-color)',
                        color: 'var(--button-text)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <Save size={18} />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            {/* TAB HEADER */}
            <div style={{
                display: 'flex',
                overflowX: 'auto',
                borderBottom: '1px solid var(--input-border)',
                marginBottom: '30px',
                gap: '10px'
            }}>
                <TabButton id="general" label="General" icon={Globe} />
                <TabButton id="ai" label="AI & Voice" icon={Cpu} />
                <TabButton id="database" label="Database" icon={Database} />
                <TabButton id="smtp" label="Email (SMTP)" icon={Mail} />
                <TabButton id="telephony" label="Telephony" icon={Mic} />
                <TabButton id="system" label="System Flags" icon={Shield} />
            </div>

            {/* TAB CONTENT */}

            {/* ---> GENERAL <--- */}
            {activeTab === 'general' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                            🏢 Organization Profile
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 200px', gap: '30px' }}>
                            <div>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Organization Name</label>
                                    <input
                                        name="tenant_name"
                                        value={settings.tenant_name}
                                        onChange={handleChange}
                                        placeholder="e.g. Acme Corp"
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)', fontSize: '1.1em' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Primary Brand Color</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="color"
                                                name="brand_color_primary"
                                                value={settings.brand_color_primary}
                                                onChange={handleChange}
                                                style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9em', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{settings.brand_color_primary}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Secondary Brand Color</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <input
                                                type="color"
                                                name="brand_color_secondary"
                                                value={settings.brand_color_secondary}
                                                onChange={handleChange}
                                                style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: '0.9em', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{settings.brand_color_secondary}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Default Timezone</label>
                                        <select
                                            name="default_timezone"
                                            value={settings.default_timezone}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                        >
                                            <option value="UTC">UTC</option>
                                            <option value="America/New_York">Eastern Time (US & Canada)</option>
                                            <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                                            <option value="Europe/London">London</option>
                                            <option value="Asia/Dubai">Dubai</option>
                                            <option value="Asia/Singapore">Singapore</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Default Language</label>
                                        <select
                                            name="default_language"
                                            value={settings.default_language}
                                            onChange={handleChange}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                        >
                                            <option value="en">English (US)</option>
                                            <option value="ar">Arabic (العربية)</option>
                                            <option value="fr">French</option>
                                            <option value="es">Spanish</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--input-border)', borderRadius: '12px', padding: '20px', background: 'var(--sidebar-bg)' }}>
                                {settings.tenant_logo ? (
                                    <img src={settings.tenant_logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100px', marginBottom: '15px' }} />
                                ) : (
                                    <div style={{ fontSize: '3em', marginBottom: '10px', opacity: 0.3 }}>🏢</div>
                                )}
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '10px' }}>Organization Logo</div>
                                <button
                                    onClick={() => document.getElementById('logo-upload').click()}
                                    style={{ padding: '6px 12px', background: 'var(--input-bg)', border: '1px solid var(--input-border)', borderRadius: '6px', fontSize: '0.85em', cursor: 'pointer', color: 'var(--text-color)' }}
                                >
                                    Upload
                                </button>
                                <input
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={handleLogoUpload}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---> AI <--- */}
            {activeTab === 'ai' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                            🤖 AI Services & Credentials
                        </h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Global Inference Provider</label>
                                <select
                                    name="ai_provider"
                                    value={settings.ai_provider || 'browser'}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                >
                                    <option value="gemini">Google Gemini</option>
                                    <option value="openai">OpenAI (GPT-4)</option>
                                    <option value="groq">Groq (Llama 3)</option>
                                    <option value="mock">Mock Simulator</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Voice/STT Agent (Frontend)</label>
                                <select
                                    name="voice_agent_provider"
                                    value={settings.voice_agent_provider || 'browser'}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                >
                                    <option value="browser">Browser Native (Free)</option>
                                    <option value="google">Google Cloud STT</option>
                                    <option value="groq">Groq Whisper</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ background: 'var(--sidebar-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--input-border)' }}>
                            <h3 style={{ fontSize: '1.1em', marginBottom: '15px', color: 'var(--text-color)' }}>API Keys</h3>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Gemini API Key</label>
                                <input
                                    type="password"
                                    name="gemini_api_key"
                                    value={settings.gemini_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="AIzaSy..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Gemini Model ID</label>
                                <input
                                    name="gemini_model"
                                    value={settings.gemini_model || ''}
                                    onChange={handleChange}
                                    placeholder="gemini-1.5-flash"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>OpenAI API Key</label>
                                <input
                                    type="password"
                                    name="openai_api_key"
                                    value={settings.openai_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="sk-..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Groq API Key</label>
                                <input
                                    type="password"
                                    name="groq_api_key"
                                    value={settings.groq_api_key || ''}
                                    onChange={handleChange}
                                    placeholder="gsk_..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI AGENT DEMO */}
                    <div style={{ background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, var(--deep-bg) 100%)', padding: '30px', borderRadius: '16px', color: 'white', marginTop: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                        <h2 style={{ fontSize: '1.5em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            🤖 AI Video Agent
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
                            Test the new AI Video Call interface. This agent uses your active Gemini configuration to hold a real-time conversation.
                        </p>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ marginRight: '10px', color: 'var(--text-color)' }}>Select Survey to Conduct:</label>
                            <select
                                value={selectedSurvey}
                                onChange={e => setSelectedSurvey(e.target.value)}
                                style={{ padding: '8px', borderRadius: '6px', border: 'none', color: 'var(--input-text)', background: 'var(--input-bg)' }}
                            >
                                {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={() => {
                                if (!selectedSurvey) { toast.warning("Select a survey first"); return; }
                                setShowVideoCall(true);
                            }}
                            style={{
                                padding: '12px 30px',
                                background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
                                color: 'var(--button-text)',
                                border: 'none',
                                borderRadius: '30px',
                                fontWeight: 'bold',
                                fontSize: '1.1em',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                            }}
                        >
                            Start Video Call
                        </button>
                    </div>

                    {showVideoCall && (
                        <VideoAgentInterface surveyId={selectedSurvey} onClose={() => setShowVideoCall(false)} />
                    )}
                </div>
            )}

            {/* ---> DATABASE <--- */}
            {activeTab === 'database' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                            💾 Database Configuration
                        </h2>
                        <div style={{ background: '#fef3f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9em' }}>
                            <strong>Warning:</strong> Changing these settings will disconnect the application from the current database. Ensure the new credentials are correct before saving. You may need to restart the application for changes to take effect.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Host Name / IP</label>
                                <input
                                    name="db_host"
                                    value={settings.db_host}
                                    onChange={handleChange}
                                    placeholder="127.0.0.1 or db.example.com"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Port</label>
                                <input
                                    name="db_port"
                                    value={settings.db_port}
                                    onChange={handleChange}
                                    placeholder="5432"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Database User</label>
                                <input
                                    name="db_user"
                                    value={settings.db_user}
                                    onChange={handleChange}
                                    placeholder="postgres"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Password</label>
                                <input
                                    name="db_password"
                                    type="password"
                                    value={settings.db_password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Database Name</label>
                            <input
                                name="db_name"
                                value={settings.db_name}
                                onChange={handleChange}
                                placeholder="vtrustx-db"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ---> SMTP <--- */}
            {activeTab === 'smtp' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                            📧 SMTP Configuration
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>SMTP Host</label>
                                <input name="smtp_host" value={settings.smtp_host} onChange={handleChange} placeholder="smtp.gmail.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Port</label>
                                <input name="smtp_port" value={settings.smtp_port} onChange={handleChange} placeholder="587" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Username / Email</label>
                                <input name="smtp_user" value={settings.smtp_user} onChange={handleChange} placeholder="user@example.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Password</label>
                                <input name="smtp_pass" type="password" value={settings.smtp_pass} onChange={handleChange} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Default "From" Address</label>
                            <input name="smtp_from" value={settings.smtp_from} onChange={handleChange} placeholder="noreply@example.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }} />
                        </div>

                        <button
                            onClick={handleTestEmail}
                            disabled={testing}
                            style={{ padding: '12px 24px', background: 'var(--sidebar-bg)', border: '1px solid var(--input-border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', width: '100%' }}
                        >
                            {testing ? 'Sending...' : '🧪 Test SMTP Configuration'}
                        </button>
                    </div>
                </div>
            )}

            {/* ---> TELEPHONY <--- */}
            {activeTab === 'telephony' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                            📞 Voice & Telephony
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Twilio Account SID</label>
                                <input
                                    name="twilio_account_sid"
                                    value={settings.twilio_account_sid || ''}
                                    onChange={handleChange}
                                    placeholder="AC..."
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Twilio Auth Token</label>
                                <input
                                    type="password"
                                    name="twilio_auth_token"
                                    value={settings.twilio_auth_token || ''}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Twilio Phone Number</label>
                            <input
                                name="twilio_phone_number"
                                value={settings.twilio_phone_number || ''}
                                onChange={handleChange}
                                placeholder="+1234567890"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ---> SYSTEM <--- */}
            {activeTab === 'system' && (
                <div className="tab-content" style={{ animation: 'fadeIn 0.3s' }}>
                    <div style={{ background: 'var(--input-bg)', padding: '30px', borderRadius: '16px', border: '1px solid var(--input-border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '1.2em', marginBottom: '20px', color: 'var(--text-color)' }}>🚩 System & Feature Flags</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Webhook Public URL (ngrok)</label>
                            <input
                                name="public_url"
                                value={settings.public_url || ''}
                                onChange={handleChange}
                                placeholder="https://your-ngrok.io"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Core Service URL (Internal)</label>
                            <input
                                name="core_service_url"
                                value={settings.core_service_url || ''}
                                onChange={handleChange}
                                placeholder="http://localhost:3000"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', fontFamily: 'monospace', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '30px', marginBottom: '30px' }}>
                            <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-color)' }}>
                                <input
                                    type="checkbox"
                                    name="use_android_gateway"
                                    checked={settings.use_android_gateway === 'true'}
                                    onChange={handleCheckboxChange}
                                />
                                <span style={{ fontWeight: '500' }}>Enable Android Gateway</span>
                            </label>

                            <label className="switch" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--text-color)' }}>
                                <input
                                    type="checkbox"
                                    name="use_mock_calls"
                                    checked={settings.use_mock_calls === 'true'}
                                    onChange={handleCheckboxChange}
                                />
                                <span style={{ fontWeight: '500' }}>Enable Mock Calls</span>
                            </label>
                        </div>

                        {/* GOVERNANCE */}
                        <h2 style={{ fontSize: '1.2em', marginBottom: '15px', color: 'var(--text-color)' }}>🛡️ Governance</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--label-color)' }}>Idle Timeout (Minutes)</label>
                            <input
                                type="number"
                                name="idle_timeout"
                                value={settings.idle_timeout || '0'}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--input-text)' }}
                            />
                            <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '5px' }}>
                                Set to 0 to disable auto-logout. Otherwise, users will be logged out after this many minutes of inactivity.
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--sidebar-bg)', borderRadius: '12px' }}>
                            <div>
                                <div style={{ fontWeight: '500', color: 'var(--text-color)' }}>Maker-Checker Workflow</div>
                                <div style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Require approval before publishing surveys.</div>
                            </div>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    name="enable_workflow"
                                    checked={settings.enable_workflow === 'true'}
                                    onChange={handleCheckboxChange}
                                />
                                <span className="slider round" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px', backgroundColor: settings.enable_workflow === 'true' ? 'var(--primary-color)' : '#ccc', borderRadius: '34px', transition: '.4s' }}></span>
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SystemSettings;
