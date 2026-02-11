import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, List, Map as MapIcon, Activity, FileText, Play, Shield, AlertTriangle, Save, RefreshCw, Trash2 } from 'lucide-react';
import { EnhancedAuditLogViewer } from './EnhancedAuditLogViewer';
import { SkeletonTable } from '../common/Skeleton';

const Card = ({ children, style }) => (
    <div style={{ background: 'var(--card-bg)', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '20px', marginBottom: '20px', border: '1px solid var(--input-border)', color: 'var(--text-color)', ...style }}>
        {children}
    </div>
);

const Button = ({ children, onClick, variant = 'primary', style }) => {
    const baseStyle = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' };
    const variants = {
        primary: { background: 'var(--primary-color)', color: 'white' },
        secondary: { background: 'var(--sidebar-bg)', color: 'var(--text-color)', border: '1px solid var(--input-border)' },
        danger: { background: '#fee2e2', color: '#ef4444' },
        success: { background: '#dcfce7', color: '#166534' }
    };
    return <button onClick={onClick} style={{ ...baseStyle, ...variants[variant], ...style }}>{children}</button>;
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: active ? '2px solid var(--primary-color)' : '2px solid transparent',
            color: active ? 'var(--text-color)' : 'var(--text-muted)',
            fontWeight: active ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '0.95em'
        }}
    >
        <Icon size={18} /> {label}
    </button>
);

