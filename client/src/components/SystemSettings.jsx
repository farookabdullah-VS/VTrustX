import React, { useState, useEffect } from 'react';
import VideoAgentInterface from './VideoAgentInterface';
import axios from 'axios';

export function SystemSettings() {
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
        enable_workflow: 'false'
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
    }, []);

    const handleChange = (e) => {
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        setLoading(true);
        axios.post('/api/settings', settings)
            .then(() => alert("Settings saved successfully!"))
            .catch(err => alert("Failed to save settings: " + (err.response?.data?.error || err.message)))
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
            .then(res => alert(res.data.message))
            .catch(err => alert("Test failed: " + (err.response?.data?.error || err.message)))
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
            alert("Logo uploaded successfully!");
        }).catch(err => {
            console.error(err);
            alert("Logo upload failed: " + err.message);
        });
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <h1 style={{ marginBottom: '30px' }}>System Settings</h1>

            {/* TENANT PROFILE */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)', marginBottom: '30px' }}>
                <h2 style={{ fontSize: '1.5em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🏢 Organization Profile
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '30px' }}>
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Organization Name</label>
                            <input
                                name="tenant_name"
                                value={settings.tenant_name}
                                onChange={handleChange}
                                placeholder="e.g. Acme Corp"
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1em' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Primary Brand Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        name="brand_color_primary"
                                        value={settings.brand_color_primary}
                                        onChange={handleChange}
                                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.9em', color: '#64748b', fontFamily: 'monospace' }}>{settings.brand_color_primary}</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Secondary Brand Color</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        type="color"
                                        name="brand_color_secondary"
                                        value={settings.brand_color_secondary}
                                        onChange={handleChange}
                                        style={{ width: '50px', height: '40px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontSize: '0.9em', color: '#64748b', fontFamily: 'monospace' }}>{settings.brand_color_secondary}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Timezone</label>
                                <select
                                    name="default_timezone"
                                    value={settings.default_timezone}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
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
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default Language</label>
                                <select
                                    name="default_language"
                                    value={settings.default_language}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="en">English (US)</option>
                                    <option value="ar">Arabic (العربية)</option>
                                    <option value="fr">French</option>
                                    <option value="es">Spanish</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
                        {settings.tenant_logo ? (
                            <img src={settings.tenant_logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100px', marginBottom: '15px' }} />
                        ) : (
                            <div style={{ fontSize: '3em', marginBottom: '10px', opacity: 0.3 }}>🏢</div>
                        )}
                        <div style={{ color: '#64748b', fontSize: '0.9em', marginBottom: '10px' }}>Organization Logo</div>
                        <button
                            onClick={() => document.getElementById('logo-upload').click()}
                            style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85em', cursor: 'pointer' }}
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

            <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <h2 style={{ fontSize: '1.5em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    📧 SMTP Configuration
                </h2>
                <p style={{ color: '#64748b', marginBottom: '20px' }}>Configure your email provider to send automated emails (e.g., invitations, workflow alerts).</p>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>SMTP Host</label>
                        <input name="smtp_host" value={settings.smtp_host} onChange={handleChange} placeholder="smtp.gmail.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Port</label>
                        <input name="smtp_port" value={settings.smtp_port} onChange={handleChange} placeholder="587" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Username / Email</label>
                        <input name="smtp_user" value={settings.smtp_user} onChange={handleChange} placeholder="user@example.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Password</label>
                        <input name="smtp_pass" type="password" value={settings.smtp_pass} onChange={handleChange} placeholder="••••••••" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Default "From" Address</label>
                    <input name="smtp_from" value={settings.smtp_from} onChange={handleChange} placeholder="noreply@example.com" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                    <h2 style={{ fontSize: '1.2em', marginBottom: '15px' }}>🛡️ Governance</h2>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontWeight: '500', color: '#334155' }}>Maker-Checker Workflow</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Require approval before publishing surveys.</div>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                name="enable_workflow"
                                checked={settings.enable_workflow === 'true'}
                                onChange={(e) => setSettings({ ...settings, enable_workflow: e.target.checked ? 'true' : 'false' })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px' }}>
                    <button
                        onClick={handleTestEmail}
                        disabled={testing}
                        style={{ padding: '12px 24px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', color: '#475569' }}
                    >
                        {testing ? 'Sending...' : '🧪 Test Configuration'}
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        style={{ padding: '12px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}
                    >
                        {loading ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* AI AGENT DEMO */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', color: 'white', marginTop: '30px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}>
                <h2 style={{ fontSize: '1.5em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    🤖 AI Video Agent
                </h2>
                <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                    Test the new AI Video Call interface. This agent uses your active Gemini configuration to hold a real-time conversation.
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ marginRight: '10px' }}>Select Survey to Conduct:</label>
                    <select
                        value={selectedSurvey}
                        onChange={e => setSelectedSurvey(e.target.value)}
                        style={{ padding: '8px', borderRadius: '6px', border: 'none', color: 'black' }}
                    >
                        {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                    </select>
                </div>

                <button
                    onClick={() => {
                        if (!selectedSurvey) return alert("Select a survey first");
                        setShowVideoCall(true);
                    }}
                    style={{
                        padding: '12px 30px',
                        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '30px',
                        fontWeight: 'bold',
                        fontSize: '1.1em',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)'
                    }}
                >
                    Start Video Call
                </button>
            </div>

            {showVideoCall && (
                <VideoAgentInterface surveyId={selectedSurvey} onClose={() => setShowVideoCall(false)} />
            )}
        </div>
    );
}

export default SystemSettings;
