import React, { useState } from 'react';
import { Edit2, RefreshCw, Lightbulb, Check, ChevronDown, X, Camera, User, Settings, Palette, ZoomIn, Trash2, ArrowRightLeft } from 'lucide-react';

const PERSONALITY_TYPES = [
    { id: 'Rational', color: '#60A5FA', icon: '🧠', traits: 'Analytical, strategic, logical' }, // Blue
    { id: 'Artisan', color: '#FBBF24', icon: '🎨', traits: 'Spontaneous, creative, hands-on' }, // Amber
    { id: 'Guardian', color: '#818CF8', icon: '🛡️', traits: 'Responsible, organized, loyal' }, // Indigo
    { id: 'Idealist', color: '#A3E635', icon: '✨', traits: 'Empathetic, values-driven, visionary' } // Lime
];

export function PersonaHeader({ persona, setPersona }) {
    const [showTypeModal, setShowTypeModal] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingMarket, setIsEditingMarket] = useState(false);

    // Image Controls
    const [showImageOverlay, setShowImageOverlay] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Temp state for edits
    const [editName, setEditName] = useState(persona.name);
    const [marketValue, setMarketValue] = useState(persona.marketSize || 0);

    const update = (key, val) => setPersona(p => ({ ...p, [key]: val }));

    const handleNameGenerate = () => {
        const names = ["Alex Chen", "Sarah Miller", "Jordan Lee", "Casey Smith", "Riley Austin"];
        const random = names[Math.floor(Math.random() * names.length)];
        setEditName(random);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => update('avatar', reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleImageDelete = () => {
        if (window.confirm("Are you sure you want to delete this image?")) {
            update('avatar', null);
        }
    };

    const saveName = () => {
        update('name', editName);
        setIsEditingName(false);
    };

    const saveMarket = () => {
        update('marketSize', marketValue);
        setIsEditingMarket(false);
    };

    const getTypeColor = (typeId) => PERSONALITY_TYPES.find(t => t.id === typeId)?.color || '#e2e8f0';
    const getTypeIcon = (typeId) => PERSONALITY_TYPES.find(t => t.id === typeId)?.icon || '💡';

    return (
        <div style={{ display: 'flex', gap: '30px', fontFamily: "'Inter', sans-serif" }}>

            {/* COLUMN 1: IMAGE CARD */}
            <div
                style={{ width: '220px', height: '300px', background: '#f1f5f9', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', flexShrink: 0 }}
                onMouseEnter={() => setShowImageOverlay(true)}
                onMouseLeave={() => setShowImageOverlay(false)}
            >
                {/* Image Display */}
                {persona.avatar ? (
                    <img src={persona.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Persona" />
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '10px' }}>
                        <User size={64} style={{ opacity: 0.3 }} />
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>No Image</div>
                        <label style={{ padding: '8px 16px', background: 'white', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            Upload Photo
                            <input type="file" onChange={handleImageUpload} style={{ display: 'none' }} />
                        </label>
                    </div>
                )}

                {/* Hover Overlay (If Image Exists) */}
                {persona.avatar && showImageOverlay && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', color: 'white' }}>
                            {/* Preview */}
                            <div
                                onClick={() => setShowPreviewModal(true)}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '0 15px', cursor: 'pointer', transition: 'transform 0.1s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ border: '2px solid white', borderRadius: '50%', padding: '10px' }}><ZoomIn size={20} /></div>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Preview</span>
                            </div>

                            <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.3)' }}></div>

                            {/* Replace */}
                            <label
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '0 15px', cursor: 'pointer', transition: 'transform 0.1s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ border: '2px solid white', borderRadius: '50%', padding: '10px' }}><ArrowRightLeft size={20} /></div>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Replace</span>
                                <input type="file" onChange={handleImageUpload} style={{ display: 'none' }} />
                            </label>

                            <div style={{ width: '1px', height: '60px', background: 'rgba(255,255,255,0.3)' }}></div>

                            {/* Delete */}
                            <div
                                onClick={handleImageDelete}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', padding: '0 15px', cursor: 'pointer', transition: 'transform 0.1s' }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <div style={{ border: '2px solid white', borderRadius: '50%', padding: '10px' }}><Trash2 size={20} /></div>
                                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: '600' }}>Delete</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* COLUMN 2: INFO CARD */}
            <div style={{ flex: 1, background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                {/* ROW 1: NAME & MARKET */}
                <div style={{ display: 'flex', flex: 1, minHeight: '160px' }}>

                    {/* NAME */}
                    <div style={{ flex: 2, padding: '30px', borderRight: '1px solid #f1f5f9', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px', marginBottom: '8px' }}>NAME</div>
                        {!isEditingName ? (
                            <div
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                onClick={() => { setEditName(persona.name); setIsEditingName(true); }}
                            >
                                <div style={{ fontSize: '40px', fontWeight: '800', color: persona.nameColor || '#9F1239', lineHeight: '1.1' }}>{persona.name}</div>
                                <Edit2 size={20} color="#cbd5e1" />
                            </div>
                        ) : (
                            // Name Edit
                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', position: 'absolute', zIndex: 50, top: '20px', left: '20px', width: '300px' }}>
                                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }} autoFocus />
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <button onClick={handleNameGenerate} style={{ fontSize: '12px', color: '#0284c7', background: 'none', border: 'none', cursor: 'pointer' }}>Generate Random</button>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="color" value={persona.nameColor || '#9F1239'} onChange={e => update('nameColor', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', background: 'none' }} />
                                        <button onClick={saveName} style={{ padding: '6px 12px', background: '#0f172a', color: 'white', borderRadius: '4px', border: 'none', fontSize: '12px' }}>Save</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MARKET */}
                    <div style={{ flex: 1, padding: '30px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>MARKET SIZE</div>
                            <Settings size={16} color="#cbd5e1" style={{ cursor: 'pointer' }} onClick={() => setIsEditingMarket(!isEditingMarket)} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                background: `conic-gradient(#A3E635 0% ${(isEditingMarket ? marketValue : persona.marketSize) || 0}%, #f1f5f9 ${(isEditingMarket ? marketValue : persona.marketSize) || 0}% 100%)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)'
                            }}>
                                {/* Pie Chart - No Inner Circle */}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: '800', color: '#1e293b' }}>{(isEditingMarket ? marketValue : persona.marketSize) || 0}%</div>
                        </div>
                        {isEditingMarket && (
                            <div style={{ position: 'absolute', top: '80px', right: '30px', background: 'white', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '8px', zIndex: 50, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '8px' }}>Percentage</div>
                                <input type="range" min="0" max="100" value={marketValue} onChange={e => setMarketValue(Number(e.target.value))} style={{ width: '100%', marginBottom: '10px', accentColor: '#10B981' }} />
                                <button onClick={saveMarket} style={{ width: '100%', padding: '8px', background: '#0f172a', color: 'white', borderRadius: '4px', border: 'none' }}>Update</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ROW 2: TYPE */}
                <div
                    style={{ background: getTypeColor(persona.type), padding: '20px 30px', cursor: 'pointer', transition: 'background 0.3s' }}
                    onClick={() => setShowTypeModal(true)}
                >
                    <div style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#1e293b', opacity: 0.6, marginBottom: '5px' }}>TYPE</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{persona.type || 'Select Type'}</div>
                        <Lightbulb size={28} color="#1e293b" style={{ opacity: 0.8 }} />
                    </div>
                </div>
            </div>

            {/* PREVIEW MODAL */}
            {showPreviewModal && persona.avatar && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowPreviewModal(false)}
                >
                    <img src={persona.avatar} style={{ maxWidth: '90%', maxHeight: '90vh', borderRadius: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} alt="Preview" />
                    <button onClick={() => setShowPreviewModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', cursor: 'pointer' }}><X size={30} color="white" /></button>
                </div>
            )}

            {/* TYPE SELECTION MODAL (Existing) */}
            {showTypeModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: 'white', borderRadius: '16px', width: '600px', maxWidth: '90%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b' }}>Select Personality Type</div>
                            <button onClick={() => setShowTypeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={24} color="#64748b" /></button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            {PERSONALITY_TYPES.map(type => (
                                <div
                                    key={type.id}
                                    onClick={() => { update('type', type.id); setShowTypeModal(false); }}
                                    style={{
                                        padding: '20px', borderRadius: '12px', background: '#f8fafc',
                                        border: `2px solid ${persona.type === type.id ? type.color : 'transparent'}`,
                                        cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'white'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                        <div style={{ fontSize: '24px' }}>{type.icon}</div>
                                        <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '18px' }}>{type.id}</div>
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>{type.traits}</div>
                                    <div style={{ height: '8px', background: type.color, borderRadius: '4px', marginTop: '12px', opacity: 0.5 }}></div>
                                    {persona.type === type.id && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: type.color, color: 'white', borderRadius: '50%', padding: '4px' }}><Check size={12} /></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
