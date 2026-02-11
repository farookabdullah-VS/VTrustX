import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, MessageSquare, Smartphone, QrCode, Plus, Users, Send, CheckCircle } from 'lucide-react';
import { useToast } from './common/Toast';
import { SkeletonTable } from './common/Skeleton';

export function DistributionsView() {
    const toast = useToast();
    const [view, setView] = useState('list'); // list | create
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form Stats
    const [surveys, setSurveys] = useState([]);

    // Wizard State
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        type: 'email',
        surveyId: '',
        contacts: '', // Text area for manual entry or CSV
        subject: 'We want your feedback!',
        body: 'Hi {{name}},\n\nWe value your opinion. Please take a moment to answer our survey:\n\n{{link}}\n\nThanks,\nThe Team'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [campRes, surRes] = await Promise.all([
                axios.get('/api/distributions'),
                axios.get('/api/forms')
            ]);
            setCampaigns(campRes.data);
            setSurveys(surRes.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        // Parse contacts
        // Simple CSV parse: email,name
        const lines = formData.contacts.split('\n');
        const contactsList = lines.map(l => {
            const [email, name] = l.split(',');
            if (email && email.includes('@')) return { email: email.trim(), name: name ? name.trim() : '' };
            return null;
        }).filter(Boolean);

        if (contactsList.length === 0) {
            toast.warning("Please add at least one valid recipient.");
            return;
        }

        try {
            await axios.post('/api/distributions', {
                ...formData,
                contacts: contactsList
            });
            toast.success("Campaign Scheduled!");
            setView('list');
            loadData();
        } catch (e) {
            toast.error("Failed to create campaign");
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'email': return <Mail size={20} />;
            case 'sms': return <Smartphone size={20} />;
            case 'whatsapp': return <MessageSquare size={20} />;
            case 'qr': return <QrCode size={20} />;
            default: return <Mail size={20} />;
        }
    };

    if (view === 'create') {
        return (
            <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <h2 style={{ marginBottom: '20px' }}>New Campaign</h2>

                {/* Steps Indicator */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
                    {[1, 2, 3].map(s => (
                        <div key={s} style={{
                            flex: 1, height: '4px',
                            background: s <= step ? 'var(--primary-color)' : '#e2e8f0',
                            borderRadius: '2px'
                        }} />
                    ))}
                </div>

                {step === 1 && (
                    <div>
                        <h3>1. Campaign Details</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Campaign Name</label>
                            <input
                                value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                                placeholder="e.g. Spring 2026 Feedback"
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Survey</label>
                            <select
                                value={formData.surveyId} onChange={e => setFormData({ ...formData, surveyId: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                            >
                                <option value="">Select Survey...</option>
                                {surveys.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                            </select>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Channel</label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {['email', 'sms', 'qr'].map(t => (
                                    <div key={t}
                                        onClick={() => setFormData({ ...formData, type: t })}
                                        style={{
                                            padding: '10px 20px', border: '1px solid',
                                            borderColor: formData.type === t ? 'var(--primary-color)' : '#e2e8f0',
                                            background: formData.type === t ? '#eff6ff' : 'white',
                                            color: formData.type === t ? 'var(--primary-color)' : '#64748b',
                                            borderRadius: '8px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: 'bold'
                                        }}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            disabled={!formData.name || !formData.surveyId}
                            onClick={() => setStep(2)}
                            style={{
                                marginTop: '20px', padding: '12px 24px', background: 'var(--primary-color)', color: 'white',
                                border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', float: 'right'
                            }}
                        >
                            Next &rarr;
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div>
                        <h3>2. Audience</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Recipients (CSV Format: email,name)</label>
                            <textarea
                                value={formData.contacts} onChange={e => setFormData({ ...formData, contacts: e.target.value })}
                                style={{ width: '100%', minHeight: '200px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'monospace' }}
                                placeholder={`john@example.com, John Doe\nsarah@test.com, Sarah Smith`}
                            />
                            <p style={{ color: '#64748b', fontSize: '0.9em' }}>
                                Tips: You can paste from Excel. Ensure each line has an email.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                            <button onClick={() => setStep(1)} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                            <button
                                disabled={!formData.contacts}
                                onClick={() => setStep(3)}
                                style={{ padding: '12px 24px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Next &rarr;
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div>
                        <h3>3. Compose & Send</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Subject Line</label>
                            <input
                                value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                            />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Email Body</label>
                            <textarea
                                value={formData.body} onChange={e => setFormData({ ...formData, body: e.target.value })}
                                style={{ width: '100%', minHeight: '200px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontFamily: 'sans-serif' }}
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, body: formData.body + ' {{name}}' })}>+ Name</span>
                                <span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, body: formData.body + ' {{link}}' })}>+ Survey Link</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                            <button onClick={() => setStep(2)} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer' }}>Back</button>
                            <button
                                onClick={handleCreate}
                                style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Send size={18} /> Launch Campaign
                            </button>
                        </div>
                    </div>
                )}

            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Distributions</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Manage your survey campaigns and outreach.</p>
                </div>
                <button
                    onClick={() => setView('create')}
                    style={{
                        background: 'var(--primary-color)', color: 'white', border: 'none', padding: '12px 24px',
                        borderRadius: '8px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                    }}
                >
                    <Plus size={20} /> Create Campaign
                </button>
            </div>

            {loading ? (
                <SkeletonTable rows={5} cols={6} />
            ) : (
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Name</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Type</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Status</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Recipients</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Performance</th>
                                <th style={{ textAlign: 'left', padding: '16px', color: '#64748b' }}>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '16px', fontWeight: '600' }}>{c.name}</td>
                                    <td style={{ padding: '16px', textTransform: 'capitalize' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {getTypeIcon(c.type)} {c.type}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.85em', fontWeight: 'bold',
                                            background: c.status === 'Sent' ? '#dcfce7' : '#f1f5f9',
                                            color: c.status === 'Sent' ? '#166534' : '#64748b'
                                        }}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px' }}>{c.sent_count}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.75em', color: '#64748b' }}>OPEN RATE</div>
                                                <div style={{ fontWeight: 'bold' }}>{c.open_rate}%</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.75em', color: '#64748b' }}>RESP RATE</div>
                                                <div style={{ fontWeight: 'bold' }}>{c.response_rate}%</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {campaigns.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No campaigns yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
