import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User as UserIcon, MapPin, Briefcase, Calendar, Plus, GripVertical, Settings } from 'lucide-react';

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

// --- COMPONENTS with VISUAL ENHANCEMENTS ---

const PieChart = ({ percentage, color = '#bef264' }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: `conic-gradient(${color} 0% ${percentage}%, #ecfccb ${percentage}% 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Inner circle for donut chart look if desired, or plain pie */}
        </div>
        <div style={{ fontSize: '1.5em', fontWeight: 'bold', color: '#475569' }}>{percentage}%</div>
    </div>
);

const ConfigureBlockModal = ({ block, onClose, onSave }) => {
    // Default visibility if undefined
    const initialVisibility = block.data.visibility || { name: true, market_size: true, personality_type: true };
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
                            <input
                                value={data.name}
                                onChange={e => updateData('name', e.target.value)}
                                placeholder="Persona Name"
                                style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '2em', fontWeight: 'bold', color: '#b91c1c', border: 'none', borderBottom: '1px dashed #cbd5e1', outline: 'none', background: 'transparent', marginBottom: '5px' }}
                            />
                            <input
                                value={data.title}
                                onChange={e => updateData('title', e.target.value)}
                                placeholder="Job Title"
                                style={{ display: 'block', width: '100%', textAlign: 'center', fontSize: '1.1em', color: '#64748b', border: 'none', borderBottom: '1px dashed #cbd5e1', outline: 'none', background: 'transparent' }}
                            />
                        </>
                    ) : (
                        <>
                            <h1 style={{ margin: '0 0 5px 0', fontSize: '2em', color: '#b91c1c' }}>{data.name || 'Persona Name'}</h1>
                            <div style={{ color: '#64748b', fontSize: '1.1em' }}>{data.title || 'Job Title'}</div>
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
                                    value={data.personality_type || 'Organizer'}
                                    onChange={e => updateData('personality_type', e.target.value)}
                                    style={{ background: 'transparent', border: 'none', fontSize: '1.2em', fontWeight: 'bold', color: '#022c22', width: '100%', outline: 'none' }}
                                />
                            ) : (
                                <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#022c22' }}>
                                    {data.personality_type || 'Organizer'} <span style={{ fontSize: '0.8em', opacity: 0.7 }}>💡</span>
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
                        <div style={{ width: '24px', display: 'flex', justifyContent: 'center' }}>
                            {getIcon(key, val)}
                        </div>

                        {isEditable ? (
                            <div style={{ flex: 1, display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <input
                                    value={val}
                                    onChange={e => { const n = [...entries]; n[idx][1] = e.target.value; update(Object.fromEntries(n)); }}
                                    style={{ border: 'none', borderBottom: '1px solid #cbd5e1', padding: '8px 0', fontSize: '1.1em', color: '#334155', width: '100%', outline: 'none', background: 'transparent' }}
                                    placeholder={key}
                                />
                                {key.toLowerCase() === 'age' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {/* Mock Number Input arrows if desired, standard number input works */}
                                        <span style={{ color: '#64748b', whiteSpace: 'nowrap' }}>years</span>
                                    </div>
                                )}
                                <button onClick={() => { const n = [...entries]; n.splice(idx, 1); update(Object.fromEntries(n)); }} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
                            </div>
                        ) : (
                            <div style={{ fontSize: '1.1em', color: '#334155', padding: '8px 0', borderBottom: '1px solid transparent' }}>
                                {val} {key.toLowerCase() === 'age' ? 'years' : ''}
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
    const handleUpload = () => {
        const url = prompt("Enter Image URL:", data || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=800&q=80");
        if (url) onChange('data', url);
    };

    return (
        <div style={{ height: '100%', minHeight: '300px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <img
                src={data || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=800&q=80"}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {isEditable && (
                <button onClick={handleUpload} style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                    Change Photo
                </button>
            )}
        </div>
    );
};

const HeaderInfoBlock = ({ data, isEditable, onChange }) => {
    // Data contains: { name, title, market_size, personality_type }
    // We need to propagate changes up.
    // onChange('data', { ...data, field: val }) works if parent handles "data" updates.
    // But for "name" and "title", we might want them on the root persona object? 
    // The previous implementation mapped "data" fields to root. We will keep that logic in `handleBlockChange` if needed, 
    // OR just store them in this block's data for rendering, and sync on save.
    // For simplicity, let's treat this block as the source of truth for these styled elements.

    const update = (field, val) => onChange('data', { ...data, [field]: val });

    return (
        <div style={{ padding: '0' }}>
            {/* Top Row: Name and Market Size */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>NAME</div>
                    {isEditable ? (
                        <input
                            value={data.name || ''}
                            onChange={e => update('name', e.target.value)}
                            style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#b91c1c', border: 'none', width: '100%', outline: 'none', background: 'transparent', fontFamily: 'serif' }}
                            placeholder="Persona Name"
                        />
                    ) : (
                        <h1 style={{ margin: 0, fontSize: '2.5em', color: '#b91c1c', fontFamily: 'serif' }}>{data.name || 'Persona Name'}</h1>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>MARKET SIZE</div>
                    <PieChart percentage={data.market_size || 33} color="#bef264" />
                </div>
            </div>

            {/* Bottom Row: Type Bar */}
            <div style={{ background: '#bef264', padding: '15px 20px', marginLeft: '-20px', marginRight: '-20px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ fontSize: '0.7em', textTransform: 'uppercase', color: '#3f6212', fontWeight: 'bold' }}>TYPE</div>
                {isEditable ? (
                    <input
                        value={data.personality_type || ''}
                        onChange={e => update('personality_type', e.target.value)}
                        style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1a2e05', border: 'none', background: 'transparent', outline: 'none' }}
                        placeholder="Idealist"
                    />
                ) : (
                    <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#1a2e05' }}>{data.personality_type || 'Idealist'}</div>
                )}
            </div>
        </div>
    );
};

const SkillsBlock = ({ data, isEditable, onChange }) => {
    // Data: [{ label: 'Music literacy', value: 75 }, ...]
    const entries = Array.isArray(data) ? data : [{ label: 'Skill 1', value: 50 }];
    const update = (newEntries) => onChange('data', newEntries);

    return (
        <div style={{ padding: '10px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>Skills</h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {entries.map((skill, idx) => (
                    <div key={idx}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            {isEditable ? (
                                <input
                                    value={skill.label}
                                    onChange={e => { const n = [...entries]; n[idx].label = e.target.value; update(n); }}
                                    style={{ border: 'none', fontWeight: '500', color: '#475569', fontSize: '1em', background: 'transparent' }}
                                />
                            ) : (
                                <div style={{ fontWeight: '500', color: '#475569' }}>{skill.label}</div>
                            )}
                        </div>
                        <div style={{ position: 'relative', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '10px' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${skill.value}%`, background: '#bef264', borderRadius: '2px' }}></div>
                            {isEditable && (
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={skill.value}
                                    onChange={e => { const n = [...entries]; n[idx].value = parseInt(e.target.value); update(n); }}
                                    style={{ position: 'absolute', top: '-10px', width: '100%', opacity: 0, cursor: 'pointer', height: '20px' }}
                                />
                            )}
                            {/* Thumb circle visual */}
                            <div style={{ position: 'absolute', left: `${skill.value}%`, top: '50%', transform: 'translate(-50%, -50%)', width: '12px', height: '12px', background: '#fff', border: '2px solid #bef264', borderRadius: '50%', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6em', color: '#94a3b8', marginTop: '5px' }}>
                            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
                        </div>
                    </div>
                ))}
            </div>
            {isEditable && (
                <button onClick={() => update([...entries, { label: 'New Skill', value: 50 }])} style={{ marginTop: '15px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8em', textTransform: 'uppercase' }}>+ Add Skill</button>
            )}
        </div>
    );
};

