import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Info, LayoutTemplate } from 'lucide-react';

export function PersonaDescriptionBlock({ persona, setPersona }) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    const updateAttribute = (field, value) => {
        setPersona(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div style={{ background: '#0f172a', color: '#cbd5e1', borderTop: '1px solid #1e293b' }}>
            {/* Header / Toggle */}
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                style={{
                    padding: '10px 40px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85em',
                    fontWeight: 600,
                    letterSpacing: '1px',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    userSelect: 'none'
                }}
            >
                {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                <span>Persona Description</span>
            </div>

            {!isCollapsed && (
                <div style={{ padding: '0 40px 30px 40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>

                    {/* Goals Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75em', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <span style={{ color: '#0e7490' }}>::</span> Goals
                        </div>
                        <textarea
                            value={persona.goals || ''}
                            onChange={(e) => updateAttribute('goals', e.target.value)}
                            placeholder="Describe why you are building this persona. Set clear goals..."
                            style={{
                                flex: 1,
                                minHeight: '180px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                padding: '15px',
                                color: '#e2e8f0',
                                fontSize: '0.9em',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#0e7490'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Scope Summary Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75em', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <span style={{ color: '#0e7490' }}>::</span> Scope Summary
                        </div>
                        <textarea
                            value={persona.scope || ''}
                            onChange={(e) => updateAttribute('scope', e.target.value)}
                            placeholder="Describe scenarios or use cases requiring this persona..."
                            style={{
                                flex: 1,
                                minHeight: '180px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                padding: '15px',
                                color: '#e2e8f0',
                                fontSize: '0.9em',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#0e7490'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Legend Block */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75em', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <span style={{ color: '#0e7490' }}>::</span> Legend
                        </div>
                        <textarea
                            value={persona.legend || ''}
                            onChange={(e) => updateAttribute('legend', e.target.value)}
                            placeholder={"e.g.\n◆ Problems\n◆ Solutions"}
                            style={{
                                flex: 1,
                                minHeight: '180px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '8px',
                                padding: '15px',
                                color: '#e2e8f0',
                                fontSize: '0.9em',
                                lineHeight: '1.6',
                                resize: 'none',
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif",
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={e => e.target.style.borderColor = '#0e7490'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                    </div>

                    {/* Add Block Placeholder */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ height: '1.2em' }}></div> {/* Spacer for header consistency */}
                        <div style={{
                            flex: 1,
                            minHeight: '180px',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#475569',
                            fontSize: '0.8em',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: 'transparent'
                        }}
                            onMouseOver={e => { e.currentTarget.style.borderColor = '#64748b'; e.currentTarget.style.color = '#94a3b8'; }}
                            onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#475569'; }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <Plus size={20} />
                                + ADD BLOCK
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
