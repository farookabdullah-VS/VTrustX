import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Mail, MessageSquare, AlertTriangle, Plus, Play, Clock, CheckCircle, Ticket, Trash2 } from 'lucide-react';

export function WorkflowView({ form, onBack }) {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newWf, setNewWf] = useState({
        name: '',
        trigger: { type: 'survey_response', condition: 'nps <= 6' },
        actions: [{ type: 'email', target: '', subject: 'New Alert', body: '' }]
    });

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = () => {
        axios.get('/api/workflows')
            .then(res => {
                setWorkflows(res.data);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this workflow?')) {
            try {
                await axios.delete(`/api/workflows/${id}`);
                loadWorkflows();
            } catch (e) {
                alert('Failed to delete workflow');
            }
        }
    };

    const handleRun = async (id) => {
        try {
            await axios.post(`/api/workflows/${id}/run`);
            alert('Workflow Triggered Successfully!');
            loadWorkflows(); // Refresh stats
        } catch (e) {
            alert('Failed to run workflow');
        }
    };

    const handleCreate = async () => {
        try {
            // Map client state to server expected schema
            const payload = {
                ...newWf,
                formId: form?.id,
                trigger_event: newWf.trigger.type,
                conditions: [{ type: 'expression', expression: newWf.trigger.condition }]
            };
            await axios.post('/api/workflows', payload);
            setIsCreating(false);
            loadWorkflows();
            setNewWf({
                name: '',
                trigger: { type: 'survey_response', condition: 'nps <= 6' },
                actions: [{ type: 'email', target: '', subject: 'New Alert', body: '' }]
            });
        } catch (e) {
            alert('Error creating workflow');
        }
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Workflow Automation</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Manage automated actions based on survey triggers.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    {onBack && (
                        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', color: '#475569', fontWeight: 'bold' }}>
                            Back
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {/* Create New Card */}
                <div
                    onClick={() => setIsCreating(true)}
                    style={{
                        border: '2px dashed #cbd5e1', borderRadius: '16px', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center', minHeight: '200px', cursor: 'pointer',
                        color: '#64748b', background: '#f8fafc', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = '#3b82f6'}
                    onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                >
                    <Plus size={32} />
                    <span style={{ fontWeight: '600', marginTop: '10px' }}>Create Workflow</span>
                </div>

                {workflows.map(wf => (
                    <div key={wf.id} style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '10px', color: '#3b82f6' }}>
                                    <Zap size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{wf.name}</h3>
                                    <span style={{ fontSize: '0.8rem', color: wf.active ? '#16a34a' : '#94a3b8', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {wf.active ? <CheckCircle size={10} /> : null} {wf.active ? 'Active' : 'Paused'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleRun(wf.id)} title="Test Run" style={{ background: '#f0f9ff', border: 'none', padding: '8px', borderRadius: '50%', color: '#0369a1', cursor: 'pointer' }}>
                                    <Play size={16} fill="currentColor" />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(wf.id, e)}
                                    title="Delete Workflow"
                                    style={{ background: '#fef2f2', border: 'none', padding: '8px', borderRadius: '50%', color: '#ef4444', cursor: 'pointer' }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                            <div style={{ fontWeight: '600', color: '#475569', marginBottom: '4px' }}>IF...</div>
                            <div style={{ color: '#1e293b', fontFamily: 'monospace' }}>
                                {wf.trigger?.type || wf.trigger_event || 'Response'} ({wf.trigger?.condition || 'all'})
                            </div>
                        </div>

                        <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem' }}>
                            <div style={{ fontWeight: '600', color: '#166534', marginBottom: '4px' }}>THEN...</div>
                            {(wf.actions || []).map((act, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    {act?.type === 'email' && <Mail size={14} />}
                                    {act?.type === 'ticket' && <Ticket size={14} />}
                                    {act?.type === 'email_respondent' && <MessageSquare size={14} />}
                                    <span>{act?.subject || act?.description || act?.type || 'Action'}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> Last run: {wf.stats?.lastRun ? new Date(wf.stats.lastRun).toLocaleString() : 'Never'}
                            </div>
                            <div>Runs: <strong>{wf.stats?.runs || 0}</strong></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CREATE MODAL */}
            {isCreating && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '100%', maxWidth: '600px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginBottom: '24px' }}>New Custom Workflow</h2>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px' }}>Workflow Name</label>
                            <input
                                value={newWf.name} onChange={e => setNewWf({ ...newWf, name: e.target.value })}
                                style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', background: 'white' }}
                                placeholder="e.g. CEO Alert for Escalations"
                            />
                        </div>

                        <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#3b82f6', fontWeight: 'bold' }}>
                                <AlertTriangle size={18} /> STEP 1: TRIGGER
                            </div>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <select
                                    value={newWf.trigger.type} onChange={e => setNewWf({ ...newWf, trigger: { ...newWf.trigger, type: e.target.value } })}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', background: 'white' }}
                                >
                                    <option value="survey_response">Survey Response Received</option>
                                    <option value="negative_sentiment">AI Detects Negative Sentiment</option>
                                    <option value="ticket_overdue">Ticket Becomes Overdue</option>
                                </select>
                                <input
                                    value={newWf.trigger.condition} onChange={e => setNewWf({ ...newWf, trigger: { ...newWf.trigger, condition: e.target.value } })}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', background: 'white' }}
                                    placeholder="Condition (e.g. nps <= 3)"
                                />
                            </div>
                        </div>

                        <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#16a34a', fontWeight: 'bold' }}>
                                <Zap size={18} /> STEP 2: ACTION
                            </div>
                            <div style={{ display: 'grid', gap: '15px' }}>
                                <select
                                    value={newWf.actions[0].type} onChange={e => {
                                        const acts = [...newWf.actions];
                                        acts[0].type = e.target.value;
                                        setNewWf({ ...newWf, actions: acts });
                                    }}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', background: 'white' }}
                                >
                                    <option value="email">Send Internal Email</option>
                                    <option value="ticket">Create CRM Ticket</option>
                                    <option value="slack">Push to Slack (Webhook)</option>
                                    <option value="email_respondent">Email Customer</option>
                                </select>
                                <input
                                    value={newWf.actions[0].subject} onChange={e => {
                                        const acts = [...newWf.actions];
                                        acts[0].subject = e.target.value;
                                        setNewWf({ ...newWf, actions: acts });
                                    }}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#1e293b', background: 'white' }}
                                    placeholder="Subject / Ticket Title"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleCreate}
                                disabled={!newWf.name}
                                style={{ flex: 1, padding: '14px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: newWf.name ? 1 : 0.5 }}
                            >
                                Activate Workflow
                            </button>
                            <button onClick={() => setIsCreating(false)} style={{ padding: '14px 24px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', cursor: 'pointer', color: '#64748b', fontWeight: 'bold' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

}