const IconGridBlock = ({ title, data, isEditable, onChange }) => {
    // Data: [{ label: 'Chrome', icon: 'chrome' }, ...]
    // Simplified: Just labels for MVP, we render default icons.
    const items = Array.isArray(data) ? data : ['Item 1', 'Item 2'];
    const update = (newItems) => onChange('data', newItems);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', fontWeight: 'bold', color: '#0f172a' }}>{title}</h3>
            </div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ textAlign: 'center', minWidth: '60px' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px solid #bef264', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 5px', color: '#84cc16' }}>
                            {/* Placeholder Icon */}
                            <div style={{ width: '24px', height: '24px', background: '#bef264', borderRadius: '50%' }}></div>
                        </div>
                        {isEditable ? (
                            <input
                                value={item}
                                onChange={e => { const n = [...items]; n[idx] = e.target.value; update(n); }}
                                style={{ width: '100%', textAlign: 'center', border: 'none', fontSize: '0.8em', color: '#64748b', background: 'transparent' }}
                            />
                        ) : (
                            <div style={{ fontSize: '0.8em', color: '#64748b' }}>{item}</div>
                        )}
                    </div>
                ))}
                {isEditable && <button onClick={() => update([...items, 'New Item'])} style={{ width: '50px', height: '50px', borderRadius: '50%', border: '2px dashed #e2e8f0', color: '#94a3b8', background: 'none', cursor: 'pointer' }}>+</button>}
            </div>
        </div>
    );
};

