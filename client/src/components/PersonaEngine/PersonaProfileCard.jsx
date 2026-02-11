import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Trash2, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from '../common/Toast';

/**
 * PersonaProfileCard - Displays assigned personas on customer profiles
 * Integrates with Customer360 to show persona tags, audit logs, and actions
 */
export function PersonaProfileCard({ profileId, customerData }) {
    const toast = useToast();
    const [personas, setPersonas] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [removing, setRemoving] = useState(false);

    useEffect(() => {
        if (profileId) {
            loadPersonaData();
        }
    }, [profileId]);

    const loadPersonaData = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/persona/profiles/${profileId}`);
            setPersonas(res.data.personas || []);
            setAuditLogs(res.data.audit_logs || []);
        } catch (err) {
            console.error('Failed to load persona data:', err);
        }
        setLoading(false);
    };

    const handleRecalculate = async () => {
        setLoading(true);
        try {
            await axios.post(`/api/v1/persona/profiles/${profileId}/assign-personas`, {
                consent: true
            });
            await loadPersonaData();
            toast.success('Persona recalculated successfully!');
        } catch (err) {
            toast.error('Failed to recalculate: ' + (err.response?.data?.error || err.message));
        }
        setLoading(false);
    };

    const handleRemovePersona = async (personaId) => {
        if (!confirm('Remove this persona assignment? This will be logged for compliance.')) return;

        setRemoving(true);
        try {
            await axios.delete(`/api/v1/persona/profiles/${profileId}/personas`, {
                data: { persona_id: personaId, reason: 'User requested removal' }
            });
            await loadPersonaData();
            toast.success('Persona removed and logged.');
        } catch (err) {
            toast.error('Failed to remove: ' + (err.response?.data?.error || err.message));
        }
        setRemoving(false);
    };

    const handleExport = () => {
        const exportData = {
            profile_id: profileId,
            customer_name: customerData?.profile?.full_name,
            personas: personas,
            audit_logs: auditLogs,
            exported_at: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `persona_export_${profileId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading && personas.length === 0) {
        return (
            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <div style={{ color: '#64748b' }}>Loading persona data...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }}>
            {/* Left: Assigned Personas */}
            <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0 }}>Assigned Personas</h3>
                    <button
                        onClick={handleRecalculate}
                        disabled={loading}
                        style={{
                            padding: '8px 12px',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: loading ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.85em',
                            fontWeight: '600',
                            color: '#475569',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={14} />
                        Recalculate
                    </button>
                </div>

                {personas.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <AlertCircle size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                        <div style={{ color: '#94a3b8', marginBottom: '20px' }}>
                            No personas assigned yet.
                        </div>
                        <button
                            onClick={handleRecalculate}
                            style={{
                                padding: '12px 24px',
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Run Persona Engine
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {personas.map((persona, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '20px',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    borderRadius: '16px',
                                    border: '2px solid #93c5fd',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        background: '#3b82f6',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.5em',
                                        fontWeight: 'bold'
                                    }}>
                                        {persona.persona_id?.substring(0, 2).toUpperCase() || '👤'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1em', color: '#1e40af' }}>
                                            {persona.persona_id}
                                        </div>
                                        <div style={{ fontSize: '0.85em', color: '#64748b' }}>
                                            Assigned: {new Date(persona.assigned_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>

                                {persona.score && (
                                    <div style={{ marginBottom: '10px' }}>
                                        <div style={{ fontSize: '0.8em', color: '#64748b', marginBottom: '5px' }}>
                                            Match Score
                                        </div>
                                        <div style={{ background: '#f1f5f9', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
                                            <div style={{
                                                width: `${persona.score}%`,
                                                height: '100%',
                                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                                transition: 'width 0.3s'
                                            }} />
                                        </div>
                                        <div style={{ fontSize: '0.85em', color: '#3b82f6', fontWeight: 'bold', marginTop: '5px' }}>
                                            {persona.score}% Match
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                                    <button
                                        onClick={() => setShowLogs(!showLogs)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: 'white',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '0.85em',
                                            fontWeight: '600',
                                            color: '#475569',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px'
                                        }}
                                    >
                                        <Eye size={14} />
                                        View Logs
                                    </button>
                                    <button
                                        onClick={() => handleRemovePersona(persona.persona_id)}
                                        disabled={removing}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            background: '#fee2e2',
                                            border: '1px solid #fecaca',
                                            borderRadius: '8px',
                                            cursor: removing ? 'default' : 'pointer',
                                            fontSize: '0.85em',
                                            fontWeight: '600',
                                            color: '#dc2626',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            opacity: removing ? 0.6 : 1
                                        }}
                                    >
                                        <Trash2 size={14} />
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={handleExport}
                            style={{
                                marginTop: '10px',
                                padding: '12px',
                                background: 'white',
                                border: '2px dashed #cbd5e1',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontSize: '0.9em',
                                fontWeight: '600',
                                color: '#64748b',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            <Download size={16} />
                            Export for Compliance
                        </button>
                    </div>
                )}
            </div>

            {/* Right: Audit Logs & Engine Inputs */}
            <div style={{ display: 'grid', gap: '20px' }}>
                {/* Engine Inputs */}
                <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ marginTop: 0 }}>Engine Inputs</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        {[
                            { label: 'Nationality', value: customerData?.profile?.nationality },
                            { label: 'Citizen Status', value: customerData?.profile?.is_citizen ? 'Citizen' : 'Expat' },
                            { label: 'City Tier', value: customerData?.profile?.city_tier },
                            { label: 'Monthly Income', value: Number(customerData?.profile?.monthly_income_local || 0).toLocaleString() },
                            { label: 'Employment', value: customerData?.profile?.employment_sector },
                            { label: 'Family Status', value: customerData?.profile?.family_status }
                        ].map((item, idx) => (
                            <div key={idx} style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.8em', color: '#94a3b8' }}>{item.label}</div>
                                <div style={{ fontWeight: '600' }}>{item.value || 'N/A'}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Logs */}
                {showLogs && (
                    <div style={{ background: 'white', padding: '30px', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0 }}>Assignment History</h3>
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {auditLogs.length === 0 ? (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                                    No audit logs found.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {auditLogs.map((log, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '15px',
                                                background: '#f8fafc',
                                                borderRadius: '12px',
                                                borderLeft: '4px solid #3b82f6'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                                    {log.action}
                                                </div>
                                                <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </div>
                                            </div>
                                            {log.details && (
                                                <div style={{ fontSize: '0.85em', color: '#475569' }}>
                                                    {typeof log.details === 'object'
                                                        ? JSON.stringify(log.details, null, 2)
                                                        : log.details
                                                    }
                                                </div>
                                            )}
                                            {log.reason && (
                                                <div style={{ fontSize: '0.8em', color: '#64748b', marginTop: '5px', fontStyle: 'italic' }}>
                                                    Reason: {log.reason}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PersonaProfileCard;
