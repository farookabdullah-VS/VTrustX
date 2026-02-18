import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Fingerprint, Shield, ShieldCheck, ShieldAlert, Users, Database, FileText, Lock, Eye, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function IdentityView() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalIdentities: 0,
        goldenRecords: 0,
        resolutionRate: 0,
        totalConsents: 0,
        optInRate: 0,
        pendingDSARs: 0
    });

    const [complianceData, setComplianceData] = useState([]);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, complianceRes, logsRes] = await Promise.all([
                    axios.get('/api/identity/stats'),
                    axios.get('/api/identity/compliance'),
                    axios.get('/api/identity/consent-logs')
                ]);

                setStats(statsRes.data);
                setComplianceData(complianceRes.data);
                setLogs(logsRes.data);
            } catch (error) {
                console.error('Failed to fetch identity data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper to format database time
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} mins ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;

        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px', flexDirection: 'column', gap: '20px' }}>
                <div className="spin" style={{ width: '40px', height: '40px', border: '4px solid var(--primary-color)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                <p style={{ color: 'var(--text-muted)', fontWeight: '500' }}>Loading identity intelligence...</p>
                <style>{`
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', fontFamily: "'Outfit', sans-serif", color: 'var(--text-color)' }}>
            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2em', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Fingerprint size={32} color="var(--primary-color)" />
                    {t('sidebar.item.identity')}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1em' }}>
                    Manage customer identity resolution, golden records, and unified consent across all touchpoints.
                </p>
            </div>

            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <StatCard
                    icon={<Users color="#3b82f6" />}
                    label="Total Resolved Identities"
                    value={stats.totalIdentities.toLocaleString()}
                    trend="+5.2%"
                />
                <StatCard
                    icon={<Database color="#8b5cf6" />}
                    label="Golden Records"
                    value={stats.goldenRecords.toLocaleString()}
                    trend="+2.1%"
                />
                <StatCard
                    icon={<CheckCircle2 color="#10b981" />}
                    label="Resolution Accuracy"
                    value={`${stats.resolutionRate}%`}
                    trend="Stable"
                />
                <StatCard
                    icon={<ShieldCheck color="#f59e0b" />}
                    label="Consent Opt-in Rate"
                    value={`${stats.optInRate}%`}
                    trend="+1.5%"
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                {/* Left Column: Resolution Rules & Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Lock size={20} /> Identity Resolution Rules
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <RuleItem name="Email Deterministic Match" status="Active" priority="Highest" />
                            <RuleItem name="Phone Number Exact Match" status="Active" priority="High" />
                            <RuleItem name="Fuzzy Name + DOB Match" status="Active" priority="Medium" />
                            <RuleItem name="Device Fingerprint Correlation" status="Testing" priority="Low" />
                        </div>
                        <button style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '8px', background: 'var(--primary-color)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                            Configure Rules
                        </button>
                    </div>

                    <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FileText size={20} /> Recent Consent Logs
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--divider-color)', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                                    <th style={{ padding: '10px' }}>Customer ID</th>
                                    <th style={{ padding: '10px' }}>Action</th>
                                    <th style={{ padding: '10px' }}>Channel</th>
                                    <th style={{ padding: '10px' }}>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.length > 0 ? (
                                    logs.map(log => (
                                        <LogRow
                                            key={log.id}
                                            id={log.customer_id.substring(0, 8)}
                                            action={log.action}
                                            channel={log.channel}
                                            time={formatTime(log.time)}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No recent consent logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Compliance & DSAR */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Compliance Status</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {complianceData.map(item => (
                                <div key={item.id}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95em' }}>
                                        <span>{item.name}</span>
                                        <span style={{ fontWeight: '600', color: item.status === 'compliant' ? '#10b981' : '#f59e0b' }}>
                                            {item.score}%
                                        </span>
                                    </div>
                                    <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${item.score}%`,
                                            background: item.status === 'compliant' ? '#10b981' : '#f59e0b',
                                            borderRadius: '4px'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '25px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldAlert size={20} /> Action Required
                        </h3>
                        <div style={{ padding: '15px', background: 'white', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.95em', marginBottom: '5px' }}>{stats.pendingDSARs} Pending DSAR Requests</div>
                            <div style={{ fontSize: '0.85em', color: '#64748b' }}>Data Subject Access Requests must be processed within 30 days.</div>
                            <button style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ef4444', color: '#ef4444', background: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                Review Requests
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.9em', color: '#64748b' }}>
                            <AlertCircle size={16} /> Last Audit: Yesterday
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, trend }) {
    return (
        <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.9em', marginBottom: '10px' }}>
                {icon} {label}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '1.8em', fontWeight: '700' }}>{value}</div>
                <div style={{ fontSize: '0.85em', color: trend.startsWith('+') ? '#10b981' : '#64748b', fontWeight: '600' }}>{trend}</div>
            </div>
        </div>
    );
}

function RuleItem({ name, status, priority }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '10px' }}>
            <div style={{ fontWeight: '500' }}>{name}</div>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', fontSize: '0.85em' }}>
                <span style={{ color: 'var(--text-muted)' }}>Priority: {priority}</span>
                <span style={{
                    padding: '2px 8px', borderRadius: '12px',
                    background: status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: status === 'Active' ? '#10b981' : '#f59e0b',
                    fontWeight: '700'
                }}>
                    {status}
                </span>
            </div>
        </div>
    );
}

function LogRow({ id, action, channel, time }) {
    return (
        <tr style={{ borderBottom: '1px solid var(--divider-color)', fontSize: '0.95em' }}>
            <td style={{ padding: '12px', fontWeight: '500' }}>{id}</td>
            <td style={{ padding: '12px' }}>{action}</td>
            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{channel}</td>
            <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{time}</td>
        </tr>
    );
}
