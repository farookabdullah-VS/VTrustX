import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function WorkflowView({ form, onBack }) {
    const [workflows, setWorkflows] = useState([]);
    const [integrations, setIntegrations] = useState([]);
    const [view, setView] = useState('list'); // 'list' or 'edit'
    const [currentWorkflow, setCurrentWorkflow] = useState(null);

    useEffect(() => {
        loadWorkflows();

        // Load Integrations for dropdown usage in Editor
        axios.get('/api/integrations')
            .then(res => setIntegrations(res.data.filter(i => i.is_active)))
            .catch(console.error);
    }, [form.id]);

    const loadWorkflows = () => {
        axios.get(`/api/workflows?formId=${form.id}`)
            .then(res => setWorkflows(res.data))
            .catch(err => console.log('Workflows not found or empty'));
    };

    const handleSave = (workflow) => {
        if (workflow.id) {
            axios.put(`/api/workflows/${workflow.id}`, workflow)
                .then(() => { loadWorkflows(); setView('list'); });
        } else {
            axios.post(`/api/workflows`, { ...workflow, formId: form.id })
                .then(() => { loadWorkflows(); setView('list'); });
        }
    };

    const handleDelete = (id) => {
        if (confirm("Delete workflow?")) {
            axios.delete(`/api/workflows/${id}`)
                .then(loadWorkflows);
        }
    };

    return (
        <div style={{ padding: '30px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>⬅ Back</button>

            {view === 'list' ? (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h1>Workflows & Automation</h1>
                        <button
                            onClick={() => { setCurrentWorkflow({}); setView('edit'); }}
                            style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            + Add Workflow
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                        {workflows.map(wf => (
                            <div key={wf.id} style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px 0' }}>{wf.name}</h3>
                                    <div style={{ color: '#64748b' }}>{wf.description}</div>
                                    <div style={{ marginTop: '10px', fontSize: '0.9em', background: '#f1f5f9', display: 'inline-block', padding: '4px 8px', borderRadius: '4px' }}>
                                        ⚡ {wf.trigger_event}
                                    </div>
                                    <div style={{ marginTop: '5px', fontSize: '0.8em', color: '#64748b' }}>
                                        Actions: {wf.actions.map(a => a.type).join(', ')}
                                    </div>
                                </div>
                                <div>
                                    <button onClick={() => { setCurrentWorkflow(wf); setView('edit'); }} style={{ padding: '8px', marginRight: '10px' }}>✏️</button>
                                    <button onClick={() => handleDelete(wf.id)} style={{ padding: '8px', color: 'red' }}>🗑️</button>
                                </div>
                            </div>
                        ))}
                        {workflows.length === 0 && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>No workflows configured.</div>}
                    </div>
                </div>
            ) : (
                <WorkflowEditor
                    initialData={currentWorkflow}
                    onSave={handleSave}
                    onCancel={() => setView('list')}
                    formDefinition={form.definition}
                    integrations={integrations}
                />
            )}
        </div>
    );
}

function WorkflowEditor({ initialData, onSave, onCancel, formDefinition, integrations }) {
    const [data, setData] = useState({
        name: initialData.name || '',
        description: initialData.description || '',
        trigger_event: initialData.trigger_event || 'submission_completed',
        conditions: initialData.conditions || [],
        actions: initialData.actions || [{ type: 'send_email', to: '', subject: '', body: '', from: 'contact@crux360.ai' }]
    });

    const questions = (formDefinition.pages || []).flatMap(p => p.elements || []).map(e => ({ name: e.name, title: e.title || e.name }));

    const updateAction = (idx, field, value) => {
        const newActions = [...data.actions];
        newActions[idx] = { ...newActions[idx], [field]: value };
        setData({ ...data, actions: newActions });
    };

    const addAction = () => {
        setData({ ...data, actions: [...data.actions, { type: 'send_email' }] });
    };

    const removeAction = (idx) => {
        setData({ ...data, actions: data.actions.filter((_, i) => i !== idx) });
    };

    return (
        <div style={{ background: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h2 style={{ marginTop: 0 }}>{initialData.id ? 'Edit Workflow' : 'New Workflow'}</h2>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Name of the Workflow</label>
                <input style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: '600', marginBottom: '5px' }}>Description</label>
                <textarea style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} value={data.description} onChange={e => setData({ ...data, description: e.target.value })} rows={2} />
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '10px' }}>⚡ EVENT</strong>
                <select
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={data.trigger_event}
                    onChange={e => setData({ ...data, trigger_event: e.target.value })}
                >
                    <option value="submission_completed">When Submission is completed</option>
                    <option value="email_sent">When email is sent</option>
                </select>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                <strong style={{ display: 'block', marginBottom: '10px' }}>🔍 DEFINE CONDITIONS</strong>
                {data.conditions.map((cond, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <select style={{ flex: 1, padding: '8px' }} value={cond.field} onChange={e => {
                            const newConds = [...data.conditions];
                            newConds[i].field = e.target.value;
                            setData({ ...data, conditions: newConds });
                        }}>
                            <option value="">Select Question</option>
                            {questions.map(q => <option key={q.name} value={q.name}>{q.title}</option>)}
                        </select>
                        <select style={{ flex: 1, padding: '8px' }} value={cond.operator} onChange={e => {
                            const newConds = [...data.conditions];
                            newConds[i].operator = e.target.value;
                            setData({ ...data, conditions: newConds });
                        }}>
                            <option value="equals">Equals</option>
                            <option value="contains">Contains</option>
                        </select>
                        <input style={{ flex: 1, padding: '8px' }} placeholder="Value" value={cond.value} onChange={e => {
                            const newConds = [...data.conditions];
                            newConds[i].value = e.target.value;
                            setData({ ...data, conditions: newConds });
                        }} />
                        <button onClick={() => setData({ ...data, conditions: data.conditions.filter((_, idx) => idx !== i) })} style={{ color: 'red' }}>×</button>
                    </div>
                ))}
                <button onClick={() => setData({ ...data, conditions: [...data.conditions, { field: '', operator: 'equals', value: '' }] })} style={{ fontSize: '0.9em', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>+ Add Condition</button>
            </div>

            {data.actions.map((action, i) => (
                <div key={i} style={{ marginBottom: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <strong style={{ color: '#0369a1' }}>🚀 ACTION {i + 1}</strong>
                        <button onClick={() => removeAction(i)} style={{ border: 'none', color: 'red', cursor: 'pointer' }}>Remove</button>
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Action Type</label>
                        <select
                            style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                            value={action.type}
                            onChange={e => updateAction(i, 'type', e.target.value)}
                        >
                            <option value="send_email">Send Email</option>
                            <option value="sync_integration">Sync to Integration</option>
                        </select>
                    </div>

                    {action.type === 'send_email' && (
                        <div style={{ display: 'grid', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>From</label>
                                <input style={{ width: '100%', padding: '8px' }} value={action.from} onChange={e => updateAction(i, 'from', e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>To</label>
                                    <input style={{ width: '100%', padding: '8px' }} value={action.to} onChange={e => updateAction(i, 'to', e.target.value)} placeholder="email@example.com" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>CC</label>
                                    <input style={{ width: '100%', padding: '8px' }} value={action.cc} onChange={e => updateAction(i, 'cc', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Subject</label>
                                <input style={{ width: '100%', padding: '8px' }} value={action.subject} onChange={e => updateAction(i, 'subject', e.target.value)} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Message Body</label>
                                <textarea style={{ width: '100%', padding: '8px', height: '100px' }} value={action.body} onChange={e => updateAction(i, 'body', e.target.value)} placeholder="Add your input here..." />
                            </div>
                        </div>
                    )}

                    {action.type === 'sync_integration' && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '5px' }}>Select Integration Platform</label>
                            <select
                                style={{ width: '100%', padding: '8px', borderRadius: '6px' }}
                                value={action.integration_id || ''}
                                onChange={e => updateAction(i, 'integration_id', e.target.value)}
                            >
                                <option value="">Select Platform</option>
                                {integrations.map(integ => (
                                    <option key={integ.id} value={integ.id}>{integ.provider}</option>
                                ))}
                            </select>
                            {integrations.length === 0 && <p style={{ fontSize: '0.8em', color: 'orange' }}>No active integrations found. Go to Integrations to connect.</p>}
                        </div>
                    )}
                </div>
            ))}

            <button onClick={addAction} style={{ marginBottom: '20px', padding: '10px', background: '#f1f5f9', border: '1px dashed #cbd5e1', width: '100%', cursor: 'pointer' }}>+ Add Another Action</button>

            <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => onSave(data)} style={{ padding: '12px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>Save Workflow</button>
                <button onClick={onCancel} style={{ padding: '12px 24px', background: 'none', border: '1px solid #cbd5e1', borderRadius: '8px' }}>Cancel</button>
            </div>
        </div>
    );
}
