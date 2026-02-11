import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from './common/Toast';

export function TicketSettings() {
    const toast = useToast();
    // STATE
    const [slaPolicies, setSlaPolicies] = useState([]);
    const [channels, setChannels] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [rules, setRules] = useState([]);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('rules'); // rules, sla, channels, templates
    const [loading, setLoading] = useState(false);

    // Form States
    const [newRule, setNewRule] = useState({ keyword: '', assigned_user_id: '' });
    const [newChannel, setNewChannel] = useState({ name: '', email: '', host: '', port: '993', username: '', password: '', is_secure: true });
    const [editingTemplate, setEditingTemplate] = useState(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [slaRes, chanRes, tplRes, rulesRes, usersRes] = await Promise.all([
                axios.get('/api/settings/sla'),
                axios.get('/api/settings/channels'),
                axios.get('/api/settings/email-templates'),
                axios.get('/api/settings/assignment-rules'),
                axios.get('/api/users')
            ]);

            // SLA Merge Logic
            const defaults = [
                { priority: 'low', response_time_minutes: 240, resolution_time_minutes: 2880 },
                { priority: 'medium', response_time_minutes: 120, resolution_time_minutes: 1440 },
                { priority: 'high', response_time_minutes: 60, resolution_time_minutes: 480 },
                { priority: 'urgent', response_time_minutes: 30, resolution_time_minutes: 240 }
            ];

            if (slaRes.data.length > 0) {
                const merged = defaults.map(def => {
                    const found = slaRes.data.find(r => r.priority === def.priority);
                    return found ? found : def;
                });
                setSlaPolicies(merged);
            } else {
                setSlaPolicies(defaults);
            }

            setChannels(chanRes.data);
            setTemplates(tplRes.data);
            setRules(rulesRes.data);
            setUsers(usersRes.data);
        } catch (e) {
            console.error("Failed to load settings:", e);
        } finally {
            setLoading(false);
        }
    };

    // --- HANDLERS: Rules ---
    const handleAddRule = () => {
        if (!newRule.keyword || !newRule.assigned_user_id) { toast.warning("Fill all fields"); return; }
        axios.post('/api/settings/assignment-rules', newRule)
            .then(() => {
                toast.success("Rule Added");
                setNewRule({ keyword: '', assigned_user_id: '' });
                loadData();
            })
            .catch(e => toast.error(e.message));
    };

    const handleDeleteRule = (id) => {
        if (!window.confirm("Sure?")) return;
        axios.delete(`/api/settings/assignment-rules/${id}`)
            .then(loadData)
            .catch(e => toast.error(e.message));
    };

    // --- HANDLERS: SLA ---
    const handleSaveSLA = () => {
        axios.post('/api/settings/sla', slaPolicies)
            .then(() => toast.success("SLA Saved"))
            .catch(e => toast.error(e.message));
    };

    // --- HANDLERS: Channels ---
    const handleAddChannel = () => {
        axios.post('/api/settings/channels', newChannel)
            .then(() => { toast.success("Channel Added"); loadData(); })
            .catch(e => toast.error(e.message));
    };

    // --- HANDLERS: Templates ---
    const handleSaveTemplate = (tpl) => {
        axios.put(`/api/settings/email-templates/${tpl.id}`, tpl)
            .then(() => { toast.success("Template Saved"); setEditingTemplate(null); loadData(); })
            .catch(e => toast.error(e.message));
    };

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <h1 style={{ marginBottom: '10px' }}>🎟️ Ticketing Configuration</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Manage automation, SLAs, email integration, and assignment logic.</p>

            {/* TABS */}
            <div style={{ display: 'flex', gap: '20px', borderBottom: '2px solid #e2e8f0', marginBottom: '30px' }}>
                {['rules', 'sla', 'channels', 'templates'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px',
                            background: 'none',
                            border: 'none',
                            borderBottom: activeTab === tab ? '2px solid #2563eb' : 'none',
                            color: activeTab === tab ? '#2563eb' : '#64748b',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '-2px',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab === 'rules' ? 'Auto-Assignment' : tab}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}

            {/* 1. AUTO-ASSIGNMENT RULES */}
            {activeTab === 'rules' && (
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ marginTop: 0 }}>Keyword-Based Assignment</h2>
                    <p style={{ color: '#64748b' }}>If a ticket subject contains the keyword, assign it to a specific user automatically.</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '15px', marginBottom: '30px', background: '#f8fafc', padding: '20px', borderRadius: '8px' }}>
                        <input
                            placeholder="Keyword (e.g. 'printer')"
                            value={newRule.keyword}
                            onChange={e => setNewRule({ ...newRule, keyword: e.target.value })}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                        <select
                            value={newRule.assigned_user_id}
                            onChange={e => setNewRule({ ...newRule, assigned_user_id: e.target.value })}
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="">Select User...</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                        </select>
                        <button onClick={handleAddRule} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add Rule</button>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '10px' }}>Keyword</th>
                                <th style={{ padding: '10px' }}>Assign To</th>
                                <th style={{ padding: '10px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px' }}>
                                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '4px', fontSize: '0.9em' }}>{r.keyword}</span>
                                    </td>
                                    <td style={{ padding: '15px' }}>{users.find(u => u.id === r.assigned_user_id)?.username || 'Unknown'}</td>
                                    <td style={{ padding: '15px' }}>
                                        <button onClick={() => handleDeleteRule(r.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 2. SLA POLICIES */}
            {activeTab === 'sla' && (
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ marginTop: 0 }}>Service Level Agreements (SLA)</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '10px' }}>Priority</th>
                                <th style={{ padding: '10px' }}>Response Time (min)</th>
                                <th style={{ padding: '10px' }}>Resolution Time (min)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slaPolicies.map((p, idx) => (
                                <tr key={p.priority} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '15px', fontWeight: 'bold' }}>{p.priority}</td>
                                    <td style={{ padding: '15px' }}>
                                        <input type="number" value={p.response_time_minutes}
                                            onChange={e => {
                                                const list = [...slaPolicies];
                                                list[idx].response_time_minutes = parseInt(e.target.value);
                                                setSlaPolicies(list);
                                            }}
                                            style={{ width: '80px', padding: '5px' }} />
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <input type="number" value={p.resolution_time_minutes}
                                            onChange={e => {
                                                const list = [...slaPolicies];
                                                list[idx].resolution_time_minutes = parseInt(e.target.value);
                                                setSlaPolicies(list);
                                            }}
                                            style={{ width: '80px', padding: '5px' }} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{ marginTop: '20px', textAlign: 'right' }}>
                        <button onClick={handleSaveSLA} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save SLA Config</button>
                    </div>
                </div>
            )}

            {/* 3. EMAIL CHANNELS */}
            {activeTab === 'channels' && (
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h2>IMAP Email Channels</h2>
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px' }}>
                        <input placeholder="Name" value={newChannel.name} onChange={e => setNewChannel({ ...newChannel, name: e.target.value })} style={{ padding: '8px' }} />
                        <input placeholder="Email" value={newChannel.email} onChange={e => setNewChannel({ ...newChannel, email: e.target.value })} style={{ padding: '8px' }} />
                        <input placeholder="Host" value={newChannel.host} onChange={e => setNewChannel({ ...newChannel, host: e.target.value })} style={{ padding: '8px' }} />
                        <input placeholder="User" value={newChannel.username} onChange={e => setNewChannel({ ...newChannel, username: e.target.value })} style={{ padding: '8px' }} />
                        <input placeholder="Password" type="password" value={newChannel.password} onChange={e => setNewChannel({ ...newChannel, password: e.target.value })} style={{ padding: '8px' }} />
                        <button onClick={handleAddChannel} style={{ padding: '8px 16px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '4px' }}>Add</button>
                    </div>
                    <div>
                        {channels.map(c => (
                            <div key={c.id} style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                                <strong>{c.name}</strong> ({c.email}) - {c.host}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 4. TEMPLATES */}
            {activeTab === 'templates' && (
                <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h2>Email Templates</h2>
                    {loading && <p>Loading...</p>}
                    {!loading && templates.length === 0 && <p style={{ color: '#64748b' }}>No templates found. Please contact support.</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {templates.map(t => (
                            <div key={t.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', background: '#f8fafc' }}
                                onClick={() => setEditingTemplate({ ...t, activeTab: 'html' })}
                            >
                                <h3 style={{ margin: '0 0 10px 0', textTransform: 'capitalize' }}>{t.stage_name}</h3>
                                <div style={{ fontSize: '0.9em', color: '#64748b' }}>{t.subject_template}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODAL RE-USED FROM SYSTEM SETTINGS */}
            {editingTemplate && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ background: 'white', width: '800px', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                        <h3>Edit Template: {editingTemplate.stage_name}</h3>
                        <label>Subject</label>
                        <input value={editingTemplate.subject_template} onChange={e => setEditingTemplate({ ...editingTemplate, subject_template: e.target.value })} style={{ width: '100%', padding: '10px', marginBottom: '20px' }} />
                        <label>HTML Body</label>
                        <textarea value={editingTemplate.body_html} onChange={e => setEditingTemplate({ ...editingTemplate, body_html: e.target.value })} style={{ width: '100%', height: '300px', fontFamily: 'monospace' }} />
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button onClick={() => setEditingTemplate(null)} style={{ marginRight: '10px' }}>Cancel</button>
                            <button onClick={() => handleSaveTemplate(editingTemplate)} style={{ background: '#2563eb', color: 'white', padding: '10px 20px', border: 'none' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default TicketSettings;
