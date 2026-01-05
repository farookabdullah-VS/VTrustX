import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';

export function PersonaHeader({ persona, setPersona }) {
    // Helper to update fields
    const update = (field, value) => {
        setPersona(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
            {/* Left: Photo */}
            <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }}>
                {persona.photoUrl ? (
                    <img src={persona.photoUrl} alt="Persona" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '4px solid #334155' }} />
                ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #475569' }}>
                        <Camera size={32} color="#94a3b8" />
                    </div>
                )}
                <button style={{ position: 'absolute', bottom: 0, right: 0, background: '#0e7490', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Middle: Name & Tagline */}
            <div style={{ flex: 1 }}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ fontSize: '0.75em', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>PERSONA NAME</label>
                    <input
                        value={persona.name}
                        onChange={e => update('name', e.target.value)}
                        placeholder="e.g. Fahad Al-Mutairi"
                        style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #334155', color: 'white', fontSize: '2em', fontWeight: 'bold', padding: '5px 0', marginTop: '5px', outline: 'none' }}
                    />
                </div>
                <div>
                    <input
                        value={persona.tagline || ''}
                        onChange={e => update('tagline', e.target.value)}
                        placeholder="Tagline (e.g. The Responsible Provider)"
                        style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', color: '#cbd5e1', fontSize: '1.2em', padding: '5px 0', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Right: Stats (Market Size & Type) */}
            <div style={{ width: '250px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <div>
                        <div style={{ fontSize: '0.75em', color: '#94a3b8' }}>MARKET SIZE</div>
                        <input
                            type="number"
                            value={persona.marketSize || 0}
                            onChange={e => update('marketSize', parseInt(e.target.value))}
                            style={{ width: '60px', background: 'transparent', border: 'none', color: 'white', fontSize: '1.5em', fontWeight: 'bold' }}
                        />
                        <span style={{ color: '#64748b', fontSize: '1em' }}>%</span>
                    </div>
                    {/* Circle viz placeholder */}
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #0f172a', borderTop: '4px solid #0e7490', transform: 'rotate(45deg)' }}></div>
                </div>

                <div>
                    <div style={{ fontSize: '0.75em', color: '#94a3b8', marginBottom: '5px' }}>TYPE</div>
                    <select
                        value={persona.type}
                        onChange={e => update('type', e.target.value)}
                        style={{ width: '100%', background: '#1e293b', color: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #334155', outline: 'none' }}>
                        <option value="Rational">Rational</option>
                        <option value="Guardian">Guardian</option>
                        <option value="Artisan">Artisan</option>
                        <option value="Idealist">Idealist</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
