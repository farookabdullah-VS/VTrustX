import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function AIIntegrations() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ name: '', provider: 'openai', apiKey: '' });

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = () => {
        setLoading(true);
        axios.get('/api/ai-providers')
            .then(res => setProviders(res.data))
            .catch(err => alert("Failed to load providers: " + err.message))
            .finally(() => setLoading(false));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/ai-providers', form);
            setForm({ name: '', provider: 'openai', apiKey: '' });
            loadProviders();
        } catch (err) {
            alert("Error saving: " + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        try {
            await axios.delete(`/api/ai-providers/${id}`);
            loadProviders();
        } catch (err) {
            alert("Error deleting: " + err.message);
        }
    };

    const handleActivate = async (id) => {
        try {
            await axios.post(`/api/ai-providers/${id}/activate`);
            loadProviders();
        } catch (err) {
            alert("Error activating: " + err.message);
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', sans-serif", color: '#1e293b' }}>

            {/* Header Card - Unique Design */}
            <div style={{
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '24px',
                padding: '40px',
                marginBottom: '40px',
                border: '1px solid #ddd6fe',
                boxShadow: '0 10px 30px -10px rgba(139, 92, 246, 0.15)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '150px', opacity: 0.05, transform: 'rotate(15deg)', pointerEvents: 'none' }}>✨</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        width: '80px', height: '80px',
                        background: 'white',
                        borderRadius: '20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2.5em',
                        boxShadow: '0 10px 20px -5px rgba(109, 40, 217, 0.15)'
                    }}>
                        🤖
                    </div>
                    <div>
                        <h1 style={{ margin: '0 0 10px 0', fontSize: '2.2em', color: '#4c1d95', letterSpacing: '-0.02em' }}>AI Integrations</h1>
                        <p style={{ margin: 0, fontSize: '1.1em', color: '#6d28d9', opacity: 0.9 }}>
                            Configure your AI service providers to power smart summaries and insights.
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>

                {/* Add Provider Column */}
                <div>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        padding: '30px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                        border: '1px solid #e2e8f0',
                        position: 'sticky',
                        top: '20px'
                    }}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2em', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9em' }}>➕</span>
                            Add New Provider
                        </h3>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.95em', color: '#475569' }}>Friendly Name</label>
                                <input
                                    required
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Corporate OpenAI"
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1em', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc' }}
                                    onFocus={(e) => e.target.style.borderColor = '#8b5cf6'}
                                    onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.95em', color: '#475569' }}>Provider Platform</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={form.provider}
                                        onChange={e => setForm({ ...form, provider: e.target.value })}
                                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1em', appearance: 'none', background: '#f8fafc', cursor: 'pointer' }}
                                    >
                                        <option value="openai">OpenAI (GPT-4)</option>
                                        <option value="gemini">Google Gemini</option>
                                        <option value="anthropic">Anthropic Claude</option>
                                        <option value="mock">Mock Provider (Test)</option>
                                    </select>
                                    <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748b' }}>▼</div>
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '0.95em', color: '#475569' }}>API Key</label>
                                <input
                                    required
                                    type="password"
                                    value={form.apiKey}
                                    onChange={e => setForm({ ...form, apiKey: e.target.value })}
                                    placeholder="sk-..."
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1em', fontFamily: 'monospace', letterSpacing: '1px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                style={{
                                    padding: '14px',
                                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    marginTop: '10px',
                                    fontWeight: '600',
                                    fontSize: '1em',
                                    boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.1)',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                Add Connection
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Column */}
                <div>
                    <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2em', color: '#334155' }}>Configs ({providers.length})</h3>
                    {loading && <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading providers...</div>}
                    {!loading && providers.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #cbd5e1' }}>
                            <div style={{ fontSize: '2em', marginBottom: '10px' }}>🔌</div>
                            <div style={{ color: '#64748b' }}>No providers configured yet.</div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {providers.map(p => (
                            <div key={p.id} style={{
                                padding: '20px',
                                background: 'white',
                                border: p.isActive ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                borderRadius: '16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s',
                                boxShadow: p.isActive ? '0 10px 25px -5px rgba(139, 92, 246, 0.15)' : 'none'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{
                                        width: '48px', height: '48px',
                                        borderRadius: '12px',
                                        background: p.provider === 'openai' ? '#10a37f' : p.provider === 'gemini' ? '#4285f4' : '#64748b',
                                        color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '1.2em'
                                    }}>
                                        {p.provider === 'openai' ? '🤖' : p.provider === 'gemini' ? '💎' : '🔌'}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1em', color: '#1e293b' }}>{p.name}</div>
                                        <div style={{ fontSize: '0.9em', color: '#64748b', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ textTransform: 'capitalize' }}>{p.provider}</span>
                                            <span style={{ width: '4px', height: '4px', background: '#cbd5e1', borderRadius: '50%' }}></span>
                                            <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                {p.apiKey ? p.apiKey.substring(0, 4) + '...****' : '******'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    {/* Active Toggle Switch */}
                                    <div
                                        onClick={() => handleActivate(p.id)}
                                        style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '10px' }}
                                    >
                                        <span style={{ fontSize: '0.85em', fontWeight: '600', color: p.isActive ? '#7c3aed' : '#94a3b8' }}>
                                            {p.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <div
                                            style={{
                                                width: '44px', height: '24px',
                                                background: p.isActive ? '#8b5cf6' : '#cbd5e1',
                                                borderRadius: '24px',
                                                position: 'relative',
                                                transition: 'background 0.3s'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px', height: '18px',
                                                background: 'white',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                top: '3px',
                                                left: p.isActive ? '23px' : '3px',
                                                transition: 'left 0.3s',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                            }} />
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(p.id)}
                                        style={{
                                            width: '36px', height: '36px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: '#fee2e2',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '1em'
                                        }}
                                        title="Delete Provider"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
