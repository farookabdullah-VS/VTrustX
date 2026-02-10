import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Target, Eye, ChevronDown, Check } from 'lucide-react';

/**
 * PersonaSelector - Marketing Campaign Builder Integration
 * Allows marketers to target campaigns by persona with preview
 */
export function PersonaSelector({ onPersonaSelect, selectedPersonas = [] }) {
    const [availablePersonas, setAvailablePersonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [previewPersona, setPreviewPersona] = useState(null);
    const [audienceStats, setAudienceStats] = useState(null);

    useEffect(() => {
        fetchPersonas();
    }, []);

    useEffect(() => {
        if (selectedPersonas.length > 0) {
            fetchAudienceStats();
        }
    }, [selectedPersonas]);

    const fetchPersonas = async () => {
        setLoading(true);
        try {
            // Fetch unique persona IDs from assignments
            const res = await axios.get('/api/v1/persona/available-personas');
            setAvailablePersonas(res.data || []);
        } catch (err) {
            console.error('Failed to fetch personas:', err);
        }
        setLoading(false);
    };

    const fetchAudienceStats = async () => {
        try {
            const res = await axios.post('/api/v1/persona/audience-stats', {
                persona_ids: selectedPersonas
            });
            setAudienceStats(res.data);
        } catch (err) {
            console.error('Failed to fetch audience stats:', err);
        }
    };

    const handleTogglePersona = (personaId) => {
        const isSelected = selectedPersonas.includes(personaId);
        const newSelection = isSelected
            ? selectedPersonas.filter(id => id !== personaId)
            : [...selectedPersonas, personaId];

        onPersonaSelect(newSelection);
    };

    const handlePreview = (persona) => {
        setPreviewPersona(persona);
    };

    return (
        <div style={{ fontFamily: 'Inter, sans-serif' }}>
            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.9em', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Target size={16} />
                        Target Personas
                    </div>
                </label>

                {/* Dropdown Selector */}
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.95em',
                            color: '#1e293b',
                            transition: 'border-color 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    >
                        <span>
                            {selectedPersonas.length === 0
                                ? 'Select target personas...'
                                : `${selectedPersonas.length} persona${selectedPersonas.length > 1 ? 's' : ''} selected`
                            }
                        </span>
                        <ChevronDown size={18} style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {showDropdown && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '8px',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            maxHeight: '300px',
                            overflowY: 'auto'
                        }}>
                            {loading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                    Loading personas...
                                </div>
                            ) : availablePersonas.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                    No personas available
                                </div>
                            ) : (
                                availablePersonas.map((persona) => {
                                    const isSelected = selectedPersonas.includes(persona.id);
                                    return (
                                        <div
                                            key={persona.id}
                                            style={{
                                                padding: '12px 16px',
                                                borderBottom: '1px solid #f1f5f9',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                transition: 'background 0.2s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                                        >
                                            <div
                                                onClick={() => handleTogglePersona(persona.id)}
                                                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}
                                            >
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    border: `2px solid ${isSelected ? '#3b82f6' : '#cbd5e1'}`,
                                                    background: isSelected ? '#3b82f6' : 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    {isSelected && <Check size={14} color="white" />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                                        {persona.id}
                                                    </div>
                                                    <div style={{ fontSize: '0.8em', color: '#64748b' }}>
                                                        {persona.count || 0} customers
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePreview(persona);
                                                }}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#f1f5f9',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85em',
                                                    color: '#475569',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}
                                            >
                                                <Eye size={14} />
                                                Preview
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Selected Personas Chips */}
                {selectedPersonas.length > 0 && (
                    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedPersonas.map(personaId => (
                            <div
                                key={personaId}
                                style={{
                                    padding: '6px 12px',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    border: '1px solid #93c5fd',
                                    borderRadius: '20px',
                                    fontSize: '0.85em',
                                    color: '#1e40af',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {personaId}
                                <button
                                    onClick={() => handleTogglePersona(personaId)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#1e40af',
                                        cursor: 'pointer',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Audience Stats */}
            {audienceStats && (
                <div style={{
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    border: '1px solid #86efac',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <Users size={18} color="#166534" />
                        <h4 style={{ margin: 0, color: '#166534' }}>Target Audience</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                        <div>
                            <div style={{ fontSize: '0.8em', color: '#15803d', marginBottom: '4px' }}>Total Reach</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#166534' }}>
                                {audienceStats.total_customers?.toLocaleString() || 0}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8em', color: '#15803d', marginBottom: '4px' }}>Avg. Lifetime Value</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#166534' }}>
                                ${audienceStats.avg_ltv?.toLocaleString() || 0}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8em', color: '#15803d', marginBottom: '4px' }}>Engagement Rate</div>
                            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#166534' }}>
                                {audienceStats.engagement_rate || 0}%
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Panel */}
            {previewPersona && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.5em', color: '#1e293b' }}>
                                {previewPersona.id}
                            </h3>
                            <button
                                onClick={() => setPreviewPersona(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5em',
                                    cursor: 'pointer',
                                    color: '#94a3b8'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.9em', color: '#64748b', marginBottom: '8px' }}>
                                Audience Size
                            </div>
                            <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3b82f6' }}>
                                {previewPersona.count?.toLocaleString() || 0}
                            </div>
                        </div>

                        {previewPersona.demographics && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ marginTop: 0, marginBottom: '12px', color: '#475569' }}>Demographics</h4>
                                <div style={{ display: 'grid', gap: '10px' }}>
                                    {Object.entries(previewPersona.demographics).map(([key, value]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#f8fafc', borderRadius: '6px' }}>
                                            <span style={{ color: '#64748b', fontSize: '0.9em' }}>{key}</span>
                                            <span style={{ fontWeight: '600', color: '#1e293b' }}>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '20px', padding: '15px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.85em', color: '#92400e' }}>
                                💡 <strong>Campaign Tip:</strong> This persona responds well to personalized content and mobile-first experiences.
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                handleTogglePersona(previewPersona.id);
                                setPreviewPersona(null);
                            }}
                            style={{
                                width: '100%',
                                marginTop: '20px',
                                padding: '12px',
                                background: '#0f172a',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            {selectedPersonas.includes(previewPersona.id) ? 'Remove from Campaign' : 'Add to Campaign'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PersonaSelector;