export function PersonaEngineDashboard() {
    const [activeTab, setActiveTab] = useState('config'); // config, logs, health, simulator
    const [configTab, setConfigTab] = useState('params'); // params, lists, maps
    const [data, setData] = useState({ parameters: [], lists: [], maps: [] });
    const [loading, setLoading] = useState(false);

    // Refresh Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/v1/persona/configuration');
            setData(res.data);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab === 'config') fetchData();
    }, [activeTab]);

    // Update Handlers
    const handleUpdateParam = async (key, value, type) => {
        const reason = prompt("Enter reason for change (Audit Log):");
        if (!reason) return;
        await axios.post('/v1/persona/parameters', { key, value, type, reason });
        fetchData();
    };

    const handleUpdateList = async (key, values) => {
        const reason = prompt("Enter reason for change (Audit Log):");
        if (!reason) return;
        await axios.post('/v1/persona/lists', { key, values, reason });
        fetchData();
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Outfit, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8em', color: 'var(--text-color)' }}>GCC Persona Engine</h1>
                    <div style={{ color: 'var(--text-muted)', marginTop: '5px' }}>v1.0 | Authorized Access Only</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8em', fontWeight: 'bold' }}>Operational</span>
                </div>
            </div>

            {/* Main Tabs */}
            <div style={{ borderBottom: '1px solid var(--input-border)', marginBottom: '20px', display: 'flex' }}>
                <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={Settings} label="Configuration" />
                <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={FileText} label="Audit Logs" />
                <TabButton active={activeTab === 'health'} onClick={() => setActiveTab('health')} icon={Activity} label="System Health" />
                <TabButton active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} icon={Play} label="Simulator / Test" />
            </div>

            {/* CONFIGURATION TAB */}
            {activeTab === 'config' && (
                <div>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <Button variant={configTab === 'params' ? 'primary' : 'secondary'} onClick={() => setConfigTab('params')}>Parameters</Button>
                        <Button variant={configTab === 'lists' ? 'primary' : 'secondary'} onClick={() => setConfigTab('lists')}>Lists</Button>
                        <Button variant={configTab === 'maps' ? 'primary' : 'secondary'} onClick={() => setConfigTab('maps')}>Lookup Maps</Button>
                        <div style={{ flex: 1 }}></div>
                        <Button variant="secondary" onClick={fetchData}><RefreshCw size={16} /> Refresh</Button>
                    </div>

                    {loading ? (
                        <SkeletonTable rows={8} cols={5} />
                    ) : (
                        <>
                            {configTab === 'params' && (
                                <Card>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--input-border)', textAlign: 'left' }}>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Parameter Key</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Value</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Type</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Last Updated</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.parameters.map(p => (
                                                <tr key={p.key} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-color)' }}>{p.key}</td>
                                                    <td style={{ padding: '10px', color: 'var(--text-color)' }}>{p.value}</td>
                                                    <td style={{ padding: '10px' }}><span style={{ background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8em', color: 'var(--text-color)', border: '1px solid var(--input-border)' }}>{p.data_type}</span></td>
                                                    <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.9em' }}>{new Date(p.last_updated).toLocaleString()}</td>
                                                    <td style={{ padding: '10px' }}>
                                                        <button
                                                            onClick={() => {
                                                                const newVal = prompt(`Edit value for ${p.key}`, p.value);
                                                                if (newVal !== null && newVal !== p.value) handleUpdateParam(p.key, newVal, p.data_type);
                                                            }}
                                                            style={{ color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div style={{ marginTop: '20px' }}>
                                        <Button variant="success" onClick={() => {
                                            const key = prompt("New Parameter Key:");
                                            if (key) handleUpdateParam(key, "0", "string");
                                        }}>+ Add New Parameter</Button>
                                    </div>
                                </Card>
                            )}

                            {configTab === 'lists' && (
                                <Card>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--input-border)', textAlign: 'left' }}>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>List Key</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Values</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Last Updated</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.lists.map(l => (
                                                <tr key={l.key} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-color)' }}>{l.key}</td>
                                                    <td style={{ padding: '10px' }}>
                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                            {(l.values || []).map((v, i) => (
                                                                <span key={i} style={{ background: 'var(--input-bg)', color: 'var(--text-color)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.85em', border: '1px solid var(--input-border)' }}>{v}</span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.9em' }}>{new Date(l.last_updated).toLocaleString()}</td>
                                                    <td style={{ padding: '10px' }}>
                                                        <button
                                                            onClick={() => {
                                                                const newVal = prompt(`Enter comma-separated values for ${l.key}`, (l.values || []).join(', '));
                                                                if (newVal !== null) handleUpdateList(l.key, newVal.split(',').map(s => s.trim()));
                                                            }}
                                                            style={{ color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            Edit
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                            {configTab === 'maps' && (
                                <Card>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '2px solid var(--input-border)', textAlign: 'left' }}>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Map Key</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Lookup Key</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Value</th>
                                                <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Last Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.maps.map(m => (
                                                <tr key={m.id} style={{ borderBottom: '1px solid var(--input-border)' }}>
                                                    <td style={{ padding: '10px', fontWeight: 'bold', color: 'var(--text-color)' }}>{m.map_key}</td>
                                                    <td style={{ padding: '10px', color: 'var(--text-color)' }}>{m.lookup_key}</td>
                                                    <td style={{ padding: '10px', color: 'var(--text-color)' }}>{m.value}</td>
                                                    <td style={{ padding: '10px', color: 'var(--text-muted)', fontSize: '0.9em' }}>{new Date(m.last_updated).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* SIMULATOR TAB */}
            {activeTab === 'simulator' && <PersonaSimulator />}

            {/* LOGS TAB */}
            {activeTab === 'logs' && <EnhancedAuditLogViewer />}

            {/* HEALTH TAB */}
            {activeTab === 'health' && <HealthDashboard />}

        </div>
    );
}

function PersonaSimulator() {
    const [input, setInput] = useState({ nationality: 'SA', age: 28, income: 15000, gender: 'Male', city: 'Riyadh' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleAssign = async () => {
        setLoading(true);
        try {
            // Use mock profile ID
            const profileId = 'SIM_' + Date.now();
            const res = await axios.post(`/v1/persona/profiles/${profileId}/assign-personas`, {
                data: input,
                consent: true
            });
            setResult(res.data);
        } catch (err) {
            setResult({ error: err.response?.data?.error || err.message });
        }
        setLoading(false);
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card>
                <h3>Simulation Input</h3>
                <div style={{ display: 'grid', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>Nationality</label>
                        <select
                            value={input.nationality}
                            onChange={e => setInput({ ...input, nationality: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                        >
                            <option value="SA">Saudi Arabia</option>
                            <option value="AE">UAE</option>
                            <option value="KW">Kuwait</option>
                            <option value="OM">Oman</option>
                            <option value="BH">Bahrain</option>
                            <option value="QA">Qatar</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>Age</label>
                        <input
                            type="number"
                            value={input.age}
                            onChange={e => setInput({ ...input, age: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>Monthly Income (Local Currency)</label>
                        <input
                            type="number"
                            value={input.income}
                            onChange={e => setInput({ ...input, income: parseInt(e.target.value) })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em', color: 'var(--text-muted)' }}>Gender</label>
                        <select
                            value={input.gender}
                            onChange={e => setInput({ ...input, gender: e.target.value })}
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--text-color)' }}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>
                    <Button onClick={handleAssign} disabled={loading}>{loading ? 'Processing...' : 'Assign Persona'}</Button>
                </div>
            </Card>

            <Card>
                <h3>Result</h3>
                {result ? (
                    result.error ? (
                        <div style={{ color: 'red' }}>⚠️ {result.error}</div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '3em', margin: '20px 0' }}>👤</div>
                            <div style={{ marginBottom: '10px' }}><strong>Assigned Personas:</strong></div>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                                {result.assignedPersonas.map(p => (
                                    <span key={p} style={{ background: 'var(--primary-color)', color: 'white', padding: '6px 12px', borderRadius: '20px', fontWeight: 'bold' }}>{p}</span>
                                ))}
                            </div>
                            <pre style={{ background: 'var(--sidebar-bg)', padding: '10px', borderRadius: '6px', fontSize: '0.8em', overflowX: 'auto', border: '1px solid var(--input-border)', color: 'var(--text-color)' }}>
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )
                ) : <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Run simulation to see results.</div>}
            </Card>
        </div>
    );
}

function AuditLogViewer() {
    const [logs, setLogs] = useState([]);
    useEffect(() => {
        axios.get('/v1/persona/audit-logs').then(res => setLogs(res.data)).catch(console.error);
    }, []);

    return (
        <Card>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                <thead>
                    <tr style={{ background: 'var(--sidebar-bg)', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Timestamp</th>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Action</th>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Profile / Entity</th>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Changed By</th>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Reason</th>
                        <th style={{ padding: '12px', color: 'var(--text-muted)' }}>Details</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--input-border)' }}>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleString()}</td>
                            <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--text-color)' }}>{log.action}</td>
                            <td style={{ padding: '12px', color: 'var(--text-color)' }}>{log.profile_id || 'System'}</td>
                            <td style={{ padding: '12px', color: 'var(--text-color)' }}>{log.changed_by}</td>
                            <td style={{ padding: '12px', color: 'var(--text-color)' }}>{log.reason}</td>
                            <td style={{ padding: '12px', color: 'var(--text-muted)' }}><div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</div></td>
                        </tr>
                    ))}
                    {logs.length === 0 && <tr><td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No logs found.</td></tr>}
                </tbody>
            </table>
        </Card>
    );
}

function HealthDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const fetchHealth = () => axios.get('/v1/persona/health').then(res => setStats(res.data)).catch(console.error);
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!stats) return <div>Loading System Metrics...</div>;

    const cards = [
        { label: 'Uptime', value: `${(stats.uptime / 3600).toFixed(2)} hrs`, status: 'ok' },
        { label: 'DB Latency', value: `${stats.dbLatency} ms`, status: stats.dbLatency < 100 ? 'ok' : 'warn' },
        { label: 'Profiles Processed', value: stats.profilesProcessed, status: 'ok' },
        { label: 'Engine Status', value: stats.status, status: stats.status === 'Operational' ? 'ok' : 'err' }
    ];

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {cards.map((c, i) => (
                <Card key={i} style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9em', textTransform: 'uppercase', marginBottom: '10px' }}>{c.label}</div>
                    <div style={{ fontSize: '2em', fontWeight: 'bold', color: c.status === 'ok' ? '#166534' : c.status === 'warn' ? '#d97706' : '#dc2626' }}>{c.value}</div>
                    <div style={{ marginTop: '10px' }}>
                        {c.status === 'ok' ? <Shield size={20} color="#166534" /> : <AlertTriangle size={20} color="#d97706" />}
                    </div>
                </Card>
            ))}
        </div>
    );
}
