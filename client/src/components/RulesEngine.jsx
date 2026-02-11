import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';

export function RulesEngine() {
    const toast = useToast();
    const [rules, setRules] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        trigger_event: 'ticket_created',
        conditions: [],
        actions: []
    });

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = () => {
        axios.get('/api/workflows')
            .then(res => setRules(res.data))
            .catch(e => console.error(e));
    };

    const handleAddCondition = () => {
        setFormData(prev => ({
            ...prev,
            conditions: [...prev.conditions, { field: 'priority', operator: 'equals', value: '' }]
        }));
    };

    const handleAddAction = () => {
        setFormData(prev => ({
            ...prev,
            actions: [...prev.actions, { type: 'send_notification', subject: '', message: '' }]
        }));
    };

    const handleSave = () => {
        axios.post('/api/workflows', formData)
            .then(() => {
                setIsCreating(false);
                loadRules();
                setFormData({ name: '', trigger_event: 'ticket_created', conditions: [], actions: [] });
            })
            .catch(e => toast.error("Failed to save: " + e.message));
    };

    const handleDelete = (id) => {
        if (!confirm("Delete rule?")) return;
        axios.delete(`/api/workflows/${id}`)
            .then(loadRules);
    }

    /* Render Logic Helpers */
    const updateCondition = (idx, field, val) => {
        const newConds = [...formData.conditions];
        newConds[idx][field] = val;
        setFormData({ ...formData, conditions: newConds });
    };

    const updateAction = (idx, field, val) => {
        const newActs = [...formData.actions];
        newActs[idx][field] = val;
        setFormData({ ...formData, actions: newActs });
    };

    if (isCreating) {
        return (
            <div style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <h2>Create Automation Rule</h2>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Rule Name</label>
                    <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px', marginTop: '5px' }} />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontWeight: 'bold' }}>Trigger</label>
                    <select value={formData.trigger_event} onChange={e => setFormData({ ...formData, trigger_event: e.target.value })} style={{ width: '100%', padding: '8px', marginTop: '5px' }}>
                        <option value="ticket_created">Ticket Created</option>
                        <option value="ticket_updated">Ticket Updated</option>
                    </select>
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>IF (Conditions)</strong>
                        <button onClick={handleAddCondition} style={{ fontSize: '0.8em', cursor: 'pointer' }}>+ Add Condition</button>
                    </div>
                    {formData.conditions.map((c, i) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select value={c.field} onChange={e => updateCondition(i, 'field', e.target.value)} style={{ padding: '5px' }}>
                                <option value="priority">Priority</option>
                                <option value="status">Status</option>
                                <option value="channel">Channel</option>
                            </select>
                            <select value={c.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} style={{ padding: '5px' }}>
                                <option value="equals">Equals</option>
                                <option value="not_equals">Not Equals</option>
                            </select>
                            <input value={c.value} onChange={e => updateCondition(i, 'value', e.target.value)} placeholder="Value (e.g. high)" style={{ flex: 1, padding: '5px' }} />
                            <button onClick={() => {
                                const newC = formData.conditions.filter((_, idx) => idx !== i);
                                setFormData({ ...formData, conditions: newC });
                            }} style={{ color: 'red' }}>×</button>
                        </div>
                    ))}
                </div>

                <div style={{ marginBottom: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <strong>THEN (Actions)</strong>
                        <button onClick={handleAddAction} style={{ fontSize: '0.8em', cursor: 'pointer' }}>+ Add Action</button>
                    </div>
                    {formData.actions.map((a, i) => (
                        <div key={i} style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #ddd' }}>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
                                <select value={a.type} onChange={e => updateAction(i, 'type', e.target.value)} style={{ padding: '5px' }}>
                                    <option value="send_notification">Send In-App Notification</option>
                                    <option value="update_field">Update Field</option>
                                </select>
                                <button onClick={() => {
                                    const newA = formData.actions.filter((_, idx) => idx !== i);
                                    setFormData({ ...formData, actions: newA });
                                }} style={{ color: 'red', marginLeft: 'auto' }}>×</button>
                            </div>

                            {a.type === 'send_notification' && (
                                <div style={{ display: 'grid', gap: '5px' }}>
                                    <input placeholder="Subject" value={a.subject} onChange={e => updateAction(i, 'subject', e.target.value)} style={{ padding: '5px' }} />
                                    <input placeholder="Message" value={a.message} onChange={e => updateAction(i, 'message', e.target.value)} style={{ padding: '5px' }} />
                                </div>
                            )}
                            {a.type === 'update_field' && (
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input placeholder="Field (e.g. priority)" value={a.field} onChange={e => updateAction(i, 'field', e.target.value)} style={{ padding: '5px', flex: 1 }} />
                                    <input placeholder="Value (e.g. urgent)" value={a.value} onChange={e => updateAction(i, 'value', e.target.value)} style={{ padding: '5px', flex: 1 }} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save Rule</button>
                    <button onClick={() => setIsCreating(false)} style={{ padding: '10px 20px', background: 'none', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0 }}>⚙️ Workflows & Automation</h1>
                    <p style={{ color: '#64748b', margin: '5px 0 0' }}>Automate actions based on ticket events.</p>
                </div>
                <button onClick={() => setIsCreating(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>+ New Rule</button>
            </div>

            <div style={{ display: 'grid', gap: '15px' }}>
                {rules.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: '12px' }}>No rules active. Create one to get started!</div>}
                {rules.map(r => (
                    <div key={r.id} style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{r.name}</div>
                            <div style={{ fontSize: '0.9em', color: '#64748b' }}>When <strong>{r.trigger_event}</strong></div>
                            <div style={{ fontSize: '0.85em', color: '#475569', marginTop: '5px' }}>
                                {r.conditions?.length > 0 ? `${r.conditions.length} conditions` : 'No conditions'} • {r.actions?.length || 0} actions
                            </div>
                        </div>
                        <button onClick={() => handleDelete(r.id)} style={{ color: '#ef4444', background: 'none', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Delete</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
