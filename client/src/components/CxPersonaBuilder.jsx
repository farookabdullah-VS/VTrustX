import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User as UserIcon, MapPin, Briefcase, Calendar, Plus, GripVertical, Settings, Sparkles, Mic, FileText, ClipboardList } from 'lucide-react';

// --- BLOCK COMPONENTS (With Inline Edit) ---

const EditableTitle = ({ value, onChange, style }) => (
    <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Section Title"
        style={{
            fontSize: '1.1em',
            fontWeight: 'bold',
            color: '#0f172a',
            width: '100%',
            border: 'none',
            borderBottom: '2px dashed #cbd5e1',
            marginBottom: '10px',
            padding: '4px 0',
            background: 'transparent',
            outline: 'none',
            ...style
        }}
    />
);

const InlineTextEdit = ({ value, onChange, placeholder, style, aiEnabled = false, aiPrompt, aiContext }) => {
    const safeValue = (typeof value === 'string' || typeof value === 'number') ? value : '';
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(safeValue);
    const [loading, setLoading] = useState(false);

    useEffect(() => { setTempValue(safeValue); }, [safeValue]);

    const commit = () => {
        setIsEditing(false);
        if (tempValue !== safeValue) onChange(tempValue);
    };

    const handleAiGenerate = async (e) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent blur
        setLoading(true);
        try {
            const res = await axios.post('/api/ai/generate', {
                prompt: aiPrompt || "Generate a realistic, professional full name for a business persona. Return ONLY the name, no quotes."
            });
            const name = res.data.text.trim().replace(/^"|"$/g, '');
            setTempValue(name);
            onChange(name);
        } catch (err) {
            console.error(err);
            alert("AI Generation failed");
        }
        setLoading(false);
    };

    if (isEditing) {
        return (
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <input
                    autoFocus
                    value={tempValue}
                    onChange={e => setTempValue(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => { if (e.key === 'Enter') commit(); }}
                    style={{ ...style, width: '100%', paddingRight: aiEnabled ? '30px' : '0' }}
                    placeholder={placeholder}
                />
                {aiEnabled && (
                    <button
                        onMouseDown={handleAiGenerate}
                        style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#8b5cf6' }}
                        title="Generate with AI"
                    >
                        {loading ? '...' : <Sparkles size={16} />}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            style={{ ...style, cursor: 'pointer', borderBottom: '1px dashed transparent', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: style.textAlign === 'center' ? 'center' : 'flex-start', gap: '8px' }}
            title="Click to edit"
            onMouseEnter={e => {
                e.currentTarget.style.borderBottom = '1px dashed #cbd5e1';
                const hint = e.currentTarget.querySelector('.edit-hint');
                if (hint) hint.style.opacity = 1;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.borderBottom = '1px dashed transparent';
                const hint = e.currentTarget.querySelector('.edit-hint');
                if (hint) hint.style.opacity = 0;
            }}
        >
            {safeValue || <span style={{ opacity: 0.5 }}>{placeholder}</span>}
            <span className="edit-hint" style={{ fontSize: '0.5em', opacity: 0, transition: 'opacity 0.2s', color: '#94a3b8' }}>✏️</span>
        </div>
    );
};

// --- COMPONENTS with VISUAL ENHANCEMENTS ---

const PieChart = ({ percentage, color = '#bef264' }) => {
    const safePercent = (typeof percentage === 'number' || typeof percentage === 'string') ? percentage : 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: `conic-gradient(${color} 0% ${safePercent}%, #ecfccb ${safePercent}% 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Inner circle for donut chart look if desired, or plain pie */}
            </div>
            <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#475569' }}>{safePercent}%</div>
        </div>
    );
};

// Personality Type Selection Modal (Quadrant View)
const PersonalityTypeModal = ({ initialType, initialDesc, onClose, onSave }) => {
    const [type, setType] = useState(initialType || '');
    const [desc, setDesc] = useState(initialDesc || '');

    const types = [
        { id: 'Rational', label: 'Rational', x: 'left', y: 'top' },
        { id: 'Artisan', label: 'Artisan', x: 'right', y: 'top' },
        { id: 'Guardian', label: 'Guardian', x: 'left', y: 'bottom' },
        { id: 'Idealist', label: 'Idealist', x: 'right', y: 'bottom' },
    ];

    const handleSelect = (t) => {
        setType(t);
        let newDesc = "";
        if (t === 'Rational') newDesc = "Logic-driven decision maker.";
        if (t === 'Guardian') newDesc = "Protects stability and values.";
        if (t === 'Artisan') newDesc = "Creative and spontaneous.";
        if (t === 'Idealist') newDesc = "Values growth and harmony.";
        setDesc(newDesc);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'white', width: '500px', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>×</button>

                <h3 style={{ textAlign: 'center', margin: '0 0 30px 0', fontSize: '1.2em', letterSpacing: '0.05em', color: '#1e293b', textTransform: 'uppercase' }}>PERSONALITY / TYPE</h3>

                {/* Inputs */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', color: '#94a3b8', marginBottom: '5px' }}>Persona Type</label>
                    <input
                        value={type}
                        onChange={e => setType(e.target.value)}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1em', outline: 'none' }}
                    />
                </div>
                <div style={{ marginBottom: '30px' }}>
                    <label style={{ display: 'block', fontSize: '0.9em', color: '#94a3b8', marginBottom: '5px' }}>Description</label>
                    <input
                        value={desc}
                        onChange={e => setDesc(e.target.value)}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1em', outline: 'none' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    <span style={{ color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>Choose from personality types:</div>

                {/* Quadrant Grid */}
                <div style={{ position: 'relative', width: '300px', margin: '0 auto 40px auto' }}>
                    {/* Axis Labels */}
                    <div style={{ position: 'absolute', top: '-25px', width: '100%', textAlign: 'center', fontSize: '0.8em', color: '#cbd5e1' }}>quick</div>
                    <div style={{ position: 'absolute', bottom: '-25px', width: '100%', textAlign: 'center', fontSize: '0.8em', color: '#cbd5e1' }}>deliberate</div>
                    <div style={{ position: 'absolute', left: '-60px', top: '50%', transform: 'translateY(-50%)', width: '60px', textAlign: 'right', fontSize: '0.8em', color: '#cbd5e1', paddingRight: '10px', lineHeight: '1.2' }}>logical/ competitive</div>
                    <div style={{ position: 'absolute', right: '-60px', top: '50%', transform: 'translateY(-50%)', width: '60px', textAlign: 'left', fontSize: '0.8em', color: '#cbd5e1', paddingLeft: '10px', lineHeight: '1.2' }}>emotional/ humanistic</div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {types.map(t => (
                            <div
                                key={t.id}
                                onClick={() => handleSelect(t.id)}
                                style={{
                                    background: type === t.id ? '#0f172a' : '#94a3b8',
                                    color: 'white',
                                    padding: '15px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    borderRadius: '4px',
                                    fontSize: '0.9em',
                                    fontWeight: '500'
                                }}
                            >
                                {t.label}
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => onSave(type, desc)}
                        style={{ background: '#34d399', color: '#064e3b', fontWeight: 'bold', padding: '12px 60px', borderRadius: '30px', border: 'none', cursor: 'pointer', fontSize: '0.9em', letterSpacing: '0.05em' }}
                    >
                        DONE
                    </button>
                </div>
            </div>
        </div>
    );
};

// Photo Upload & AI Gen Modal
const PhotoUploadModal = ({ currentPhoto, onClose, onSave }) => {
    const [tab, setTab] = useState('preset'); // 'upload' | 'preset' | 'ai'
    const [filters, setFilters] = useState({ gender: 'All', ageStart: 18, ageEnd: 99, emotion: [], hair: [] });
    // Mock avatars for "Preset"
    const presets = [
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?fit=crop&w=150&h=150",
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?fit=crop&w=150&h=150",
        "https://images.unsplash.com/photo-1599566150163-29194dcaad36?fit=crop&w=150&h=150",
        "https://images.unsplash.com/photo-1527980965255-d3b416303d12?fit=crop&w=150&h=150",
        "https://images.unsplash.com/photo-1633332755192-727a05c4013d?fit=crop&w=150&h=150"
    ];
    const [selected, setSelected] = useState(null);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'white', width: '600px', padding: '30px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>×</button>

                <h3 style={{ textAlign: 'center', margin: '0 0 30px 0', fontSize: '1.2em', letterSpacing: '0.05em', color: '#1e293b', textTransform: 'uppercase' }}>ADD PERSONA'S PHOTO</h3>

                {/* Main Action - Upload */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <button style={{ border: '2px solid #34d399', color: '#34d399', background: 'white', padding: '10px 30px', borderRadius: '30px', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer', letterSpacing: '0.05em' }}>
                        UPLOAD IMAGE
                    </button>
                    <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                        <span style={{ color: '#94a3b8', fontSize: '0.8em', textTransform: 'uppercase' }}>OR</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px' }}>
                    <button onClick={() => setTab('preset')} style={{ background: 'none', border: 'none', borderBottom: tab === 'preset' ? '2px solid #34d399' : '2px solid transparent', padding: '5px 10px', fontWeight: 'bold', color: tab === 'preset' ? '#1e293b' : '#94a3b8', cursor: 'pointer' }}>PRESET</button>
                    <button onClick={() => setTab('ai')} style={{ background: 'none', border: 'none', borderBottom: tab === 'ai' ? '2px solid #34d399' : '2px solid transparent', padding: '5px 10px', fontWeight: 'bold', color: tab === 'ai' ? '#1e293b' : '#94a3b8', cursor: 'pointer', display: 'flex', items: 'center', gap: '5px' }}>
                        AI <span style={{ background: '#e9d5ff', color: '#7e22ce', fontSize: '0.6em', padding: '2px 4px', borderRadius: '4px' }}>PRO</span>
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', opacity: tab === 'ai' ? 1 : 0.5, pointerEvents: tab === 'ai' ? 'auto' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>Gender</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {['All', 'Female', 'Male'].map(g => (
                                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#64748b' }}>
                                    <input type="radio" checked={filters.gender === g} onChange={() => setFilters({ ...filters, gender: g })} style={{ accentColor: '#34d399' }} /> {g}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>Age range</label>
                        <input type="number" value={filters.ageStart} onChange={e => setFilters({ ...filters, ageStart: e.target.value })} style={{ width: '50px', padding: '5px', border: 'none', borderBottom: '1px solid #cbd5e1' }} />
                        <span style={{ margin: '0 10px' }}>-</span>
                        <input type="number" value={filters.ageEnd} onChange={e => setFilters({ ...filters, ageEnd: e.target.value })} style={{ width: '50px', padding: '5px', border: 'none', borderBottom: '1px solid #cbd5e1' }} />
                        <span style={{ marginLeft: '10px', color: '#64748b' }}>years</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>Hair Color</label>
                        <div style={{ display: 'flex', gap: '15px' }}>
                            {['brown-haired', 'brunette', 'blond', 'redhead'].map(h => (
                                <label key={h} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#64748b' }}>
                                    <input type="checkbox" style={{ accentColor: '#34d399' }} /> {h}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ width: '100px', fontWeight: 'bold', color: '#334155' }}>Emotion</label>
                        <div style={{ display: 'flex', gap: '15px', fontSize: '1.5em' }}>
                            <label style={{ cursor: 'pointer' }}><input type="checkbox" style={{ display: 'none' }} />🙂</label>
                            <label style={{ cursor: 'pointer' }}><input type="checkbox" style={{ display: 'none' }} />😐</label>
                        </div>
                    </div>
                </div>

                {/* Image Grid */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                    {presets.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            onClick={() => setSelected(src)}
                            style={{
                                width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer',
                                border: selected === src ? '3px solid #34d399' : '3px solid transparent',
                                transform: selected === src ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => onSave(selected)}
                        disabled={!selected}
                        style={{ background: '#34d399', color: '#064e3b', fontWeight: 'bold', padding: '12px 60px', borderRadius: '30px', border: 'none', cursor: selected ? 'pointer' : 'not-allowed', opacity: selected ? 1 : 0.5, fontSize: '0.9em', letterSpacing: '0.05em' }}
                    >
                        {tab === 'ai' ? 'GENERATE' : 'DONE'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConfigureBlockModal = ({ block, onClose, onSave }) => {
    // Default visibility if undefined
    const safeData = block.data || {};
    const initialVisibility = safeData.visibility || { name: true, market_size: true, personality_type: true };
    const [visibility, setVisibility] = useState(initialVisibility);

    const handleToggle = (key) => setVisibility(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.9em', letterSpacing: '0.05em', color: '#1e293b' }}>Configure Section</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>

                <p style={{ color: '#64748b', fontSize: '0.9em', marginBottom: '20px' }}>You can choose what information to include in this section:</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={visibility.name} onChange={() => handleToggle('name')} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                        <span style={{ color: '#334155' }}>Persona name (default)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={visibility.market_size} onChange={() => handleToggle('market_size')} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                        <span style={{ color: '#334155' }}>Market size</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={visibility.personality_type} onChange={() => handleToggle('personality_type')} style={{ width: '18px', height: '18px', accentColor: '#10b981' }} />
                        <span style={{ color: '#334155' }}>Personality (persona type)</span>
                    </label>
                </div>

                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button
                        onClick={() => onSave(visibility)}
                        style={{ background: '#6ee7b7', color: '#064e3b', fontWeight: 'bold', padding: '10px 40px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                        DONE
                    </button>
                </div>
            </div>
        </div>
    );
};

// Updated Header with Sub-modules
const HeaderBlock = ({ data, isEditable, onChange }) => {
    const visibility = data.visibility || { name: true, market_size: true, personality_type: true };

    const updateData = (field, val) => onChange(field, val);

    return (
        <div style={{ padding: '10px' }}>
            {/* NAME SECTON */}
            {visibility.name && (
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: '#e2e8f0', margin: '0 auto 15px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {data.photo_url ? <img src={data.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '2.5em' }}>👤</span>}
                    </div>
                    {isEditable ? (
                        <>
                            <InlineTextEdit
                                value={data.name}
                                onChange={val => updateData('name', val)}
                                placeholder="Persona Name"
                                aiEnabled={true}
                                style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '2em', fontWeight: 'bold', color: '#b91c1c', border: 'none', outline: 'none', background: 'transparent', marginBottom: '5px' }}
                            />
                            <InlineTextEdit
                                value={data.title}
                                onChange={val => updateData('title', val)}
                                placeholder="Persona Tag (e.g. The Responsible Provider)"
                                aiEnabled={true}
                                aiPrompt="Generate a short, catchy persona archetype tag or label (e.g. 'The Visionary Leader', 'The Budget-Conscious Shopper'). Return ONLY the tag."
                                style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '1.2em', color: '#64748b', fontStyle: 'italic', border: 'none', outline: 'none', background: 'transparent' }}
                            />
                        </>
                    ) : (
                        <>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '2em', color: '#b91c1c' }}>{data.name || 'Persona Name'}</h1>
                            <div style={{ color: '#64748b', fontSize: '1.2em', fontStyle: 'italic' }}>{data.title || 'Persona Tag'}</div>
                        </>
                    )}
                </div>
            )}

            {/* SUB MODULES GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>

                {/* MARKET SIZE */}
                {visibility.market_size && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.8em', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.05em' }}>MARKET SIZE</div>
                            <PieChart percentage={data.market_size || 33} />
                        </div>
                        {isEditable && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <label style={{ fontSize: '0.7em', color: '#94a3b8' }}>Percentage</label>
                                <input
                                    type="number"
                                    value={data.market_size || 33}
                                    onChange={e => updateData('market_size', e.target.value)}
                                    style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* TYPE */}
                {visibility.personality_type && (
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        <div style={{ fontSize: '0.8em', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px', letterSpacing: '0.05em' }}>TYPE</div>
                        <div style={{ background: '#6ee7b7', padding: '15px', borderRadius: '4px', display: 'inline-block', minWidth: '150px' }}>
                            {isEditable ? (
                                <input
                                    value={data.personality_type && typeof data.personality_type !== 'object' ? data.personality_type : 'Organizer'}
                                    onChange={e => updateData('personality_type', e.target.value)}
                                    style={{ background: 'transparent', border: 'none', fontSize: '1.2em', fontWeight: 'bold', color: '#022c22', width: '100%', outline: 'none' }}
                                />
                            ) : (
                                <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#022c22' }}>
                                    {data.personality_type && typeof data.personality_type !== 'object' ? data.personality_type : 'Organizer'} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>💡</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ... other blocks (Demographics, Quote, List, Tags, Text) unchanged ...
// They are reused from previous steps but I need to make sure I don't break them by replacing the whole file's bottom.
// Since 'replace_file_content' replaces a range, and I am replacing the TOP part of Editor components too? 
// No, I'll carefully check line numbers. 
// Step 2183 shows HeaderBlock is lines 27-48.
// I will REPLACE from line 4 (Block Components Start) down to line 183 (End of BlockRenderer) to update HeaderBlock and define ConfigureBlockModal.
// Wait, ConfigureBlockModal is new. I should put it before PersonaEditor.

// Let's replace Block Components section.

// HEADER BLOCK is lines 27-48.
// I will replace `HeaderBlock` definition.

// And I need to update `PersonaEditor` to handle `configuringBlock`.

// Let's do components first.

const DemographicsBlock = ({ data, isEditable, onChange }) => {
    const update = (newVal) => onChange('data', newVal);
    const entries = data && typeof data === 'object' ? Object.entries(data) : [];

    const getIcon = (key, val) => {
        const k = key.toLowerCase();
        const v = val ? val.toString().toLowerCase() : '';
        if (k.includes('location') || k.includes('city') || k.includes('country')) return <MapPin size={20} color="#84cc16" />;
        if (k.includes('occupation') || k.includes('job') || k.includes('role') || k.includes('student')) return <Briefcase size={20} color="#84cc16" />;
        if (k.includes('gender') || v === 'male' || v === 'female') return <UserIcon size={20} color="#84cc16" />;
        return <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #84cc16' }}></div>;
    };

    return (
        <div style={{ padding: '10px 0 20px 0' }}>
            {/* Title Header with Grip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                <div style={{ color: '#94a3b8', cursor: 'grab' }}><GripVertical size={20} /></div>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>Demographic</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingLeft: '35px' }}>
                {entries.map(([key, val], idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }} title={key}>
                            {getIcon(key, val)}
                        </div>

                        {isEditable ? (
                            <div style={{ flex: 1, display: 'flex', gap: '15px', alignItems: 'center' }}>
                                {/* Label Input */}
                                <input
                                    value={key}
                                    onChange={e => {
                                        const newKey = e.target.value;
                                        // Rename key in object logic (delete old, add new, preserve order if possible)
                                        // Simplified: reconstruct array
                                        const n = [...entries];
                                        n[idx][0] = newKey;
                                        update(Object.fromEntries(n));
                                    }}
                                    style={{ width: '30%', border: 'none', borderBottom: '1px dashed #cbd5e1', fontSize: '0.9em', color: '#94a3b8', background: 'transparent' }}
                                />

                                {/* Value Input - Smart Types */}
                                {(() => {
                                    const k = key.toLowerCase();
                                    if (k.includes('gender') || k.includes('sex')) {
                                        return (
                                            <select
                                                value={val}
                                                onChange={e => { const n = [...entries]; n[idx][1] = e.target.value; update(Object.fromEntries(n)); }}
                                                style={{ flex: 1, border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1.1em', color: '#334155', background: 'transparent' }}
                                            >
                                                <option value="">Select...</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Non-binary">Non-binary</option>
                                            </select>
                                        );
                                    }
                                    if (k.includes('status') || k.includes('married') || k.includes('marital')) {
                                        return (
                                            <select
                                                value={val}
                                                onChange={e => { const n = [...entries]; n[idx][1] = e.target.value; update(Object.fromEntries(n)); }}
                                                style={{ flex: 1, border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1.1em', color: '#334155', background: 'transparent' }}
                                            >
                                                <option value="">Select...</option>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Divorced">Divorced</option>
                                                <option value="Widowed">Widowed</option>
                                            </select>
                                        );
                                    }
                                    if (k === 'age' || k.includes('year')) {
                                        return (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={parseInt(val) || ''}
                                                    onChange={e => { const n = [...entries]; n[idx][1] = e.target.value; update(Object.fromEntries(n)); }}
                                                    style={{ width: '60px', border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1.1em', color: '#334155', background: 'transparent' }}
                                                />
                                                <span style={{ marginLeft: '10px', color: '#64748b' }}>years</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <input
                                            value={val}
                                            onChange={e => { const n = [...entries]; n[idx][1] = e.target.value; update(Object.fromEntries(n)); }}
                                            style={{ flex: 1, border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1.1em', color: '#334155', width: '100%', outline: 'none', background: 'transparent' }}
                                        />
                                    );
                                })()}

                                <button onClick={() => { const n = [...entries]; n.splice(idx, 1); update(Object.fromEntries(n)); }} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
                            </div>
                        ) : (
                            <div style={{ fontSize: '1.1em', color: '#334155', padding: '8px 0', borderBottom: '1px solid transparent' }}>
                                {val} {key.toLowerCase() === 'age' ? ' years' : ''}
                            </div>
                        )}
                    </div>
                ))}

                {isEditable && (
                    <button
                        onClick={() => {
                            const newKey = prompt("Field Name (e.g. Location, Age):", "New Field");
                            if (newKey) update({ ...data, [newKey]: '' });
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em', marginTop: '15px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                        <Plus size={18} /> ADD FIELD
                    </button>
                )}
            </div>
        </div>
    );
};

const PhotoBlock = ({ data, isEditable, onChange }) => {
    const [showModal, setShowModal] = useState(false);

    const handleSave = (imgUrl) => {
        onChange('data', imgUrl);
        setShowModal(false);
    };

    return (
        <div style={{ height: '100%', minHeight: '300px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <img
                src={data || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=800&q=80"}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {isEditable && (
                <>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Change Photo
                    </button>
                    {showModal && (
                        <PhotoUploadModal
                            currentPhoto={data}
                            onClose={() => setShowModal(false)}
                            onSave={handleSave}
                        />
                    )}
                </>
            )}
        </div>
    );
};

const HeaderInfoBlock = ({ data, isEditable, onChange }) => {
    // Ensure data is safe
    const safeData = data || {};
    const visibility = safeData.visibility || { name: true, market_size: true, personality_type: true };

    const update = (field, val) => onChange('data', { ...safeData, [field]: val });

    return (
        <div style={{ padding: '0' }}>
            {/* Top Row: Name and Market Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    {visibility.name ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }}>NAME</div>
                                {isEditable && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <span style={{ fontSize: '0.7em', color: '#94a3b8' }}>Region:</span>
                                        <select
                                            value={safeData.region || 'US'}
                                            onChange={(e) => update('region', e.target.value)}
                                            style={{ fontSize: '0.8em', border: '1px solid #cbd5e1', borderRadius: '4px', background: 'transparent' }}
                                        >
                                            <option value="US">🇺🇸 US</option>
                                            <option value="Saudi Arabia">🇸🇦 SA</option>
                                            <option value="UAE">🇦🇪 UAE</option>
                                            <option value="UK">🇬🇧 UK</option>
                                            <option value="India">🇮🇳 IN</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                            {/* Style Controls for Name */}
                            {isEditable && (
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px', gap: '10px' }}>
                                    <input
                                        type="color"
                                        value={safeData.nameColor || '#b91c1c'}
                                        onChange={e => update('nameColor', e.target.value)}
                                        style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                                        title="Name Color"
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '4px' }}>
                                        <button
                                            onClick={() => update('nameSize', Math.max(0.5, (safeData.nameSize || 2.5) - 0.1))}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 5px', color: '#64748b' }}
                                        >-</button>
                                        <span style={{ fontSize: '0.7em', color: '#475569' }}>Aa</span>
                                        <button
                                            onClick={() => update('nameSize', (safeData.nameSize || 2.5) + 0.1)}
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 5px', color: '#64748b' }}
                                        >+</button>
                                    </div>
                                </div>
                            )}

                            {isEditable ? (
                                <>
                                    <InlineTextEdit
                                        value={safeData.name || ''}
                                        onChange={val => update('name', val)}
                                        placeholder="Persona Name"
                                        aiEnabled={true}
                                        aiContext={safeData.region === 'Saudi Arabia' || safeData.region === 'UAE' ? 'Middle East (Arabic Name)' : safeData.region}
                                        style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: `${safeData.nameSize || 2.5}em`, fontWeight: 'bold', color: safeData.nameColor || '#b91c1c', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'serif', marginBottom: '5px', lineHeight: '1.2' }}
                                    />

                                    {/* Style Controls for Title */}
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '5px', gap: '10px', marginTop: '10px' }}>
                                        <input
                                            type="color"
                                            value={safeData.titleColor || '#64748b'}
                                            onChange={e => update('titleColor', e.target.value)}
                                            style={{ width: '20px', height: '20px', border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                                            title="Title Color"
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '4px' }}>
                                            <button
                                                onClick={() => update('titleSize', Math.max(0.5, (safeData.titleSize || 1.2) - 0.1))}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 5px', color: '#64748b' }}
                                            >-</button>
                                            <span style={{ fontSize: '0.7em', color: '#475569' }}>Aa</span>
                                            <button
                                                onClick={() => update('titleSize', (safeData.titleSize || 1.2) + 0.1)}
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0 5px', color: '#64748b' }}
                                            >+</button>
                                        </div>
                                    </div>

                                    <InlineTextEdit
                                        value={safeData.title}
                                        onChange={val => update('title', val)}
                                        placeholder="Tag / Label (e.g. The Responsible Provider)"
                                        aiEnabled={true}
                                        aiContext={safeData.region}
                                        aiPrompt="Generate a short, catchy persona archetype tag or label (e.g. 'The Visionary Leader', 'The Budget-Conscious Shopper'). Return ONLY the tag."
                                        style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: `${safeData.titleSize || 1.2}em`, color: safeData.titleColor || '#64748b', fontStyle: 'italic', border: 'none', outline: 'none', background: 'transparent' }}
                                    />
                                </>
                            ) : (
                                <>
                                    <h1 style={{ margin: 0, fontSize: `${safeData.nameSize || 2.5}em`, color: safeData.nameColor || '#b91c1c', fontFamily: 'serif', lineHeight: '1.2' }}>{safeData.name || 'Persona Name'}</h1>
                                    <div style={{ color: safeData.titleColor || '#64748b', fontSize: `${safeData.titleSize || 1.2}em`, fontStyle: 'italic' }}>{safeData.title || 'Tag / Label'}</div>
                                </>
                            )}
                        </>
                    ) : (
                        isEditable && <div style={{ color: '#cbd5e1', fontStyle: 'italic', padding: '10px', border: '1px dashed #e2e8f0', borderRadius: '4px' }}>Name section hidden</div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: '20px' }}>
                    {visibility.market_size && (
                        <>
                            <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>MARKET SIZE</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <PieChart percentage={safeData.market_size || 33} color={safeData.market_size_color || "#bef264"} />
                                {isEditable && (
                                    <div title="Enter a number to show market size" style={{ display: 'flex', flexDirection: 'column', width: '50px', gap: '5px' }}>
                                        <input
                                            type="number"
                                            min="0" max="100"
                                            value={safeData.market_size || 33}
                                            onChange={e => update('market_size', parseInt(e.target.value))}
                                            style={{ width: '100%', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.9em', textAlign: 'center' }}
                                        />
                                        <input
                                            type="color"
                                            value={safeData.market_size_color || "#bef264"}
                                            onChange={e => update('market_size_color', e.target.value)}
                                            style={{ width: '100%', height: '20px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            title="Change Graph Color"
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Row: Type Bar */}
            {visibility.personality_type && (
                <div style={{ background: '#bef264', padding: '15px 20px', marginLeft: '-20px', marginRight: '-20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#3f6212', fontWeight: 'bold' }}>TYPE</div>
                    {isEditable ? (
                        <div
                            onClick={() => update('showTypeModal', true)}
                            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                        >
                            <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1a2e05' }}>
                                {safeData.personality_type || 'Select Type...'}
                            </div>
                            {safeData.personality_type_desc && (
                                <div style={{ fontSize: '0.9em', color: '#3f6212', opacity: 0.8, fontStyle: 'italic' }}>
                                    {safeData.personality_type_desc}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1a2e05' }}>
                                {safeData.personality_type || 'Idealist'}
                            </div>
                            {safeData.personality_type_desc && (
                                <div style={{ fontSize: '0.9em', color: '#3f6212', opacity: 0.8, fontStyle: 'italic' }}>
                                    {safeData.personality_type_desc}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Injection */}
            {safeData.showTypeModal && (
                <PersonalityTypeModal
                    initialType={safeData.personality_type}
                    initialDesc={safeData.personality_type_desc}
                    onClose={() => update('showTypeModal', false)}
                    onSave={(type, desc) => {
                        onChange('data', {
                            ...safeData,
                            personality_type: type,
                            personality_type_desc: desc,
                            showTypeModal: false
                        });
                    }}
                />
            )}
        </div>
    );
};

const SkillsBlock = ({ title, data, titleSize = '1.4em', titleColor = '#0f172a', barColor = '#bef264', textColor = '#475569', isEditable, onChange }) => {
    // Data: { entries: [...], mode: 'slider' | 'segmented' }
    const safeData = Array.isArray(data) ? { entries: data, mode: 'slider' } : (data || { entries: [{ label: 'Skill 1', value: 5 }], mode: 'slider' });
    const entries = safeData.entries || [];
    const mode = safeData.mode || 'slider';

    const update = (newEntries) => onChange('data', { ...safeData, entries: newEntries });
    const updateMode = (newMode) => onChange('data', { ...safeData, mode: newMode });

    return (
        <div style={{ padding: '10px 0', position: 'relative' }}>
            {/* Edit Style Overlay */}
            {isEditable && (
                <div style={{ position: 'absolute', top: '0', right: '0', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '10px', width: '40px', fontWeight: 'bold', color: '#64748b' }}>Bar</span>
                        <input type="color" value={barColor} onChange={e => onChange('barColor', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} title="Bar Color" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '10px', width: '40px', fontWeight: 'bold', color: '#64748b' }}>H-Txt</span>
                        <input type="color" value={titleColor} onChange={e => onChange('titleColor', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} title="Header Text Color" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '10px', width: '40px', fontWeight: 'bold', color: '#64748b' }}>C-Txt</span>
                        <input type="color" value={textColor} onChange={e => onChange('textColor', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} title="Content Text Color" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ fontSize: '10px', width: '40px', fontWeight: 'bold', color: '#64748b' }}>H-Size</span>
                        <select value={titleSize} onChange={e => onChange('titleSize', e.target.value)} style={{ fontSize: '10px', width: '50px', height: '20px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                            <option value="1.2em">Med</option>
                            <option value="1.4em">Std</option>
                            <option value="1.6em">Lg</option>
                            <option value="2em">XL</option>
                        </select>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '25px', paddingRight: isEditable ? '90px' : '0' }}>
                {isEditable ? (
                    <input
                        value={title || 'Skills'}
                        onChange={e => onChange('title', e.target.value)}
                        style={{ border: 'none', fontSize: titleSize, fontWeight: 'bold', color: titleColor, background: 'transparent', width: '100%' }}
                    />
                ) : (
                    <h3 style={{ margin: 0, fontSize: titleSize, fontWeight: 'bold', color: titleColor }}>{title || 'Skills'}</h3>
                )}

                {isEditable && (
                    <select value={mode} onChange={e => updateMode(e.target.value)} style={{ fontSize: '0.8em', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                        <option value="slider">Slider</option>
                        <option value="segmented">Segments</option>
                    </select>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {entries.map((skill, idx) => (
                    <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            {isEditable ? (
                                <input
                                    value={skill.label}
                                    onChange={e => { const n = [...entries]; n[idx].label = e.target.value; update(n); }}
                                    style={{ border: 'none', fontWeight: '500', color: textColor, fontSize: '1em', background: 'transparent' }}
                                />
                            ) : (
                                <div style={{ fontWeight: '500', color: textColor }}>{skill.label}</div>
                            )}
                        </div>

                        {mode === 'slider' ? (
                            <div style={{ position: 'relative', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '10px' }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(skill.value || 0) * 10}%`, background: barColor, borderRadius: '2px' }}></div>
                                {isEditable && (
                                    <input
                                        type="range"
                                        min="0" max="10"
                                        value={skill.value}
                                        onChange={e => { const n = [...entries]; n[idx].value = parseInt(e.target.value); update(n); }}
                                        style={{ position: 'absolute', top: '-10px', width: '100%', opacity: 0, cursor: 'pointer', height: '20px' }}
                                    />
                                )}
                                <div style={{ position: 'absolute', left: `${(skill.value || 0) * 10}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', background: '#fff', border: `2px solid ${barColor}`, borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}></div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(seg => {
                                    const isActive = (skill.value || 0) > seg;
                                    return (
                                        <div
                                            key={seg}
                                            onClick={() => isEditable && update(entries.map((s, i) => i === idx ? { ...s, value: seg + 1 } : s))}
                                            style={{
                                                flex: 1,
                                                height: '8px',
                                                background: isActive ? barColor : '#e2e8f0',
                                                borderRadius: '2px',
                                                cursor: isEditable ? 'pointer' : 'default',
                                                position: 'relative'
                                            }}
                                            title={`${seg + 1}/10`}
                                        ></div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {isEditable && (
                <button onClick={() => update([...entries, { label: 'New Skill', value: 5 }])} style={{ marginTop: '15px', color: '#64748b', background: 'none', border: '1px dashed #cbd5e1', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', width: '100%', fontSize: '0.9em' }}>+ Add Skill</button>
            )}
        </div>
    );
};

// Text Block (Generic)
// CHART BLOCK
const ChartBlock = ({ title, data, chartType = 'bar', isEditable, onChange }) => {
    const safeData = Array.isArray(data) ? data : [{ label: 'A', value: 60, color: '#3b82f6' }, { label: 'B', value: 40, color: '#ef4444' }];
    const updateItem = (idx, field, val) => {
        const newData = [...safeData];
        newData[idx] = { ...newData[idx], [field]: val };
        onChange('data', newData);
    };
    const addRow = () => onChange('data', [...safeData, { label: 'New', value: 20, color: '#94a3b8' }]);
    const removeRow = (idx) => onChange('data', safeData.filter((_, i) => i !== idx));

    return (
        <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                {isEditable ? (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%' }}>
                        <input value={title || ''} onChange={e => onChange('title', e.target.value)} placeholder="Chart Title" style={{ fontSize: '1.4em', fontWeight: 'bold', border: 'none', background: 'transparent', flex: 1 }} />
                        <select value={chartType} onChange={e => onChange('chartType', e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}><option value="bar">Bar Chart</option><option value="pie">Pie Chart</option></select>
                    </div>
                ) : <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>{title || 'Chart'}</h3>}
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '8px', padding: '20px' }}>
                    {chartType === 'pie' ? (
                        <div style={{
                            width: '140px', height: '140px', borderRadius: '50%', background: `conic-gradient(${safeData.reduce((acc, item) => {
                                const total = safeData.reduce((sum, i) => sum + Number(i.value), 0);
                                const deg = (Number(item.value) / (total || 1)) * 360;
                                acc.str += `${item.color} ${acc.deg}deg ${acc.deg + deg}deg, `;
                                acc.deg += deg;
                                return acc;
                            }, { str: '', deg: 0 }).str.slice(0, -2)})`
                        }}></div>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', height: '140px', gap: '10px' }}>
                            {safeData.map((d, i) => (
                                <div key={i} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                                    <div style={{ width: '100%', height: `${(Number(d.value) / (Math.max(...safeData.map(x => Number(x.value))) || 1)) * 100}%`, background: d.color, borderRadius: '4px 4px 0 0' }} title={`${d.label}: ${d.value}`}></div>
                                    <div style={{ fontSize: '0.7em', color: '#64748b', marginTop: '5px', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{d.label}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ width: '40%' }}>
                    {isEditable ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {safeData.map((d, i) => (
                                <div key={i} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                    <input type="color" value={d.color} onChange={e => updateItem(i, 'color', e.target.value)} style={{ width: '20px', height: '20px', border: 'none', padding: 0 }} />
                                    <input value={d.label} onChange={e => updateItem(i, 'label', e.target.value)} style={{ flex: 1, border: '1px solid #e2e8f0', fontSize: '0.8em', padding: '2px' }} />
                                    <input type="number" value={d.value} onChange={e => updateItem(i, 'value', Number(e.target.value))} style={{ width: '40px', border: '1px solid #e2e8f0', fontSize: '0.8em', padding: '2px' }} />
                                    <button onClick={() => removeRow(i)} style={{ color: 'red', border: 'none', cursor: 'pointer' }}>×</button>
                                </div>
                            ))}
                            <button onClick={addRow} style={{ marginTop: '5px', fontSize: '0.8em', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>+ Add Item</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {safeData.map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em', color: '#475569' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: d.color }}></div>
                                    <div style={{ flex: 1 }}>{d.label}</div>
                                    <div style={{ fontWeight: 'bold' }}>{d.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Text Block (Generic)
const TextBlock = ({ title, data, isEditable, onChange }) => (
    <div style={{ marginBottom: '10px' }}>
        {title && <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2em', fontWeight: 'bold' }}>{title}</h3>}
        {isEditable ? (
            <textarea
                value={data || ''}
                onChange={e => onChange('data', e.target.value)}
                style={{ width: '100%', minHeight: '80px', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '10px', fontFamily: 'inherit' }}
            />
        ) : (
            <p style={{ margin: 0, color: '#475569', lineHeight: '1.6' }}>{data || 'Text content...'}</p>
        )}
    </div>
);

// Quote Block
const QuoteBlock = ({ data, isEditable, onChange }) => (
    <div style={{ padding: '10px' }}>
        {isEditable ? (
            <textarea
                value={data || ''}
                onChange={e => onChange('data', e.target.value)}
                style={{ width: '100%', minHeight: '80px', border: '2px dashed #34d399', borderRadius: '8px', padding: '15px', fontSize: '1.2em', fontStyle: 'italic', color: '#064e3b', background: '#ecfdf5' }}
            />
        ) : (
            <blockquote style={{ margin: 0, fontSize: '1.4em', fontStyle: 'italic', color: '#064e3b', background: '#ecfdf5', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #34d399' }}>
                "{data || 'Insert quote here...'}"
            </blockquote>
        )}
    </div>
);

// List Block
const ListBlock = ({ title, data, isEditable, onChange }) => {
    // Data is array of strings
    const items = Array.isArray(data) ? data : ['List Item 1', 'List Item 2'];
    const update = (newItems) => onChange('data', newItems);

    return (
        <div>
            {title && <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2em', fontWeight: 'bold' }}>{title}</h3>}
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {items.map((item, idx) => (
                    <li key={idx} style={{ marginBottom: '8px', color: '#475569' }}>
                        {isEditable ? (
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <input
                                    value={item}
                                    onChange={e => { const n = [...items]; n[idx] = e.target.value; update(n); }}
                                    style={{ flex: 1, border: 'none', borderBottom: '1px solid #cbd5e1', outline: 'none' }}
                                />
                                <button onClick={() => { const n = [...items]; n.splice(idx, 1); update(n); }} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
                            </div>
                        ) : (
                            <span>{item}</span>
                        )}
                    </li>
                ))}
            </ul>
            {isEditable && (
                <button
                    onClick={() => update([...items, 'New Item'])}
                    style={{ marginTop: '10px', fontSize: '0.8em', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + Add Item
                </button>
            )}
        </div>
    );
};

// Tags Block
const TagsBlock = ({ title, data, isEditable, onChange }) => {
    const tags = Array.isArray(data) ? data : ['Tag 1', 'Tag 2'];
    const update = (newTags) => onChange('data', newTags);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>{title}</h3>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {tags.map((tag, idx) => (
                    isEditable ? (
                        <div key={idx} style={{ position: 'relative' }}>
                            <input
                                value={tag}
                                onChange={e => { const n = [...tags]; n[idx] = e.target.value; update(n); }}
                                style={{ background: '#e2e8f0', border: 'none', padding: '5px 10px', borderRadius: '15px', color: '#475569', fontSize: '0.9em', width: 'auto', minWidth: '50px' }}
                            />
                            <button
                                onClick={() => { const n = [...tags]; n.splice(idx, 1); update(n); }}
                                style={{ position: 'absolute', top: '-5px', right: '-5px', width: '15px', height: '15px', background: 'red', color: 'white', border: 'none', borderRadius: '50%', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                ×
                            </button>
                        </div>
                    ) : (
                        <span key={idx} style={{ background: '#e2e8f0', padding: '5px 15px', borderRadius: '15px', color: '#475569', fontSize: '0.9em' }}>{tag}</span>
                    )
                ))}
                {isEditable && (
                    <button
                        onClick={() => update([...tags, 'New Tag'])}
                        style={{ padding: '5px 10px', border: '1px dashed #cbd5e1', borderRadius: '15px', color: '#94a3b8', background: 'transparent', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                        + Add
                    </button>
                )}
            </div>
        </div>
    );
};

// Icon/Logo Lookup Modal
const IconLookupModal = ({ type, onClose, onSelect }) => {
    // Presets can be expanded. Using simple emojis/text for now as placeholders for real logos.
    // In a real app, these would be URLs to SVG/PNG logos.
    // Expanded Presets
    const browsers = [
        { label: 'Chrome', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg' },
        { label: 'Firefox', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg' },
        { label: 'Safari', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Safari_browser_logo.svg' },
        { label: 'Edge', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Microsoft_Edge_logo_%282019%29.svg' },
        { label: 'Opera', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Opera_2015_icon.svg' },
        { label: 'Brave', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Brave_icon_lionface.png' },
        { label: 'Internet Explorer', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Internet_Explorer_10%2B11_logo.svg' },
        { label: 'Vivaldi', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Vivaldi_web_browser_logo.png' }
    ];

    const tech = [
        { label: 'React', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg' },
        { label: 'Angular', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/cf/Angular_full_color_logo.svg' },
        { label: 'Vue.js', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Vue.js_Logo_2.svg' },
        { label: 'Node.js', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg' },
        { label: 'Python', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg' },
        { label: 'Java', icon: 'https://upload.wikimedia.org/wikipedia/en/3/30/Java_programming_language_logo.svg' },
        { label: 'C#', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/C_Sharp_wordmark.svg' },
        { label: 'PHP', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/27/PHP-logo.svg' },
        { label: 'Go', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Go_Logo_Blue.svg' },
        { label: 'Rust', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Rust_programming_language_black_logo.svg' },
        { label: 'AWS', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg' },
        { label: 'Azure', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Microsoft_Azure.svg' },
        { label: 'GCP', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg' },
        { label: 'Docker', icon: 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Docker_%28container_engine%29_logo.svg' },
        { label: 'Kubernetes', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/39/Kubernetes_logo_without_workmark.svg' },
        { label: 'MongoDB', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/93/MongoDB_Logo.svg' },
        { label: 'PostgreSQL', icon: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Postgresql_elephant.svg' },
        { label: 'Redis', icon: 'https://upload.wikimedia.org/wikipedia/commons/6/64/Logo-redis.svg' },
        { label: 'Slack', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg' },
        { label: 'Jira', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Jira_Logo.svg' },
        { label: 'Figma', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg' },
        { label: 'Git', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Git-logo.svg' },
        { label: 'VS Code', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg' },
        { label: 'Android', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg' },
        { label: 'Android', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/Android_robot.svg' },
        { label: 'iOS', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/IOS_logo.svg' }
    ];

    const channels = [
        { label: 'YouTube', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg' },
        { label: 'Twitch', icon: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Twitch_Glitch_Logo_Purple.svg' },
        { label: 'Instagram', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg' },
        { label: 'Twitter / X', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/ce/X_logo_2023.svg' },
        { label: 'LinkedIn', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg' },
        { label: 'TikTok', icon: 'https://upload.wikimedia.org/wikipedia/en/a/a9/TikTok_logo.svg' },
        { label: 'Discord', icon: 'https://upload.wikimedia.org/wikipedia/commons/9/96/Discord_logo_cerulean.png' },
        { label: 'Facebook', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg' },
        { label: 'Snapchat', icon: 'https://upload.wikimedia.org/wikipedia/en/c/c4/Snapchat_logo.svg' },
        { label: 'Pinterest', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png' },
        { label: 'Reddit', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/58/Reddit_logo_new.svg' }
    ];

    let items = tech;
    if (type === 'browser') items = browsers;
    if (type === 'channel') items = channels;

    const [custom, setCustom] = useState('');

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'white', width: '600px', maxHeight: '80vh', padding: '20px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2em' }}>Select {type === 'browser' ? 'Browser' : (type === 'channel' ? 'Channel' : 'Technology')}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '20px', overflowY: 'auto' }}>
                    {items.map((item, i) => (
                        <div key={i} onClick={() => onSelect(item)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', hover: { background: '#f8fafc' } }}>
                            <img src={item.icon} alt={item.label} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                            <span style={{ fontSize: '0.8em', textAlign: 'center' }}>{item.label}</span>
                        </div>
                    ))}
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                    <div style={{ fontSize: '0.9em', marginBottom: '5px', fontWeight: 'bold' }}>Custom/Other</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            value={custom}
                            onChange={e => setCustom(e.target.value)}
                            placeholder="Enter name..."
                            style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <button
                            onClick={() => onSelect({ label: custom, icon: null })} // Null icon for custom, effectively placeholder
                            disabled={!custom}
                            style={{ padding: '8px 15px', background: '#334155', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <button onClick={onClose} style={{ marginTop: '15px', width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>Cancel</button>
            </div>
        </div>
    );
};


const IconGridBlock = ({ title, data, isEditable, onChange }) => {
    // Data: Array of { label, icon } objects. Backward compat for strings.
    const items = (Array.isArray(data) ? data : []).map(i => typeof i === 'string' ? { label: i, icon: null } : i);
    const update = (newItems) => onChange('data', newItems);

    // Mode state for internal UI logic (Technology vs Browser vs Channel)
    // We infer initial mode from title, but then allow user to switch.
    // If title contains "Browser", we start in Browser mode.
    // If title contains "Channel" or "Social", we start in Channel mode.
    const [mode, setMode] = useState(() => {
        const t = (title || '').toLowerCase();
        if (t.includes('browser')) return 'browser';
        if (t.includes('channel') || t.includes('social')) return 'channel';
        return 'tech';
    });
    const [showLookup, setShowLookup] = useState(false);

    // Update title when mode changes if user selects a new mode
    const handleModeChange = (newMode) => {
        setMode(newMode);
        let newTitle = 'Technology Stack';
        if (newMode === 'browser') newTitle = 'Browsers';
        if (newMode === 'channel') newTitle = 'Channels';
        onChange('title', newTitle);
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>{title || 'Technologies'}</h3>
                {isEditable && (
                    <select
                        value={mode}
                        onChange={(e) => handleModeChange(e.target.value)}
                        style={{ fontSize: '0.8em', padding: '5px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                    >
                        <option value="tech">Technology</option>
                        <option value="browser">Browsers</option>
                        <option value="channel">Channels</option>
                    </select>
                )}
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ textAlign: 'center', minWidth: '60px', position: 'relative' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px', color: '#84cc16', background: 'white', overflow: 'hidden' }}>
                            {item.icon ? (
                                <img src={item.icon} alt={item.label} style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                            ) : (
                                <div style={{ fontSize: '1.5em' }}>🔹</div> // Generic placeholder
                            )}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#64748b' }}>{item.label}</div>
                        {isEditable && (
                            <button
                                onClick={() => { const n = [...items]; n.splice(idx, 1); update(n); }}
                                style={{ position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px', background: 'red', color: 'white', borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                {isEditable && (
                    <button
                        onClick={() => setShowLookup(true)}
                        style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px dashed #e2e8f0', color: '#94a3b8', background: 'none', cursor: 'pointer', fontSize: '1.5em' }}
                    >
                        +
                    </button>
                )}
            </div>

            {showLookup && (
                <IconLookupModal
                    type={mode}
                    onClose={() => setShowLookup(false)}
                    onSelect={(item) => {
                        update([...items, item]);
                        setShowLookup(false);
                    }}
                />
            )}
        </div>
    );
};

// ... (Other standard blocks: Quote, List, Text, Demographics, Tags - verify background colors) ...
// Quote needs green quotes.
// List needs standard bullets.
// Text is fine.

const ColoredTextBlock = ({ title, data, color = '#ecfeff', titleSize = '1.2em', textColor = '#0f172a', isEditable, onChange }) => (
    <div style={{ background: color, margin: '-20px', padding: '20px', position: 'relative', minHeight: '150px' }}>
        {isEditable && (
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 10, background: 'rgba(255,255,255,0.95)', padding: '8px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '10px', width: '35px', fontWeight: 'bold', color: '#64748b' }}>BG</span>
                    <input type="color" value={color} onChange={e => onChange('color', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} title="Background Color" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '10px', width: '35px', fontWeight: 'bold', color: '#64748b' }}>Text</span>
                    <input type="color" value={textColor} onChange={e => onChange('textColor', e.target.value)} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '4px' }} title="Text Color" />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '10px', width: '35px', fontWeight: 'bold', color: '#64748b' }}>Size</span>
                    <select value={titleSize} onChange={e => onChange('titleSize', e.target.value)} style={{ fontSize: '10px', width: '50px', height: '20px', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
                        <option value="1em">Small</option>
                        <option value="1.2em">Med</option>
                        <option value="1.5em">Large</option>
                        <option value="2em">XL</option>
                    </select>
                </div>
            </div>
        )}

        {isEditable ? (
            <input
                value={title}
                onChange={e => onChange('title', e.target.value)}
                placeholder="Block Title"
                style={{
                    margin: '0 0 15px 0',
                    fontSize: titleSize,
                    fontWeight: 'bold',
                    color: textColor,
                    background: 'transparent',
                    border: '1px dashed rgba(0,0,0,0.3)',
                    width: '100%',
                    padding: '5px',
                    borderRadius: '4px'
                }}
            />
        ) : (
            <h3 style={{ margin: '0 0 15px 0', fontSize: titleSize, fontWeight: 'bold', color: textColor }}>{title}</h3>
        )}

        {isEditable ? (
            <textarea
                value={Array.isArray(data) ? data.join('\n') : data}
                onChange={e => onChange('data', e.target.value.split('\n'))}
                style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.4)', border: '1px dashed rgba(0,0,0,0.2)', padding: '10px', color: textColor, fontFamily: 'inherit', borderRadius: '4px' }}
            />
        ) : (
            <ul style={{ paddingLeft: '20px', margin: 0, color: textColor }}>
                {Array.isArray(data) ? data.map((d, i) => <li key={i} style={{ marginBottom: '5px' }}>{d}</li>) : <li>{data}</li>}
            </ul>
        )}
    </div>
);

// Updated BlockRenderer
const BlockRenderer = ({ block, isEditable, onChange, onConfigure }) => {
    const handleChange = (field, val) => onChange(block.id, field, val);

    // Common Wrapper for Cards
    // PhotoBlock and Demographics and others might have specific needs.
    // The design has white cards with padding.
    // ColoredTextBlock handles its own background/padding negative checks.

    // We wrap standard content in a div.

    const content = (() => {
        switch (block.type) {
            case 'header_info': return <HeaderInfoBlock data={block.data || {}} isEditable={isEditable} onChange={handleChange} />;
            case 'photo': return <PhotoBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'skills': return <SkillsBlock title={block.title} data={block.data} titleSize={block.titleSize} titleColor={block.titleColor} barColor={block.barColor} textColor={block.textColor} isEditable={isEditable} onChange={handleChange} />;
            case 'demographics': return <DemographicsBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'quote': return <QuoteBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'chart': return <ChartBlock title={block.title} data={block.data} chartType={block.chartType} isEditable={isEditable} onChange={handleChange} />;
            case 'list': return <ListBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'text': return <TextBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'tags': return <TagsBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'icon_grid': return <IconGridBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'colored_list': return <ColoredTextBlock title={block.title} data={block.data} color={block.color || '#ecfeff'} titleSize={block.titleSize} textColor={block.textColor} isEditable={isEditable} onChange={handleChange} />;
            default: return <div style={{ color: 'red' }}>Unknown Block: {block.type}</div>;
        }
    })();

    return (
        <div style={{
            background: 'white',
            borderRadius: '2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: block.type === 'photo' ? '0' : '20px', // Photo has no padding
            overflow: 'hidden',
            position: 'relative'
        }}>
            {isEditable && block.type === 'header_info' && (
                <button
                    onClick={() => onConfigure(block)}
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                >
                    <Settings size={18} />
                </button>
            )}
            {content}
        </div>
    );
};


// --- EDITOR VIEW (Inline Edit) ---
// --- EDITOR VIEW (Inline Edit) ---
// ENHANCE MODAL
const EnhanceAIModal = ({ onClose, onEnhance }) => {
    const [instructions, setInstructions] = useState('');
    const [loading, setLoading] = useState(false);
    const handleRun = async () => {
        setLoading(true);
        await onEnhance(instructions);
        setLoading(false);
    };
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2100 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>✨ Enhance with AI</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer' }}>×</button>
                </div>
                <p style={{ color: '#64748b', margin: 0 }}>Provide instructions to update this persona.</p>
                <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="e.g. Make them more senior..." style={{ height: '120px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%', fontFamily: 'inherit' }} />
                <button onClick={handleRun} disabled={loading || !instructions} style={{ background: loading ? '#94a3b8' : '#8b5cf6', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer' }}>{loading ? 'Processing...' : 'Update Persona'}</button>
            </div>
        </div>
    );
};

function PersonaEditor({ id, onBack }) {
    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEnhanceModal, setShowEnhanceModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [addingBlockCol, setAddingBlockCol] = useState(null);
    const [configuringBlock, setConfiguringBlock] = useState(null);

    const [colWidths, setColWidths] = useState({ left: 30, right: 70 });
    // Global resizing state
    const resizingState = React.useRef({ type: null, startX: 0, startY: 0, startVal: 0, blockId: null }); // type: 'col' | 'row'

    useEffect(() => {
        if (id) {
            axios.get(`/api/cx-personas/${id}`)
                .then(res => {
                    let p = res.data;
                    if (p.layout_config && typeof p.layout_config === 'string') {
                        try { p.layout_config = JSON.parse(p.layout_config); } catch (e) { console.error('Parse layout error', e); }
                    }
                    // MIGRATION / INITIALIZATION for NEW LAYOUT
                    // Ensure we have 'header_info' and 'photo' blocks if missing.
                    if (!p.layout_config || !p.layout_config.left) {
                        p.layout_config = { left: [], right: [] };
                    }
                    // Load saved widths if any
                    if (p.layout_config.colWidths) {
                        setColWidths(p.layout_config.colWidths);
                    }

                    const allBlocks = [...p.layout_config.left, ...p.layout_config.right];
                    const hasHeader = allBlocks.find(b => b.type === 'header_info');
                    const hasPhoto = allBlocks.find(b => b.type === 'photo');

                    // If simple persona without new layout, auto-inject
                    if (!hasHeader) {
                        p.layout_config.right.unshift({
                            id: 'header_main',
                            type: 'header_info',
                            data: { name: p.name, title: p.title, market_size: p.layout_config?.header_data?.market_size || 33, personality_type: p.layout_config?.header_data?.personality_type || 'Idealist' }
                        });
                    }
                    if (!hasPhoto) {
                        p.layout_config.left.unshift({
                            id: 'photo_main',
                            type: 'photo',
                            data: p.photo_url
                        });
                    }

                    setPersona(p);
                    setLoading(false);
                })
                .catch(err => {
                    setError("Failed to load persona");
                    setLoading(false);
                });
        }
    }, [id]);

    const handleEnhancePersona = async (instructions) => {
        try {
            const res = await axios.post('/api/ai/generate', {
                prompt: `Current Persona JSON: ${JSON.stringify(persona)}. Request: ${instructions}. Return Updated Persona JSON (valid JSON only). IMPORTANT: All text content (title, bio, items) must be BILINGUAL (English + Arabic translations).`
            });
            let dataStr = res.data.text.trim();
            if (dataStr.includes('```json')) dataStr = dataStr.split('```json')[1].split('```')[0].trim();
            else if (dataStr.includes('```')) dataStr = dataStr.split('```')[1].split('```')[0].trim();
            setPersona(JSON.parse(dataStr));
            setShowEnhanceModal(false);
        } catch (err) {
            alert("Failed: " + err.message);
        }
    };

    const handleSave = () => {
        // Sync header blocks back to root props for list view consistency
        const headerBlock = persona.layout_config.right.find(b => b.type === 'header_info');
        const photoBlock = persona.layout_config.left.find(b => b.type === 'photo');

        const updates = { ...persona };
        if (headerBlock) {
            updates.name = headerBlock.data.name;
            updates.title = headerBlock.data.title; // note: not widely used in new layout but good to keep
            // Should also sync header_data if we want persistence there
            if (!updates.layout_config.header_data) updates.layout_config.header_data = {};
            updates.layout_config.header_data.market_size = headerBlock.data.market_size;
            updates.layout_config.header_data.personality_type = headerBlock.data.personality_type;
        }
        if (photoBlock) {
            updates.photo_url = photoBlock.data;
        }

        // Save column widths
        updates.layout_config.colWidths = colWidths;

        axios.put(`/api/cx-personas/${id}`, updates)
            .then(() => alert("Persona saved!"))
            .catch(err => alert("Save failed: " + err.message));
    };

    const handleAddBlockSelect = (selectedId) => {
        // Map ID to Type and Defaults
        const defaults = {
            'text': { type: 'text', title: 'Text Section', data: 'Add details here...' },
            'scenarios': { type: 'text', title: 'Scenarios', data: 'Describe the scenario...' },
            'quote': { type: 'quote', title: 'Quote', data: 'Your quote here.' },
            'list': { type: 'list', title: 'List', data: ['Item 1', 'Item 2'] },
            'colored_list': { type: 'colored_list', title: 'Motivations', data: ['Item 1', 'Item 2'] },
            'tags': { type: 'tags', title: 'Tags', data: ['Tag 1', 'Tag 2'] },
            'demographics': { type: 'demographics', title: 'Demographics', data: { 'Gender': 'Male', 'Location': 'USA' } },
            'skills': { type: 'skills', title: 'Skills', data: [{ label: 'Skill 1', value: 5 }] },
            'chart': { type: 'chart', title: 'Stats', data: [{ label: 'A', value: 40, color: '#3b82f6' }, { label: 'B', value: 60, color: '#ef4444' }] },
            'icon_grid': { type: 'icon_grid', title: 'Technology', data: ['Chrome', 'Safari'] },
            'photo': { type: 'photo', title: 'Photo', data: '' }
        };

        const config = defaults[selectedId] || defaults['text'];
        const newBlock = { id: Date.now().toString(), type: config.type, title: config.title, data: config.data };
        if (config.type === 'colored_list') newBlock.color = '#ecfeff'; // Default blue

        setPersona(prev => ({
            ...prev,
            layout_config: {
                ...prev.layout_config,
                [addingBlockCol]: [...prev.layout_config[addingBlockCol], newBlock]
            }
        }));
        setAddingBlockCol(null);
    };

    const handleBlockChange = (blockId, field, value) => {
        const updateList = (list) => list.map(b => b.id === blockId ? { ...b, [field]: value } : b);
        setPersona(prev => ({
            ...prev,
            layout_config: {
                left: updateList(prev.layout_config.left),
                right: updateList(prev.layout_config.right)
            }
        }));
    };

    // Configuration Handler
    const handleConfigureSave = (visibility) => {
        // Update the visibility data of the configuring block
        handleBlockChange(configuringBlock.id, 'data', { ...configuringBlock.data, visibility });
        setConfiguringBlock(null);
    };

    const handleDragStart = (e, colKey, idx) => {
        e.dataTransfer.setData("idx", idx);
        e.dataTransfer.setData("col", colKey);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e) => e.preventDefault();

    const handleDrop = (e, targetColKey, targetIdx) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceIdx = parseInt(e.dataTransfer.getData("idx"));
        const sourceColKey = e.dataTransfer.getData("col");

        if (isNaN(sourceIdx)) return;

        const newLayout = JSON.parse(JSON.stringify(persona.layout_config));
        const [movedItem] = newLayout[sourceColKey].splice(sourceIdx, 1);
        newLayout[targetColKey].splice(targetIdx, 0, movedItem);
        setPersona({ ...persona, layout_config: newLayout });
    };

    const deleteBlock = (colKey, idx) => {
        if (!confirm("Delete this block?")) return;
        const newCol = [...persona.layout_config[colKey]];
        newCol.splice(idx, 1);
        setPersona({ ...persona, layout_config: { ...persona.layout_config, [colKey]: newCol } });
    };

    const renderCol = (blocks, colKey) => (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                minHeight: '200px',
                padding: editMode ? '10px' : '0',
                border: editMode ? '2px dashed #475569' : 'none',
                borderRadius: '8px'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colKey, blocks.length)}
        >
            {blocks.map((block, idx) => (
                <div
                    key={block.id}
                    draggable={editMode}
                    onDragStart={(e) => handleDragStart(e, colKey, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, colKey, idx)}
                    style={{ position: 'relative', minHeight: block.minHeight ? `${block.minHeight}px` : 'auto' }}
                >
                    {editMode && (
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', display: 'flex', gap: '5px', background: '#334155', padding: '4px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 10 }}>
                            <span style={{ cursor: 'grab', padding: '0 5px', color: '#cbd5e1', fontSize: '1.2em' }}>⋮⋮</span>
                            <button onClick={() => deleteBlock(colKey, idx)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: '#ef4444', padding: '0 5px' }}>✖️</button>
                        </div>
                    )}
                    <BlockRenderer block={block} isEditable={editMode} onChange={handleBlockChange} onConfigure={setConfiguringBlock} />

                    {/* Row Resizer Handle */}
                    {editMode && (
                        <div
                            onMouseDown={(e) => startRowResizing(e, block.id, block.minHeight)}
                            style={{
                                height: '10px',
                                margin: '0 auto',
                                width: '50px',
                                cursor: 'ns-resize',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',

                            }}
                            title="Drag to resize height"
                        >
                            <div style={{ width: '30px', height: '4px', background: '#cbd5e1', borderRadius: '2px' }}></div>
                        </div>
                    )}
                </div>
            ))}
            {editMode && (
                <button
                    onClick={() => setAddingBlockCol(colKey)}
                    style={{ padding: '15px', border: '2px dashed #64748b', background: 'transparent', color: '#cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginTop: '10px' }}
                >
                    + Add to {colKey}
                </button>
            )}
        </div>
    );

    // Unified Resizer Logic
    const startColResizing = (e) => {
        resizingState.current = { type: 'col' };
    };

    const startRowResizing = (e, blockId, currentHeight) => {
        e.stopPropagation();
        resizingState.current = { type: 'row', startY: e.clientY, startVal: currentHeight || 100, blockId: blockId }; // Default 100 if unset
    };

    const stopResizing = () => {
        resizingState.current = { type: null };
    };

    const handleGlobalMouseMove = (e) => {
        if (!resizingState.current.type) return;

        if (resizingState.current.type === 'col') {
            const container = document.getElementById('persona-grid-container');
            if (container) {
                const containerRect = container.getBoundingClientRect();
                const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                if (newLeftWidth > 15 && newLeftWidth < 85) {
                    setColWidths({ left: newLeftWidth, right: 100 - newLeftWidth });
                }
            }
        } else if (resizingState.current.type === 'row') {
            const deltaY = e.clientY - resizingState.current.startY;
            const newHeight = Math.max(50, resizingState.current.startVal + deltaY); // Min height 50px
            handleBlockChange(resizingState.current.blockId, 'minHeight', newHeight);
        }
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, []);


    if (loading) return <div style={{ padding: '40px', color: 'white', background: '#334155', height: '100vh' }}>Loading...</div>;
    if (error) return <div>{error}</div>;

    const { left, right } = persona.layout_config;

    return (
        <div style={{ background: '#f0fdf4', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", padding: '40px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1em' }}>← Back to List</button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowEnhanceModal(true)} style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>✨ Enhance</button>
                        <button
                            onClick={() => setEditMode(!editMode)}
                            style={{ padding: '10px 20px', background: editMode ? '#cbd5e1' : '#1e293b', color: editMode ? '#0f172a' : 'white', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            {editMode ? 'Stop Editing' : 'Edit Persona'}
                        </button>
                        {editMode && (
                            <button
                                onClick={handleSave}
                                style={{ padding: '10px 20px', background: '#bef264', color: '#3f6212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Grid Layout - Resizable */}
                {/* Main Grid Layout - Resizable */}
                <div
                    id="persona-grid-container"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `${colWidths.left}fr 10px ${colWidths.right}fr`, // Use Fr units to fit
                        gap: '0',
                        alignItems: 'start',
                        userSelect: resizingState.current.type ? 'none' : 'auto' // Prevent selection while dragging
                    }}
                >
                    <div style={{ paddingRight: '15px' }}>{renderCol(left, 'left')}</div>

                    {/* Drag Handle */}
                    {/* Drag Handle */}
                    <div
                        onMouseDown={startColResizing}
                        style={{
                            width: '10px',
                            cursor: 'col-resize',
                            display: 'flex',
                            justifyContent: 'center',
                            height: '100%',
                            background: editMode ? 'rgba(255,255,255,0.05)' : 'transparent', // Visual feedback
                            zIndex: 10
                        }}
                    >
                        {editMode && (
                            <div style={{ width: '4px', background: '#94a3b8', height: '60px', alignSelf: 'center', borderRadius: '4px' }}></div>
                        )}
                    </div>

                    <div style={{ paddingLeft: '15px' }}>{renderCol(right, 'right')}</div>
                </div>
            </div>
            {addingBlockCol && <AddBlockModal onClose={() => setAddingBlockCol(null)} onSelect={handleAddBlockSelect} />}
            {configuringBlock && <ConfigureBlockModal block={configuringBlock} onClose={() => setConfiguringBlock(null)} onSave={handleConfigureSave} />}
            {showEnhanceModal && <EnhanceAIModal onClose={() => setShowEnhanceModal(false)} onEnhance={handleEnhancePersona} />}
        </div>
    );
}

// --- GALLERY ADD MODAL ---

const AddBlockModal = ({ onClose, onSelect }) => {
    const [activeTab, setActiveTab] = useState('text');
    const [selectedId, setSelectedId] = useState(null);

    const categories = {
        'text': { label: 'Text & Code', items: ['scenarios', 'text', 'demographics', 'quote', 'list', 'colored_list', 'tags'] },
        'graph': { label: 'Graph, Chart & Slide', items: ['skills', 'chart'] },
        'media': { label: 'Media / File', items: ['icon_grid', 'photo'] }
    };

    const blockTypes = {
        'scenarios': { label: 'Scenarios', desc: 'Define the main task the persona wants to accomplish and capture how they perform it.', preview: '🎬' },
        'text': { label: 'Text section', desc: 'Capture any info in a free text format.', preview: '📄' },
        'demographics': { label: 'Demographic', desc: 'Add gender, age, location, and other key attributes.', preview: '📋' },
        'quote': { label: 'Quote', desc: 'Highlight a key phrase or motto.', preview: '❝' },
        'list': { label: 'List', desc: 'Bullet points for goals or frustrations.', preview: '• • •' },
        'colored_list': { label: 'Colored List', desc: 'List with a colored background card (e.g. Motivations).', preview: '🎨' },
        'tags': { label: 'Tags', desc: 'Pills/Chips for skills or traits.', preview: '🏷️' },
        'skills': { label: 'Skills', desc: 'Slider bars for proficiency levels.', preview: '📊' },
        'chart': { label: 'Chart', desc: 'Bar or Pie charts for data distribution.', preview: '📈' },
        'icon_grid': { label: 'Icon Grid', desc: 'Grid of icons (Tech stack, Browsers, Channels).', preview: '📱' },
        'photo': { label: 'Photo', desc: 'Add a photo block.', preview: '🖼️' }
    };

    // Auto-select first item of tab
    useEffect(() => {
        const first = categories[activeTab].items[0];
        setSelectedId(first);
    }, [activeTab]);

    const currentItem = blockTypes[selectedId] || blockTypes['text'];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', width: '900px', height: '600px', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2em', letterSpacing: '0.05em' }}>ADD SECTION</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 30px' }}>
                    {Object.entries(categories).map(([key, cat]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: '15px 20px',
                                background: 'none',
                                border: 'none',
                                borderBottom: activeTab === key ? '3px solid #10b981' : '3px solid transparent',
                                fontWeight: 'bold',
                                color: activeTab === key ? '#0f172a' : '#64748b',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left: List */}
                    <div style={{ width: '40%', borderRight: '1px solid #e2e8f0', overflowY: 'auto', background: '#f8fafc' }}>
                        {categories[activeTab].items.map(itemId => {
                            const item = blockTypes[itemId];
                            return (
                                <div
                                    key={itemId}
                                    onClick={() => setSelectedId(itemId)}
                                    style={{
                                        padding: '20px 30px',
                                        cursor: 'pointer',
                                        background: selectedId === itemId ? 'white' : 'transparent',
                                        borderBottom: '1px solid #e2e8f0',
                                        borderLeft: selectedId === itemId ? '4px solid #10b981' : '4px solid transparent',
                                        transition: 'all 0.1s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                                        <span style={{ fontSize: '1.2em' }}>{item.preview}</span>
                                        <span style={{ fontWeight: 'bold', color: selectedId === itemId ? '#0f172a' : '#475569' }}>{item.label}</span>
                                    </div>
                                    <div style={{ fontSize: '0.85em', color: '#64748b', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {item.desc}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right: Preview */}
                    <div style={{ width: '60%', padding: '40px', display: 'flex', flexDirection: 'column', background: 'white' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.5em', color: '#1e293b' }}>{currentItem.label}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '1em' }}>{currentItem.desc}</p>
                        </div>

                        <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', marginBottom: '30px' }}>
                            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                                <div style={{ fontSize: '3em', marginBottom: '10px' }}>{currentItem.preview}</div>
                                <div>Preview</div>
                            </div>
                        </div>

                        <button
                            onClick={() => onSelect(selectedId)}
                            style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '30px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', letterSpacing: '0.05em', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}
                        >
                            ADD TO PERSONA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("PersonaEditor crashed:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', background: '#fee2e2', borderRadius: '8px' }}>
                    <h3>Something went wrong.</h3>
                    <p>{this.state.error && this.state.error.toString()}</p>
                    <button onClick={() => this.setState({ hasError: false })} style={{ padding: '8px 16px', marginTop: '10px' }}>Try Again</button>
                    <button onClick={this.props.onBack} style={{ padding: '8px 16px', marginTop: '10px', marginLeft: '10px' }}>Go Back</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// --- ADD PERSONA MODALS ---
const TemplateSelectionModal = ({ onClose, onSelect }) => {
    const templates = [
        {
            label: "Saudi Gov Employee / موظف حكومي",
            desc: "Public sector manager aligned with Vision 2030.",
            payload: {
                name: "Mohammed Al-Otaibi / محمد العتيبي",
                title: "Department Head / رئيس قسم",
                layout_config: {
                    left: [{ id: 'demo', type: 'demographics', data: { 'Location': 'Riyadh / الرياض', 'Age': '42', 'Education': 'Master / ماجستير' }, minHeight: 200 }],
                    right: [
                        { id: 'header', type: 'header_info', data: { name: "Mohammed Al-Otaibi / محمد العتيبي", title: "Department Head / رئيس قسم", market_size: 25, personality_type: "Guardian" } },
                        { id: 'bio', type: 'text', title: 'Bio / نبذة', data: "Mohammed is a dedicated government employee with 15 years of experience. He is focused on digital transformation and efficiency. \n\n محمد موظف حكومي متفاني لديه 15 عامًا من الخبرة. يركز على التحول الرقمي والكفاءة." },
                        { id: 'goals', type: 'list', title: 'Goals / الأهداف', data: ['Implement paperless workflow / تطبيق العمل بلا ورق', 'Upskill team / تطوير مهارات الفريق'] }
                    ]
                }
            }
        },
        {
            label: "Saudi Tech Entrepreneur / رائد أعمال",
            desc: "Young founder in the Riyadh startup ecosystem.",
            payload: {
                name: "Sara Al-Harbi / سارة الحربي",
                title: "CEO & Founder / المؤسس والرئيس التنفيذي",
                layout_config: {
                    left: [{ id: 'demo', type: 'demographics', data: { 'Location': 'Jeddah / جدة', 'Age': '28' }, minHeight: 200 }],
                    right: [
                        { id: 'header', type: 'header_info', data: { name: "Sara Al-Harbi / سارة الحربي", title: "Founder / مؤسس", market_size: 10, personality_type: "Innovator" } },
                        { id: 'bio', type: 'text', title: 'Bio / نبذة', data: "Sara runs a fintech startup. She is tech-savvy and ambitious. \n\n سارة تدير شركة ناشئة في مجال التقنية المالية. هي خبيرة تقنية وطموحة." }
                    ]
                }
            }
        }
    ];

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2100 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '700px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Select a Template / اختر نموذج</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {templates.map((t, i) => (
                        <div key={i} onClick={() => onSelect(t.payload)} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.borderColor = '#2563eb'}
                            onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>{t.label}</div>
                            <div style={{ fontSize: '0.9em', color: '#64748b' }}>{t.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const AddPersonaModal = ({ onClose, onCreateBlank, onOpenAI, onOpenVoice, onOpenTemplate }) => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
        <style>
            {`
            @keyframes glitter {
                0% { filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.5)); transform: scale(1); }
                50% { filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8)); transform: scale(1.1); }
                100% { filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.5)); transform: scale(1); }
            }
            @keyframes pulse-red {
                0% { filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5)); transform: scale(1); }
                50% { filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8)); transform: scale(1.1); }
                100% { filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5)); transform: scale(1); }
            }
            `}
        </style>
        <div style={{ background: '#f0fdf4', padding: '40px', borderRadius: '16px', width: '1000px', display: 'flex', flexDirection: 'column', gap: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: '#166534' }}>Create a New Persona</h2>
                <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#166534' }}>×</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>

                {/* Scratch */}
                <div onClick={onCreateBlank} style={{ background: 'white', border: '2px solid transparent', borderRadius: '12px', padding: '30px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ marginBottom: '15px', color: '#64748b' }}><FileText size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Build from Scratch</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9em' }}>Start from scratch with an empty canvas.</p>
                </div>

                {/* Template */}
                <div onClick={onOpenTemplate} style={{ background: 'white', border: '2px solid transparent', borderRadius: '12px', padding: '30px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#2563eb'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ marginBottom: '15px', color: '#64748b' }}><ClipboardList size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>From Template</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9em' }}>Import from Saudi-specific templates.</p>
                </div>

                {/* AI Text (Glitter) */}
                <div onClick={onOpenAI} style={{ background: 'white', border: '2px solid transparent', borderRadius: '12px', padding: '30px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#8b5cf6'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ marginBottom: '15px', color: '#8b5cf6', animation: 'glitter 3s infinite ease-in-out' }}>
                        <Sparkles size={48} strokeWidth={2} />
                    </div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Using AI Text</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9em' }}>Generate a detailed persona from text description.</p>
                </div>

                {/* AI Voice (Glitter Red) */}
                <div onClick={onOpenVoice} style={{ background: 'white', border: '2px solid transparent', borderRadius: '12px', padding: '30px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    <div style={{ marginBottom: '15px', color: '#ef4444', animation: 'pulse-red 3s infinite ease-in-out' }}>
                        <Mic size={48} strokeWidth={2} />
                    </div>
                    <h3 style={{ margin: '0 0 10px 0', color: '#1e293b' }}>Using AI Voice</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9em' }}>Speak to generate a persona instantly.</p>
                </div>
            </div>
        </div>
    </div>
);

const CreateAIModal = ({ onClose, onGenerate }) => {
    const [desc, setDesc] = useState('');
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);

    const handleGen = async () => {
        setLoading(true);
        await onGenerate({ desc, name, country });
        setLoading(false);
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome/Edge use webm
                // Create File from blob
                const audioFile = new File([audioBlob], "voice_input.webm", { type: 'audio/webm' });
                handleVoiceProcess(audioFile);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            alert("Microphone access denied or error: " + err.message);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleVoiceProcess = async (file) => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prompt', `Generate a User Persona JSON based on this audio description. Return ONLY JSON with: name, title, bio, demographics (obj with Gender, Age, Location, etc), skills (array of {label, value 0-10}), motivations (array of strings). IMPORTANT: All text content (Name, Title, Bio, List Items) must be BILINGUAL (English followed by Arabic translation). e.g. "Manager / مدير".`);

            const res = await axios.post('/api/ai/generate-multimodal', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            let dataStr = res.data.text.trim();
            // Try to extract JSON if wrapped in markdown
            if (dataStr.includes('```json')) {
                dataStr = dataStr.split('```json')[1].split('```')[0].trim();
            } else if (dataStr.includes('```')) {
                dataStr = dataStr.split('```')[1].split('```')[0].trim();
            }
            const pData = JSON.parse(dataStr);
            // Pass direct data
            await onGenerate({ directData: pData });
            onClose(); // Close modal on success
        } catch (err) {
            console.error(err);
            alert("Voice Processing Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2100 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>✨ Generate with AI</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px' }}>
                    {!isRecording ? (
                        <button onClick={startRecording} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '30px', border: 'none', background: '#f1f5f9', color: '#0f172a', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'} onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                            <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
                            Record Voice Input / تسجيل صوتي
                        </button>
                    ) : (
                        <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 24px', borderRadius: '30px', border: 'none', background: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', cursor: 'pointer', animation: 'pulse 1s infinite' }}>
                            <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }}></div>
                            Stop Recording...
                        </button>
                    )}
                </div>

                <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.9em' }}>OR Type Description</div>

                <textarea
                    value={desc} onChange={e => setDesc(e.target.value)}
                    placeholder="Describe the persona..."
                    style={{ height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', width: '100%' }}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (Optional)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country (Optional)" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                </div>

                <button
                    onClick={handleGen}
                    disabled={loading || !desc}
                    style={{ background: loading ? '#94a3b8' : '#8b5cf6', color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: loading ? 'default' : 'pointer' }}
                >
                    {loading ? 'Processing...' : 'Generate Persona'}
                </button>
            </div>
        </div>
    );
};



// --- MAIN WRAPPER ---
export function CxPersonaBuilder() {
    const [viewMode, setViewMode] = useState('list');
    const [selectedId, setSelectedId] = useState(null);

    if (viewMode === 'list') {
        return <PersonaList onSelect={(id) => { setSelectedId(id); setViewMode('edit'); }} />;
    } else {
        return (
            <ErrorBoundary onBack={() => { setSelectedId(null); setViewMode('list'); }}>
                <PersonaEditor id={selectedId} onBack={() => { setSelectedId(null); setViewMode('list'); }} />
            </ErrorBoundary>
        );
    }
}

// --- LIST VIEW ---
function PersonaList({ onSelect }) {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    useEffect(() => {
        axios.get('/api/cx-personas')
            .then(res => {
                setPersonas(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.response?.data?.error || err.message || "Failed to load personas");
                setLoading(false);
            });
    }, []);

    const handleCreateTemplate = (payload) => {
        axios.post('/api/cx-personas', payload)
            .then(res => onSelect(res.data.id))
            .catch(err => alert("Create failed: " + err.message));
    };

    const handleCreateBlank = () => {
        axios.post('/api/cx-personas', { name: 'New Persona', title: 'Untitled Role' })
            .then(res => onSelect(res.data.id))
            .catch(err => alert("Create failed: " + err.message));
    };

    const handleGenerateAI = async ({ desc, name, country, directData }) => {
        try {
            let pData = directData;

            if (!pData) {
                // Text-based Generation
                const aiRes = await axios.post('/api/ai/generate', {
                    prompt: `Generate a User Persona JSON based on: "${desc}". Name: "${name || 'Auto'}", Country: "${country || 'Auto'}". Return ONLY JSON with: name, title, bio, demographics (obj with Gender, Age, Location, etc), skills (array of {label, value 0-10}), motivations (array of strings). IMPORTANT: All text content (Name, Title, Bio, List Items) must be BILINGUAL (English followed by Arabic translation). e.g. "Manager / مدير".`
                });
                let dataStr = aiRes.data.text.trim();
                // Try to extract JSON if wrapped in markdown
                if (dataStr.includes('```json')) {
                    dataStr = dataStr.split('```json')[1].split('```')[0].trim();
                } else if (dataStr.includes('```')) {
                    dataStr = dataStr.split('```')[1].split('```')[0].trim();
                }
                pData = JSON.parse(dataStr);
            }

            console.log("AI Generated:", pData);

            // Construct payload
            const payload = {
                name: pData.name || name || "AI Persona",
                title: pData.title || "Generated Role",
                layout_config: {
                    left: [
                        { id: 'photo', type: 'photo', data: '', minHeight: 400 },
                        { id: 'demo', type: 'demographics', data: pData.demographics || { 'Location': country || 'Unknown' } }
                    ],
                    right: [
                        { id: 'header', type: 'header_info', data: { name: pData.name, title: pData.title, market_size: 20, personality_type: 'Unknown' } },
                        { id: 'bio', type: 'text', title: 'Bio', data: pData.bio || desc || "AI Generated" },
                        { id: 'skills', type: 'skills', title: 'Skills', data: pData.skills || [] },
                        { id: 'motivations', type: 'colored_list', title: 'Motivations', data: pData.motivations || [], color: '#ecfeff' }
                    ]
                }
            };

            // Post to backend
            const saveRes = await axios.post('/api/cx-personas', payload);
            onSelect(saveRes.data.id);
        } catch (err) {
            console.error(err);
            alert("AI Generation failed: " + err.message);
        }
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        if (!confirm("Delete this persona?")) return;
        axios.delete(`/api/cx-personas/${id}`)
            .then(() => setPersonas(personas.filter(p => p.id !== id)))
            .catch(err => alert("Delete failed: " + err.message));
    };

    if (loading) return <div style={{ padding: '40px', color: 'white' }}>Loading Personas...</div>;
    if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}. Is the backend running?</div>;

    return (
        <div style={{ padding: '20px', fontFamily: "'Outfit', sans-serif", background: '#f0fdf4', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>CX Persona Builder</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => window.location.href = '/persona-new'}
                        style={{ padding: '8px 16px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        ✨ Try New Editor (Beta)
                    </button>
                    <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                        + Add Persona
                    </button>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {personas.map(p => (
                    <div key={p.id} onClick={() => onSelect(p.id)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'box-shadow 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.1)'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                            <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {p.photo_url ? <img src={p.photo_url} style={{ width: '100%', borderRadius: '50%' }} /> : '👤'}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', color: '#0f172a' }}>{p.name}</div>
                                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{p.title || 'No Title'}</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '15px', fontSize: '0.8em', color: '#94a3b8' }}>
                            <span>Updated {new Date(p.updated_at).toLocaleDateString()}</span>
                            <button onClick={(e) => handleDelete(e, p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            {showAddModal && <AddPersonaModal onClose={() => setShowAddModal(false)} onCreateBlank={handleCreateBlank} onOpenAI={() => { setShowAddModal(false); setShowAIModal(true); }} onOpenVoice={() => { setShowAddModal(false); setShowAIModal(true); }} onOpenTemplate={() => { setShowAddModal(false); setShowTemplateModal(true); }} />}
            {showAIModal && <CreateAIModal onClose={() => setShowAIModal(false)} onGenerate={handleGenerateAI} />}
            {showTemplateModal && <TemplateSelectionModal onClose={() => setShowTemplateModal(false)} onSelect={handleCreateTemplate} />}
        </div>
    );
}

export default CxPersonaBuilder;