// ... (Other standard blocks: Quote, List, Text, Demographics, Tags - verify background colors) ...
// Quote needs green quotes.
// List needs standard bullets.
// Text is fine.

const ColoredTextBlock = ({ title, data, color = '#ecfeff', isEditable, onChange }) => (
    <div style={{ background: color, margin: '-20px', padding: '20px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1.2em', fontWeight: 'bold' }}>{title}</h3>
        {isEditable ? (
            <textarea
                value={Array.isArray(data) ? data.join('\n') : data}
                onChange={e => onChange('data', e.target.value.split('\n'))}
                style={{ width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.5)', border: 'none', padding: '10px' }}
            />
        ) : (
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
                {Array.isArray(data) ? data.map((d, i) => <li key={i} style={{ marginBottom: '5px' }}>{d}</li>) : <li>{data}</li>}
            </ul>
        )}
    </div>
);

// Updated BlockRenderer
const BlockRenderer = ({ block, isEditable, onChange }) => {
    const handleChange = (field, val) => onChange(block.id, field, val);

    // Common Wrapper for Cards
    // PhotoBlock and Demographics and others might have specific needs.
    // The design has white cards with padding.
    // ColoredTextBlock handles its own background/padding negative checks.

    // We wrap standard content in a div.

    const content = (() => {
        switch (block.type) {
            case 'header_info': return <HeaderInfoBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'photo': return <PhotoBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'skills': return <SkillsBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'demographics': return <DemographicsBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'quote': return <QuoteBlock data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'list': return <ListBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'text': return <TextBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'tags': return <TagsBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'icon_grid': return <IconGridBlock title={block.title} data={block.data} isEditable={isEditable} onChange={handleChange} />;
            case 'colored_list': return <ColoredTextBlock title={block.title} data={block.data} color={block.color || '#ecfeff'} isEditable={isEditable} onChange={handleChange} />;
            default: return <div style={{ color: 'red' }}>Unknown Block: {block.type}</div>;
        }
    })();

    return (
        <div style={{
            background: 'white',
            borderRadius: '2px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: block.type === 'photo' ? '0' : '20px', // Photo has no padding
            overflow: 'hidden'
        }}>
            {content}
        </div>
    );
};


// --- EDITOR VIEW (Inline Edit) ---
function PersonaEditor({ id, onBack }) {
    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [addingBlockCol, setAddingBlockCol] = useState(null);

    useEffect(() => {
        if (id) {
            axios.get(`/api/cx-personas/${id}`)
                .then(res => {
                    let p = res.data;
                    // MIGRATION / INITIALIZATION for NEW LAYOUT
                    // Ensure we have 'header_info' and 'photo' blocks if missing.
                    if (!p.layout_config || !p.layout_config.left) {
                        p.layout_config = { left: [], right: [] };
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

        axios.put(`/api/cx-personas/${id}`, updates)
            .then(() => alert("Persona saved!"))
            .catch(err => alert("Save failed: " + err.message));
    };

    const handleAddBlockSelect = (type) => {
        let title = 'New Section';
        let data = "Content";

        if (type === 'skills') { title = 'Skills'; data = [{ label: 'Skill 1', value: 50 }]; }
        else if (type === 'list') { title = 'List'; data = ['Item 1', 'Item 2']; }
        else if (type === 'colored_list') { title = 'Motivations'; data = ['Item 1', 'Item 2']; }
        else if (type === 'icon_grid') { title = 'Technology'; data = ['Chrome', 'Safari']; }
        else if (type === 'demographics') { title = 'Demographics'; data = { 'Gender': 'Male', 'Location': 'USA' }; }
        else if (type === 'tags') { title = 'Tags'; data = ['Tag 1', 'Tag 2']; }
        else if (type === 'quote') { title = 'Quote'; data = "Your quote here."; }

        const newBlock = { id: Date.now().toString(), type, title, data };
        if (type === 'colored_list') newBlock.color = '#ecfeff'; // Default blue

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
                    style={{ position: 'relative' }}
                >
                    {editMode && (
                        <div style={{ position: 'absolute', right: '-10px', top: '-10px', display: 'flex', gap: '5px', background: '#334155', padding: '4px', borderRadius: '6px', boxShadow: '0 2px 5px rgba(0,0,0,0.3)', zIndex: 10 }}>
                            <span style={{ cursor: 'grab', padding: '0 5px', color: '#cbd5e1', fontSize: '1.2em' }}>⋮⋮</span>
                            <button onClick={() => deleteBlock(colKey, idx)} style={{ cursor: 'pointer', border: 'none', background: 'none', color: '#ef4444', padding: '0 5px' }}>✖️</button>
                        </div>
                    )}
                    <BlockRenderer block={block} isEditable={editMode} onChange={handleBlockChange} />
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

    if (loading) return <div style={{ padding: '40px', color: 'white', background: '#334155', height: '100vh' }}>Loading...</div>;
    if (error) return <div>{error}</div>;

    const { left, right } = persona.layout_config;

    return (
        <div style={{ background: '#334155', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", padding: '40px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', alignItems: 'center' }}>
                    <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.1em' }}>← Back to List</button>
                    <div style={{ display: 'flex', gap: '10px' }}>
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

                {/* Main Grid Layout - Mimicking UXPressia image */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 30%) 1fr', gap: '30px', alignItems: 'start' }}>
                    <div>{renderCol(left, 'left')}</div>
                    <div>{renderCol(right, 'right')}</div>
                </div>
            </div>
            {addingBlockCol && <AddBlockModal onClose={() => setAddingBlockCol(null)} onSelect={handleAddBlockSelect} />}
        </div>
    );
}

// --- GALLERY ADD MODAL ---

const AddBlockModal = ({ onClose, onSelect }) => {
    const [selectedType, setSelectedType] = useState('text');

    const types = [
        { id: 'text', label: 'Text Block', desc: 'A generic text block for backgrounds, stories, or descriptions.', preview: '📄' },
        { id: 'quote', label: 'Quote', desc: 'Highlight a key phrase or motto for the persona.', preview: '❝' },
        { id: 'list', label: 'List', desc: 'Bullet points for goals, frustrations, or key traits.', preview: '• • •' },
        { id: 'tags', label: 'Tags', desc: 'Pills/Chips for skills, software, or personality traits.', preview: '🏷️ 🏷️' },
        { id: 'demographics', label: 'Demographics', desc: 'Key-value pairs for age, location, occupation, etc.', preview: '📋' },
        { id: 'skills', label: 'Skills', desc: 'Slider bars for proficiency levels.', preview: '📊' },
        { id: 'colored_list', label: 'Colored List', desc: 'List with a colored background card.', preview: '🎨' },
        { id: 'icon_grid', label: 'Icon Grid', desc: 'Grid of items with circular icons (e.g. Technology).', preview: '📱' }
    ];

    const currentType = types.find(t => t.id === selectedType);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', width: '800px', height: '500px', borderRadius: '12px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2em', letterSpacing: '0.05em' }}>ADD SECTION</h2>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5em', cursor: 'pointer', color: '#94a3b8' }}>×</button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left: Type Gallery */}
                    <div style={{ width: '60%', padding: '20px', overflowY: 'auto', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                            {types.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedType(t.id)}
                                    style={{
                                        padding: '15px',
                                        background: 'white',
                                        border: selectedType === t.id ? '2px solid #10b981' : '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: '1.5em', background: '#eff6ff', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.preview}</div>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{t.label}</div>
                                        <div style={{ fontSize: '0.8em', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{t.desc}</div>
                                    </div>
                                    {selectedType === t.id && <div style={{ marginLeft: 'auto', color: '#10b981' }}>✓</div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Details / Preview */}
                    <div style={{ width: '40%', padding: '30px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ background: '#f0fdf4', color: '#166534', padding: '5px 10px', borderRadius: '4px', alignSelf: 'start', fontSize: '0.8em', fontWeight: 'bold', marginBottom: '10px' }}>SELECTED</div>
                        <h2 style={{ margin: '0 0 10px 0' }}>{currentType.label}</h2>
                        <p style={{ lineHeight: '1.6', color: '#475569' }}>{currentType.desc}</p>

                        <div style={{ marginTop: 'auto' }}>
                            <button
                                onClick={() => onSelect(selectedType)}
                                style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', letterSpacing: '0.05em' }}
                            >
                                ADD TO PERSONA
                            </button>
                        </div>
                    </div>
                </div>
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
        return <PersonaEditor id={selectedId} onBack={() => { setSelectedId(null); setViewMode('list'); }} />;
    }
}

// --- LIST VIEW ---
function PersonaList({ onSelect }) {
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const handleCreate = () => {
        const name = prompt("Persona Name:");
        if (!name) return;
        axios.post('/api/cx-personas', { name, title: 'New Role' })
            .then(res => onSelect(res.data.id))
            .catch(err => alert("Create failed: " + err.message));
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
        <div style={{ padding: '20px', fontFamily: "'Outfit', sans-serif" }}>
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
        </div>
    );
}

export default CxPersonaBuilder;
