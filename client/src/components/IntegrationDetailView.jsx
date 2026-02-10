import React, { useState } from 'react';
import axios from 'axios';

export function IntegrationDetailView({ integration, onBack, onUpdate }) {
    const [formState, setFormState] = useState({
        api_key: integration.api_key || '',
        webhook_url: integration.webhook_url || '',
        is_active: integration.is_active || false,
        details: integration.config || {}
    });

    const handleSave = () => {
        const payload = {
            provider: integration.provider, // Required for creation
            api_key: formState.api_key,
            webhook_url: formState.webhook_url,
            is_active: formState.is_active,
            config: formState.details
        };

        const request = integration.id
            ? axios.put(`/api/integrations/${integration.id}`, payload)
            : axios.post('/api/integrations', payload);

        request.then(() => {
            alert("Integration Saved!");
            onUpdate(); // Refresh parent list
        }).catch(err => {
            console.error(err);
            alert("Save failed: " + (err.response?.data?.error || err.message));
        });
    };

    const getIconColor = (provider) => {
        const colors = {
            'Facebook': '#1877F2',
            'Instagram': '#E4405F',
            'WhatsApp': '#25D366',
            'Twitter': '#1DA1F2',
            'LinkedIn': '#0A66C2',
            'Salesforce': '#00A1E0',
            'HubSpot': '#FF7A59',
            'Slack': '#4A154B',
            'Power BI': '#F2C811',
            'Genesys Cloud': '#FF4F1F',
            'Zendesk': '#03363D'
        };
        return colors[provider] || '#64748b';
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.1em' }}>← Back to Integrations</button>

            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '40px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '16px',
                        background: getIconColor(integration.provider),
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.5em', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                    }}>
                        {integration.provider[0]}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '2em', color: '#1e293b' }}>{integration.provider}</h1>
                        <p style={{ margin: '5px 0 0 0', color: '#64748b' }}>Connect and sync your data with {integration.provider}.</p>
                    </div>
                </div>

                {/* Configuration Body */}
                <div style={{ padding: '40px' }}>

                    {/* Status Toggle */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: formState.is_active ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', marginBottom: '30px', border: formState.is_active ? '1px solid #bbf7d0' : '1px solid #fecaca' }}>
                        <div>
                            <strong style={{ fontSize: '1.1em', display: 'block', color: formState.is_active ? '#15803d' : '#991b1b' }}>{formState.is_active ? 'Integration Active' : 'Integration Inactive'}</strong>
                            <span style={{ fontSize: '0.9em', color: formState.is_active ? '#166534' : '#b91c1c' }}>{formState.is_active ? 'Data is flowing.' : 'Enable to start syncing.'}</span>
                        </div>
                        <div className="toggle-switch">
                            <input
                                type="checkbox"
                                id="active-toggle"
                                checked={formState.is_active}
                                onChange={e => setFormState({ ...formState, is_active: e.target.checked })}
                            />
                            <label htmlFor="active-toggle" style={{ transform: 'scale(1.2)' }}></label>
                        </div>
                    </div>

                    {/* Genesys Cloud Specific Config */}
                    {integration.provider === 'Genesys Cloud' && (
                        <div style={{ marginBottom: '30px', padding: '20px', background: '#fff7ed', borderRadius: '12px', border: '1px solid #fdba74' }}>
                            <h3 style={{ marginTop: 0, color: '#c2410c' }}>Genesys Cloud Configuration</h3>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#7c2d12' }}>Client ID</label>
                                <input
                                    type="text"
                                    value={formState.details?.client_id || ''}
                                    onChange={e => setFormState({ ...formState, details: { ...formState.details, client_id: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fdba74' }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#7c2d12' }}>Client Secret</label>
                                <input
                                    type="password"
                                    value={formState.details?.client_secret || ''}
                                    onChange={e => setFormState({ ...formState, details: { ...formState.details, client_secret: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fdba74' }}
                                />
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#7c2d12' }}>Region (e.g. us-east-1)</label>
                                <select
                                    value={formState.details?.region || 'mypurecloud.com'}
                                    onChange={e => setFormState({ ...formState, details: { ...formState.details, region: e.target.value } })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #fdba74', background: 'white' }}
                                >
                                    <option value="mypurecloud.com">Americas (US East)</option>
                                    <option value="usw2.pure.cloud">Americas (US West)</option>
                                    <option value="mypurecloud.ie">EMEA (Ireland)</option>
                                    <option value="euw2.pure.cloud">EMEA (London)</option>
                                    <option value="mypurecloud.de">EMEA (Frankfurt)</option>
                                    <option value="mypurecloud.jp">APAC (Japan)</option>
                                    <option value="mypurecloud.com.au">APAC (Australia)</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Standard Fields */}
                    {integration.provider !== 'Genesys Cloud' && (
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#334155' }}>
                                {integration.provider.includes('Unifonic') ? 'AppSid (Required)' : 'Authentication Config (API Key / Token)'}
                            </label>
                            <input
                                type="text"
                                value={formState.api_key}
                                onChange={e => setFormState({ ...formState, api_key: e.target.value })}
                                placeholder={integration.provider.includes('Unifonic') ? "e.g. dY2397564nsjfgwtSDE" : (integration.provider === 'Power BI' ? "Enter a unique Secret Key here..." : "e.g. sk_live_...")}
                                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1em' }}
                            />
                            <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#94a3b8' }}>
                                {integration.provider.includes('Unifonic') ? 'Your unique Unifonic App Identifier. Keep this secret.' : 'This key is encrypted securely.'}
                            </p>
                        </div>
                    )}

                    {/* Unifonic Specific Fields */}
                    {integration.provider.includes('Unifonic') && (
                        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                            <h3 style={{ marginTop: 0, color: '#334155', fontSize: '1.1em' }}>SMS Settings</h3>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#475569' }}>Sender ID (Optional)</label>
                                <input
                                    type="text"
                                    value={formState.details?.sender_id || ''}
                                    onChange={e => setFormState({ ...formState, details: { ...formState.details, sender_id: e.target.value } })}
                                    placeholder="YourBrand"
                                    style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                />
                                <p style={{ fontSize: '0.85em', color: '#94a3b8', marginTop: '4px' }}>Must be pre-approved by Unifonic. Defaults to VTrustX if empty.</p>
                            </div>

                            <div style={{ padding: '12px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa', fontSize: '0.9em', color: '#c2410c' }}>
                                <strong>⚠️ Important:</strong> Unifonic requires HTTPS. Valid certificates are handled automatically; you do not need to upload `https.zip`.
                            </div>
                        </div>
                    )}

                    {integration.provider !== 'Power BI' && integration.provider !== 'Genesys Cloud' && !integration.provider.includes('Unifonic') && (
                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#334155' }}>Webhook URL (Optional)</label>
                            <input
                                type="text"
                                value={formState.webhook_url}
                                onChange={e => setFormState({ ...formState, webhook_url: e.target.value })}
                                placeholder="https://api.example.com/webhook"
                                style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1em' }}
                            />
                        </div>
                    )}

                    {/* Power BI Specific Instructions */}
                    {integration.provider === 'Power BI' && formState.api_key && (
                        <div style={{ marginTop: '30px', padding: '25px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fcd34d' }}>
                            <h3 style={{ margin: '0 0 15px 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '8px' }}>🚀 How to Connect Power BI</h3>
                            <ol style={{ paddingLeft: '20px', margin: 0, color: '#92400e', lineHeight: '1.6' }}>
                                <li>Open Power BI Desktop.</li>
                                <li>Click on <strong>"Get Data"</strong> and select <strong>"Web"</strong>.</li>
                                <li>Copy and paste the URL below into the dialog:</li>
                            </ol>
                            <div style={{ marginTop: '15px', background: 'white', padding: '15px', borderRadius: '8px', border: '1px dashed #d97706', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <code style={{ fontSize: '1.1em', color: '#d97706' }}>/api/reports/powerbi?secret={formState.api_key}</code>
                                <button onClick={() => navigator.clipboard.writeText(`/api/reports/powerbi?secret=${formState.api_key}`)} style={{ padding: '6px 12px', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px', color: '#c2410c', cursor: 'pointer' }}>Copy</button>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSave} style={{ padding: '14px 30px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer', boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)' }}>Save Configuration</button>
                    </div>

                </div>
            </div>
        </div>
    );
}
