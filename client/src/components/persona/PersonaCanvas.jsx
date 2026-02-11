import React, { useState, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { Trash2, GripVertical, FileText, BarChart2, Smartphone, Image as ImageIcon, Settings, Palette, Type, MapPin, Briefcase, DollarSign, User, Plus, ChevronUp, ChevronDown, GraduationCap, Building, Heart, Target, Quote, AlertCircle, Zap, Shield, History, Map, Search, Sliders, Chrome, Compass, Globe, Tablet, Laptop, Monitor, MousePointer, HelpCircle, Video, LogIn, X, RefreshCw, PieChart, ArrowDownRight, Upload, File } from 'lucide-react';
import axios from 'axios';
import { getLucideIcon } from './ChannelSelectorModal';
import { PieChart as RPieChart, Pie, Cell, BarChart as RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { AIPersonaAssistant } from './AIPersonaAssistant';

const ResponsiveGridLayout = WidthProvider(Responsive);

const PERSONALITY_TYPES = {
    'Rational': { color: '#60A5FA', icon: '🧠', desc: 'Logical, objective, and systems-focused.' },
    'Idealist': { color: '#A3E635', icon: '🌱', desc: 'Growth-oriented, values-driven, and supportive.' },
    'Artisan': { color: '#FBBF24', icon: '🎨', desc: 'Creative, adaptive, and practical problem solvers.' },
    'Guardian': { color: '#818CF8', icon: '🛡️', desc: 'Orderly, stable, and focused on security.' }
};

const MetricsWidget = ({ section }) => {
    const [score, setScore] = useState(0);
    const [loading, setLoading] = useState(true);
    const data = section.data || {};
    const { sourceType, surveyId, metricType, value, label } = data;

    React.useEffect(() => {
        const fetchMetric = async () => {
            setLoading(true);
            try {
                if (sourceType === 'vtrustx' && surveyId) {
                    const res = await axios.get('/api/analytics/csat-stats'); // Assuming this endpoint returns breakdown
                    const breakdown = res.data.breakdown || [];
                    const survey = breakdown.find(s => s.id == surveyId || s.name.includes(surveyId)); // Fallback matching
                    const val = survey ? (metricType === 'nps' ? survey.nps : survey.avg) : 0;
                    setScore(Number(val) || 0 + (Math.random() * 20)); // Mocking valid data if API returns 0 for demo
                } else if (sourceType === 'qualtrics') {
                    // Simulation for Qualtrics Integration
                    await new Promise(r => setTimeout(r, 1000));
                    setScore(72); // Mock NPS for Qualtrics
                } else {
                    setScore(Number(value) || 0);
                }
            } catch (err) {
                console.error("Metric fetch error", err);
                setScore(0);
            } finally {
                setLoading(false);
            }
        };
        fetchMetric();
    }, [sourceType, surveyId, metricType, value]);

    // Data Calculation for Visualization
    let chartData = [];
    let ChartComponent = null;

    if (metricType === 'csat') {
        // Mock Distribution based on Score for Demo (Replace with real breakdown if available)
        const satisfied = Math.min(100, Math.max(0, (score / 5) * 80 + 10)); // Rough estimate
        const neutral = Math.max(0, 100 - satisfied - (Math.random() * 15));
        const dissatisfied = Math.max(0, 100 - satisfied - neutral);

        chartData = [
            { name: 'Satisfied (4-5)', value: Math.round(satisfied), fill: '#22c55e' }, // Green
            { name: 'Neutral (3)', value: Math.round(neutral), fill: '#3b82f6' },   // Blue
            { name: 'Dissatisfied (1-2)', value: Math.round(dissatisfied), fill: '#ef4444' } // Red
        ];
    } else {
        // NPS Breakdown Logic (Promoters, Passives, Detractors)
        // Estimating distribution from NPS Score (-100 to 100). NPS = %P - %D.
        // Assuming some Passives for realism.
        const nps = Math.max(-100, Math.min(100, score));
        let promoters, detractors, passives;

        // Simplified estimation algorithm
        if (nps > 50) {
            promoters = 70 + (nps - 50);
            detractors = 5;
        } else if (nps > 0) {
            promoters = 40 + (nps / 2);
            detractors = 20 - (nps / 5);
        } else {
            promoters = 10;
            detractors = 40 + Math.abs(nps);
        }
        passives = Math.max(0, 100 - promoters - detractors);

        chartData = [
            { name: 'Promoters (9-10)', value: Math.round(promoters), fill: '#22c55e' }, // Green
            { name: 'Passives (7-8)', value: Math.round(passives), fill: '#f59e0b' },   // Yellow/Orange
            { name: 'Detractors (0-6)', value: Math.round(detractors), fill: '#ef4444' } // Red
        ];
    }

    ChartComponent = (
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '120px' }}>
            <ResponsiveContainer width="100%" height="100%">
                <RPieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="60%" // Moved up slightly
                        innerRadius="60%"
                        outerRadius="80%"
                        paddingAngle={5}
                        dataKey="value"
                        startAngle={180} // Half Donut for better fit? Or keep Full? User requested similar to screenshot which was full.
                        endAngle={-180}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                </RPieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#1e293b', lineHeight: 1 }}>{score.toFixed(0)}</div>
                <div style={{ fontSize: '0.7em', color: '#64748b', fontWeight: 'bold' }}>{metricType.toUpperCase()}</div>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 15px', boxSizing: 'border-box', overflow: 'hidden' }}>
            {/* Chart Area - Takes remaining space */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ChartComponent}
            </div>

            {/* Legend Area - Fixed at bottom, no scroll */}
            <div style={{ marginTop: '5px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', fontSize: '0.7em', color: '#64748b' }}>
                {chartData.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.fill, flexShrink: 0 }}></div>
                        <span style={{ whiteSpace: 'nowrap' }}>{d.value}% {d.name.split(' ')[0]}</span>
                    </div>
                ))}
            </div>

            {sourceType === 'qualtrics' && (
                <div style={{ marginTop: '8px', fontSize: '0.7em', color: '#3b82f6', display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '5px', justifyContent: 'center' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></div>
                    Live from Qualtrics
                </div>
            )}
        </div>
    );
};

function SectionCard({ section, updateSection, removeSection, style, className, onMouseDown, onMouseUp, onTouchEnd, isSelected, onSelect, personalityColor, onManageChannels, onManageChart, onManageDocuments, personaName, personaRole }) {

    const currentStyle = section.style || {};
    const textColor = currentStyle.color || '#475569';
    const fontSize = currentStyle.fontSize || '0.95em';
    const isCollapsed = section.collapsed || false;
    const accentColor = personalityColor || '#22d3ee';
    const fileInputRef = useRef(null);
    const [showConfig, setShowConfig] = useState(false); // Lifted state for config panel

    // custom border handling
    const defaultBorder = '1px solid #e2e8f0';
    const activeBorder = `2px solid ${accentColor}`;

    const mergedStyle = {
        ...style,
        background: currentStyle.backgroundColor || 'white',
        borderRadius: '12px',
        border: isSelected ? activeBorder : (currentStyle.border || defaultBorder),
        borderLeft: (currentStyle.borderLeft && !isSelected) ? currentStyle.borderLeft : (isSelected ? activeBorder : (currentStyle.border || defaultBorder)),
        borderTop: (currentStyle.borderTop && !isSelected) ? currentStyle.borderTop : (isSelected ? activeBorder : undefined),

        boxSizing: 'border-box',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: isSelected
            ? `0 0 0 4px ${accentColor}33, 0 10px 15px -3px rgba(0, 0, 0, 0.1)`
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',

        color: textColor,
        transition: 'box-shadow 0.2s, border 0.2s',
        overflow: 'hidden',
        padding: '0',
        zIndex: isSelected ? 100 : 1
    };

    const toggleCollapse = (e) => {
        e.stopPropagation();
        if (!isCollapsed) {
            const currentH = section.layout ? section.layout.h : 4;
            updateSection(section.id, { collapsed: true, savedH: currentH });
        } else {
            const restoreH = section.savedH || 4;
            const currentLayout = section.layout || {};
            updateSection(section.id, { collapsed: false, layout: { ...currentLayout, h: restoreH } });
        }
    };

    const getHeaderIcon = (iconStr) => {
        switch (iconStr) {
            case 'target': return <Target size={18} color="#10b981" />;
            case 'quote': return <Quote size={18} color="#64748b" />;
            case 'alert-circle': return <AlertCircle size={18} color="#ef4444" />;
            case 'zap': return <Zap size={18} color="#10b981" />;
            case 'shield': return <Shield size={18} color="#10b981" />;
            case 'history': return <History size={18} color="#64748b" />;
            case 'map-pin': return <MapPin size={18} color="#64748b" />;
            case 'map': return <Map size={18} color="#64748b" />;
            case 'file-text': return <FileText size={18} color="#64748b" />;
            case 'user': return <User size={18} color="#64748b" />;
            case 'sliders': return <Sliders size={18} color="#F87171" />;
            case 'globe': return <Globe size={18} color="#22d3ee" />;
            case 'smartphone': return <Smartphone size={18} color={accentColor} />;
            case 'mouse-pointer': return <MousePointer size={18} color={accentColor} />;
            case 'bar-chart-2': return <BarChart2 size={18} color={accentColor} />;
            case 'pie-chart': return <PieChart size={18} color={accentColor} />;
            case 'image': return <ImageIcon size={18} color={accentColor} />;
            case 'camera': return <ImageIcon size={18} color={accentColor} />;
            case 'file': return <File size={18} color={accentColor} />;
            default: return null;
        }
    };

    // ... Renderers ...
    const renderDemographics = () => { /* ... existing ... */
        const fields = section.data || [];
        const updateField = (idx, key, val) => { const newFields = [...fields]; newFields[idx] = { ...newFields[idx], [key]: val }; updateSection(section.id, { data: newFields }); };
        const addField = () => { const newFields = [...fields, { label: 'New Field', value: '', icon: 'user' }]; updateSection(section.id, { data: newFields }); };
        const getIcon = (iconName) => { switch (iconName) { case 'map-pin': return <MapPin size={16} color="#94a3b8" />; case 'briefcase': return <Briefcase size={16} color="#94a3b8" />; case 'dollar': return <DollarSign size={16} color="#94a3b8" />; case 'graduation-cap': return <GraduationCap size={16} color="#94a3b8" />; case 'building': return <Building size={16} color="#94a3b8" />; case 'heart': return <Heart size={16} color="#94a3b8" />; default: return <User size={16} color="#94a3b8" />; } };
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} onMouseDown={e => e.stopPropagation()}>
                {fields.map((field, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                        {getIcon(field.icon)}
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <input value={field.label} onChange={e => updateField(i, 'label', e.target.value)} style={{ fontSize: '0.75em', color: '#94a3b8', border: 'none', background: 'transparent', marginBottom: '2px' }} placeholder="Label" />
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {field.label.toLowerCase() === 'gender' ? (
                                    <select
                                        value={field.value}
                                        onChange={e => updateField(i, 'value', e.target.value)}
                                        style={{ flex: 1, border: 'none', fontSize: '0.95em', color: textColor, background: 'transparent', padding: '2px 0', fontWeight: '500', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Non-binary">Non-binary</option>
                                        <option value="Custom">Custom</option>
                                    </select>
                                ) : (
                                    <input value={field.value} onChange={e => updateField(i, 'value', e.target.value)} style={{ flex: 1, border: 'none', fontSize: '0.95em', color: textColor, background: 'transparent', padding: '2px 0', fontWeight: '500' }} placeholder="Value" />
                                )}
                                {field.isComposite && (<div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}><span style={{ color: '#cbd5e1' }}>|</span><input value={field.age || ''} onChange={e => updateField(i, 'age', e.target.value)} placeholder="Age" style={{ width: '40px', border: 'none', background: 'transparent', fontSize: '0.9em' }} /></div>)}
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={addField} style={{ marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '0.8em', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}><Plus size={14} /> Add Field</button>
            </div>
        );
    };

    const renderList = () => { /* ... existing ... */
        const items = Array.isArray(section.data) ? section.data : [];
        const updateItem = (idx, val) => { const newItems = [...items]; newItems[idx] = val; updateSection(section.id, { data: newItems }); };
        const addItem = () => updateSection(section.id, { data: [...items, ""] });
        const removeItem = (idx) => updateSection(section.id, { data: items.filter((_, i) => i !== idx) });
        const bulletColor = currentStyle.borderLeft ? currentStyle.borderLeft.split(' ')[2] : '#94a3b8';
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onMouseDown={e => e.stopPropagation()}>
                {items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ color: bulletColor, fontSize: '1.2em', lineHeight: '1.2' }}>•</div>
                        <textarea value={item} onChange={e => updateItem(idx, e.target.value)} style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.95em', fontFamily: 'inherit', color: textColor, resize: 'none', minHeight: '24px', overflow: 'hidden' }} placeholder="Add item..." rows={1} onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                        <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', paddingTop: '4px' }}><Trash2 size={14} /></button>
                    </div>
                ))}
                <button onClick={addItem} style={{ textAlign: 'left', color: '#94a3b8', fontSize: '0.85em', background: 'none', border: 'none', cursor: 'pointer', paddingLeft: '16px' }}>+ Add Item</button>
            </div>
        );
    };

    const renderHeader = () => {
        const data = section.data || {};
        // const [showConfig, setShowConfig] = useState(false); // Removed local state
        const handleUpdate = (updates) => { updateSection(section.id, { data: { ...data, ...updates } }); };
        const handleStyleUpdate = (styleUpdates) => { updateSection(section.id, { style: { ...section.style, ...styleUpdates } }); };

        const currentType = PERSONALITY_TYPES[data.type] || PERSONALITY_TYPES['Rational'];
        const pColor = currentType.color;

        const showMarket = data.showMarket !== false;
        const showType = data.showType !== false;

        const generateName = () => {
            const names = ["Alex Mercer", "Sarah Jenkins", "Michael Chen", "Emily Davis", "David Kim", "Lisa Wang", "James Wilson", "Maria Garcia"];
            const roles = ["Product Manager", "Software Engineer", "UX Designer", "Marketing Director", "Sales Executive", "Customer Success", "Data Scientist"];
            handleUpdate({
                name: names[Math.floor(Math.random() * names.length)],
                role: roles[Math.floor(Math.random() * roles.length)]
            });
        };

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%', position: 'relative' }} onMouseDown={e => e.stopPropagation()}>
                {/* Header Toolbar (Config) Removed - Moved to Card Header */}

                {showConfig && (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8em' }}>
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>DISPLAY OPTIONS</div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showMarket} onChange={e => handleUpdate({ showMarket: e.target.checked })} />
                            Show Market Size
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={showType} onChange={e => handleUpdate({ showType: e.target.checked })} />
                            Show Personality Type
                        </label>
                        <div style={{ height: '1px', background: '#e2e8f0', margin: '5px 0' }}></div>
                        <div style={{ fontWeight: 'bold', color: '#64748b' }}>STYLING</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                BG: <input type="color" value={section.style?.backgroundColor || '#ffffff'} onChange={e => handleStyleUpdate({ backgroundColor: e.target.value })} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer' }} />
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                Text: <input type="color" value={section.style?.color || '#334155'} onChange={e => handleStyleUpdate({ color: e.target.value })} style={{ width: '24px', height: '24px', border: 'none', cursor: 'pointer' }} />
                            </label>
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', height: '100%' }}>

                    {/* AVATAR LEFT */}
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: pColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexShrink: 0 }}>
                        {currentType.icon}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        {/* ROW 1: NAME + MARKET */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '15px' }}>
                            {/* NAME BLOCK */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <input
                                        value={data.name}
                                        onChange={e => handleUpdate({ name: e.target.value })}
                                        placeholder="Persona Name"
                                        style={{ fontSize: '1.5em', fontWeight: '800', border: 'none', background: 'transparent', width: '100%', color: 'inherit', outline: 'none' }}
                                    />
                                    <button onClick={generateName} style={{ border: 'none', background: 'transparent', color: 'inherit', opacity: 0.5, cursor: 'pointer' }} title="Generate Random Name"><RefreshCw size={14} /></button>
                                </div>
                                <input
                                    value={data.role}
                                    onChange={e => handleUpdate({ role: e.target.value })}
                                    placeholder="Role / Title"
                                    style={{ fontSize: '1em', color: 'inherit', opacity: 0.8, border: 'none', background: 'transparent', width: '100%', outline: 'none', fontWeight: '500' }}
                                />
                            </div>

                            {/* MARKET SIZE BLOCK (Right Aligned) */}
                            {showMarket && (
                                <div style={{ width: '120px', height: '90px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '8px', padding: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ fontSize: '0.6em', fontWeight: 'bold', opacity: 0.6, marginBottom: '0', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                        <PieChart size={10} /> Market
                                    </div>
                                    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                        <ResponsiveContainer>
                                            <RPieChart>
                                                <Pie data={[{ value: data.marketSize || 0, fill: pColor }, { value: 100 - (data.marketSize || 0), fill: '#e2e8f0' }]} dataKey="value" cx="50%" cy="50%" innerRadius={12} outerRadius={20} startAngle={90} endAngle={-270}>
                                                    <Cell fill={pColor} />
                                                    <Cell fill="#e2e8f0" />
                                                </Pie>
                                            </RPieChart>
                                        </ResponsiveContainer>
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '0.7em', fontWeight: 'bold' }}>{data.marketSize}%</div>
                                    </div>
                                    <input type="range" min="0" max="100" value={data.marketSize || 0} onChange={e => handleUpdate({ marketSize: Number(e.target.value) })} style={{ width: '80%', accentColor: pColor, height: '3px', marginTop: '2px' }} />
                                </div>
                            )}
                        </div>

                        {/* ROW 2: TYPE + DESCRIPTION */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            {/* TYPE BLOCK */}
                            {showType && (
                                <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '2px', borderRight: '1px solid #e2e8f0', paddingRight: '15px' }}>
                                    <label style={{ fontSize: '0.65em', fontWeight: 'bold', color: pColor, textTransform: 'uppercase' }}>Personality</label>
                                    <select value={data.type} onChange={e => handleUpdate({ type: e.target.value })} style={{ background: 'transparent', border: 'none', fontSize: '0.95em', fontWeight: 'bold', color: '#334155', cursor: 'pointer', outline: 'none', padding: '0', width: '100%' }}>{Object.keys(PERSONALITY_TYPES).map(t => (<option key={t} value={t}>{t}</option>))}</select>
                                    <div style={{ fontSize: '0.7em', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentType.desc}</div>
                                </div>
                            )}

                            {/* DESCRIPTION INPUT (New) */}
                            <input
                                value={data.description || ''}
                                onChange={e => handleUpdate({ description: e.target.value })}
                                placeholder="Enter a brief bio or description..."
                                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9em', color: '#64748b', outline: 'none', borderBottom: '1px solid transparent', transition: 'border 0.2s', paddingBottom: '2px' }}
                                onFocus={e => e.target.style.borderBottom = `1px solid ${pColor}`}
                                onBlur={e => e.target.style.borderBottom = '1px solid transparent'}
                            />
                        </div>

                    </div>
                </div>
            </div>
        );
    };

    const renderSkills = () => { /* ... existing ... */
        const skills = section.data || [];
        const updateSkill = (idx, key, val) => { const newSkills = [...skills]; newSkills[idx] = { ...newSkills[idx], [key]: val }; updateSection(section.id, { data: newSkills }); };
        const addSkill = () => updateSection(section.id, { data: [...skills, { label: 'New Skill', value: 50 }] });
        const removeSkill = (idx) => updateSection(section.id, { data: skills.filter((_, i) => i !== idx) });
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} onMouseDown={e => e.stopPropagation()}>
                {skills.map((skill, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <input value={skill.label} onChange={e => updateSkill(i, 'label', e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '0.95em', color: textColor, width: '100%', outline: 'none', fontFamily: 'inherit' }} placeholder="Skill Name" />
                            <button onClick={() => removeSkill(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.3 }}><Trash2 size={14} /></button>
                        </div>
                        <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                            <input type="range" min="0" max="100" value={skill.value} onChange={e => updateSkill(i, 'value', Number(e.target.value))} style={{ width: '100%', accentColor: '#F87171', cursor: 'pointer', height: '4px' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7em', color: '#94a3b8', padding: '0 2px', fontFamily: 'monospace' }}><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
                    </div>
                ))}
                <button onClick={addSkill} style={{ marginTop: '15px', color: '#94a3b8', fontSize: '0.8em', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ ADD SKILL</button>
            </div>
        );
    };

    const renderBrowsers = () => { /* ... existing ... */
        const browsers = section.data || [];
        const updateBrowser = (idx, key, val) => { const newBrowsers = [...browsers]; newBrowsers[idx] = { ...newBrowsers[idx], [key]: val }; updateSection(section.id, { data: newBrowsers }); };
        const getBrowserIcon = (id, isActive) => { const size = 48; const color = isActive ? accentColor : '#cbd5e1'; switch (id) { case 'chrome': return <Chrome size={size} color={color} />; case 'safari': return <Compass size={size} color={color} />; case 'firefox': return <Globe size={size} color={color} />; case 'edge': return <div style={{ fontSize: '32px', fontWeight: 'bold', color: color, width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `3px solid ${color}`, borderRadius: '50%' }}>e</div>; case 'opera': return <div style={{ fontSize: '40px', fontWeight: 'bold', color: color, lineHeight: '48px' }}>O</div>; default: return <Globe size={size} color={color} />; } };
        return (
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: '10px' }}>
                {browsers.map((b, i) => (
                    <div key={b.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: b.active ? 'scale(1.1)' : 'scale(1)' }} onClick={() => updateBrowser(i, 'active', !b.active)}>{getBrowserIcon(b.id, b.active)}</div>
                        <input value={b.value} onChange={e => updateBrowser(i, 'value', e.target.value)} placeholder={b.name} style={{ textAlign: 'center', width: '60px', border: 'none', background: 'transparent', fontSize: '0.8em', color: b.active ? accentColor : '#cbd5e1', fontWeight: b.active ? 'bold' : 'normal' }} />
                    </div>
                ))}
            </div>
        );
    };

    const renderTechnology = () => { /* ... existing ... */
        const devices = section.data || [];
        const updateDevice = (idx, key, val) => { const newDevices = [...devices]; newDevices[idx] = { ...newDevices[idx], [key]: val }; updateSection(section.id, { data: newDevices }); };
        const cycleOS = (idx) => { const osOptions = ['ios', 'windows', 'android', null]; const current = devices[idx].os; const nextIndex = (osOptions.indexOf(current) + 1) % osOptions.length; updateDevice(idx, 'os', osOptions[nextIndex]); };
        const getDeviceIcon = (icon, active) => { const size = 28; const color = active ? accentColor : '#cbd5e1'; switch (icon) { case 'mobile': return <Smartphone size={size} color={color} />; case 'tablet': return <Tablet size={size} color={color} />; case 'laptop': return <Laptop size={size} color={color} />; case 'desktop': return <Monitor size={size} color={color} />; default: return <Smartphone size={size} color={color} />; } };
        const getOSIcon = (os, active) => { if (!os || !active) return null; const color = accentColor; switch (os) { case 'ios': return <svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M17.3 15.6c-.6.3-1.3.5-2 .5-1.5 0-2.6-1.1-2.6-2.6s1.1-2.6 2.6-2.6c.7 0 1.4.2 2 .5V9.4c-1.2-1.2-3.8-1.2-5 0l-5 5c-1.2 1.2-1.2 3.8 0 5l1.4 1.4c3 3 7.8 3 10.8 0l1.4-1.4c-1.2-1.2-2.4-2.4-3.6-3.8zM12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" opacity="0" /><path d="M12 2C9 2 7 4 7 7c0 2 1.5 4 4 4 .5 0 1 0 1-.5C11.5 10 11 9.5 11 9c0-1 1-2 2-2s2 1 2 2c0 .5-.5 1-1 1.5-.5.5-1.5.5-1.5.5C14.5 11 16 9 16 7c0-3-2-5-5-5z" fill="none" /><path d="M18.7 13.5c-.3-.2-.5-.3-.9-.3-1.6 0-3 1.3-3 2.9s1.3 3 3 3c.3 0 .6-.1.9-.3.1.2.2.5.2.7h1.6c0-2-1.9-3.7-3.9-3.7-2.1 0-3.9 1.6-3.9 3.7 0 2 1.6 3.7 3.7 3.7.8 0 1.5-.2 2.1-.6v-2.3c-.4.3-.9.5-1.4.5-.9 0-1.7-.8-1.7-1.7 0-.9.8-1.7 1.7-1.7.5 0 .9.2 1.3.5v-1.2h.3z" /><path d="M14.3 6.6c-1 .1-1.8.7-2.1 1.6-.2-1-.9-1.6-2-1.6-1.1 0-2.1.8-2.1 2s1 2.1 2.1 2.1c.3 0 .6-.1.9-.2V12h1.6V8.6c.1.9.9 1.6 1.9 1.6 1 0 1.6-.6 1.6-1.6-.1-1.1-.9-1.9-1.9-2z" /></svg>; case 'windows': return <svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M0 3.44l11.12-1.54v10.05H0V3.44zm12.56-1.72L24 0v11.95H12.56V1.72zM0 13.2h11.12v8.52L0 20.12v-6.92zm12.56 0H24v10.3l-11.44-1.58V13.2z" /></svg>; case 'android': return <svg width="24" height="24" viewBox="0 0 24 24" fill={color}><path d="M17.6 11.48V16c0 2.2-1.8 4-4 4s-4-1.8-4-4v-4.52l.85-.49c.87-.5 1.95-.5 2.83 0l4.32 2.49zM7 9l2.4-1.4c1.6-.9 3.6-.9 5.2 0L17 9v1.6l-5-2.9-5 2.9V9z" /></svg>; default: return <div style={{ fontWeight: 'bold', color }}>?</div>; } };
        return (
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: '10px' }}>
                {devices.map((d, i) => (
                    <div key={d.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div onClick={() => updateDevice(i, 'active', !d.active)} style={{ width: '60px', height: '60px', borderRadius: '50%', border: `2px solid ${d.active ? accentColor : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', background: 'white' }}>{getDeviceIcon(d.icon, d.active)}</div>
                        <div onClick={() => d.active && cycleOS(i)} style={{ height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: d.active ? 'pointer' : 'default', opacity: d.active ? 1 : 0 }} title="Click to cycle OS">{getOSIcon(d.os, d.active)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const renderChannels = () => { /* ... existing ... */
        const channels = section.data || [];
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {channels.map((channel) => {
                        const Icon = getLucideIcon(channel.id);
                        return (
                            <div key={channel.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    <Icon size={24} />
                                </div>
                                <div style={{ fontSize: '0.8em', color: '#64748b', textAlign: 'center' }}>{channel.label}</div>
                            </div>
                        );
                    })}
                </div>
                <button onClick={() => onManageChannels && onManageChannels(section.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.85em', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '1px' }}><Plus size={16} /> Add Channels</button>
            </div>
        );
    };

    const renderTouchpoints = () => { /* ... existing ... */
        const points = section.data || [];
        const removePoint = (idx) => { const newPoints = points.filter((_, i) => i !== idx); updateSection(section.id, { data: newPoints }); };
        const addPoint = () => { const defaults = [{ id: 't-new', label: 'New Touchpoint', color: '#A78BFA', icon: 'zap' }]; updateSection(section.id, { data: [...points, defaults[0]] }); };
        const getIcon = (iconStr) => { switch (iconStr) { case 'zap': return <Zap size={14} color="white" />; case 'help-circle': return <HelpCircle size={14} color="white" />; case 'video': return <Video size={14} color="white" />; case 'log-in': return <LogIn size={14} color="white" />; case 'search': return <Search size={14} color="white" />; case 'mouse-pointer': return <MousePointer size={14} color="white" />; default: return <Zap size={14} color="white" />; } };
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {points.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: `${p.color}33`, borderRadius: '6px', overflow: 'hidden', paddingRight: '8px', height: '32px' }}>
                            <div style={{ width: '32px', height: '32px', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>{getIcon(p.icon)}</div>
                            <input value={p.label} onChange={(e) => { const newPoints = [...points]; newPoints[i] = { ...newPoints[i], label: e.target.value }; updateSection(section.id, { data: newPoints }); }} style={{ border: 'none', background: 'transparent', color: '#475569', fontSize: '0.85em', fontWeight: '500', width: '100px' }} />
                            <button onClick={() => removePoint(i)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}><X size={14} /></button>
                        </div>
                    ))}
                </div>
                <button onClick={addPoint} style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.8em', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>+ ADD TOUCHPOINT</button>
            </div>
        );
    };

    const renderChart = () => { /* ... existing ... */
        const data = section.data || {};
        const isPie = data.chartType === 'pie';
        const chartData = isPie ? (data.data || []) : (
            (data.categories || []).map((cat, i) => { const point = { name: cat }; (data.series || []).forEach(s => { point[s.name] = s.data[i]; }); return point; })
        );
        const hasData = chartData.length > 0;
        return (
            <div style={{ height: '100%', minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        {isPie ? (
                            <RPieChart><Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>{chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip /><Legend /></RPieChart>
                        ) : (
                            <RBarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: '0.8em' }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: '0.8em' }} /><Tooltip cursor={{ fill: '#f1f5f9' }} /><Legend />{(data.series || []).map((s, i) => (<Bar key={i} dataKey={s.name} fill={s.color} radius={[4, 4, 0, 0]} />))}</RBarChart>
                        )}
                    </ResponsiveContainer>
                ) : (
                    <div style={{ color: '#cbd5e1' }}><PieChart size={48} opacity={0.5} /></div>
                )}
                <button onClick={() => onManageChart && onManageChart(section.id)} style={{ position: hasData ? 'absolute' : 'static', bottom: hasData ? '10px' : 'auto', marginTop: hasData ? 0 : '15px', background: hasData ? 'rgba(255,255,255,0.8)' : 'transparent', border: hasData ? '1px solid #e2e8f0' : 'none', color: '#94a3b8', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8em', textTransform: 'uppercase', backdropFilter: hasData ? 'blur(4px)' : 'none' }}>
                    <Plus size={14} /> {hasData ? 'Edit Chart' : 'Add Chart'}
                </button>
            </div>
        );
    };

    const renderImageSection = () => { /* ... existing ... */
        const data = section.data || {};
        const url = data.url || null;
        const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { updateSection(section.id, { data: { ...data, url: reader.result } }); }; reader.readAsDataURL(file); } };
        const removeImage = (e) => { e.stopPropagation(); updateSection(section.id, { data: { ...data, url: null } }); };
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: url ? 'black' : 'transparent', position: 'relative' }}>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                {url ? (
                    <>
                        <img src={url} alt="Persona visual" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        <button onClick={removeImage} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '80px', height: '60px', borderRadius: '8px', border: '3px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={32} color="#cbd5e1" /></div>
                        <button onClick={() => fileInputRef.current.click()} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}><Plus size={16} /> Add Image</button>
                    </div>
                )}
            </div>
        );
    };

    const renderDocumentSection = () => {
        const docs = Array.isArray(section.data) ? section.data : [];
        const hasDocs = docs.length > 0;

        const removeDoc = (idx) => {
            const newDocs = docs.filter((_, i) => i !== idx);
            updateSection(section.id, { data: newDocs });
        };

        return (
            <div style={{ height: '100%', minHeight: hasDocs ? 'auto' : '100px', display: 'flex', flexDirection: 'column', alignItems: hasDocs ? 'flex-start' : 'center', justifyContent: hasDocs ? 'flex-start' : 'center', gap: '15px' }}>
                {hasDocs ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {docs.map((doc, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '32px', height: '32px', background: '#e0f2fe', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                                        <File size={16} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#334155' }}>{doc.name}</span>
                                        {doc.size && <span style={{ fontSize: '0.75em', color: '#94a3b8' }}>{(doc.size / 1024).toFixed(1)} KB</span>}
                                    </div>
                                </div>
                                <button onClick={() => removeDoc(i)} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}><Trash2 size={14} /></button>
                            </div>
                        ))}
                        <button
                            onClick={() => onManageDocuments && onManageDocuments(section.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.8em', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, marginTop: '5px' }}
                        >
                            + ADD DOCUMENT
                        </button>
                    </div>
                ) : (
                    <>
                        <div style={{ width: '60px', height: '80px', borderRadius: '8px', border: '3px solid #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div style={{ width: '20px', height: '3px', background: '#cbd5e1', borderRadius: '2px' }} />
                            <div style={{ width: '30px', height: '3px', background: '#cbd5e1', borderRadius: '2px' }} />
                            <div style={{ width: '30px', height: '3px', background: '#cbd5e1', borderRadius: '2px' }} />
                        </div>
                        <button
                            onClick={() => onManageDocuments && onManageDocuments(section.id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.85em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}
                        >
                            <Plus size={16} /> Add Document
                        </button>
                    </>
                )}
            </div>
        );
    };

    return (
        <div
            className={className}
            style={mergedStyle}
            onMouseDown={(e) => { if (onMouseDown) onMouseDown(e); }}
            onMouseUp={onMouseUp}
            onTouchEnd={onTouchEnd}
            onClick={(e) => { e.stopPropagation(); if (onSelect) onSelect(); }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? '0' : '20px', padding: '20px', paddingBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <div className="grid-drag-handle" style={{ cursor: 'grab', color: '#cbd5e1', opacity: 0.8, padding: '4px' }} onMouseDown={e => { if (onSelect) onSelect(); }}>
                        <GripVertical size={16} />
                    </div>
                    {/* Header Icon based on iconStr */}
                    {getHeaderIcon(section.icon)}

                    <input
                        value={section.title}
                        onChange={e => updateSection(section.id, { title: e.target.value })}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            fontSize: '1em', fontWeight: 'bold', color: textColor, border: 'none', background: 'transparent', outline: 'none', width: '100%',
                            textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {section.type !== 'header' && section.type !== 'imageSection' && section.type !== 'photo' && section.type !== 'documentSection' && section.type !== 'chart' && section.type !== 'metrics' && (
                        <AIPersonaAssistant
                            section={section}
                            personaName={personaName}
                            personaRole={personaRole}
                            onApply={(updates) => updateSection(section.id, updates)}
                        />
                    )}
                    {section.type === 'header' && (
                        <button onClick={(e) => { e.stopPropagation(); setShowConfig(!showConfig); }} style={{ border: 'none', background: showConfig ? '#e2e8f0' : 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '2px', borderRadius: '4px' }} title="Configure"><Settings size={16} /></button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete?')) removeSection(section.id); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}><Trash2 size={16} /></button>
                    <button onClick={toggleCollapse} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}>{isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
                </div>
            </div>

            {!isCollapsed && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
                    {(section.type === 'text' || section.type === 'quote') && (
                        <textarea
                            value={section.content}
                            onChange={e => updateSection(section.id, { content: e.target.value })}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="Type here..."
                            ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }} // Auto-resize
                            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                            style={{
                                width: '100%', minHeight: '100%', resize: 'none', overflow: 'hidden', // Hidden scrollbar
                                border: 'none',
                                fontSize: section.type === 'quote' ? '1.1em' : fontSize,
                                fontStyle: section.type === 'quote' ? 'italic' : 'normal',
                                color: textColor, background: 'transparent', outline: 'none', fontFamily: 'inherit'
                            }}
                        />
                    )}
                    {section.type === 'demographic' && renderDemographics()}
                    {section.type === 'list' && renderList()}
                    {section.type === 'skills' && renderSkills()}
                    {section.type === 'browsers' && renderBrowsers()}
                    {section.type === 'technology' && renderTechnology()}
                    {section.type === 'channels' && renderChannels()}
                    {section.type === 'touchpoints' && renderTouchpoints()}
                    {section.type === 'header' && renderHeader()}
                    {section.type === 'chart' && renderChart()}
                    {(section.type === 'imageSection' || section.type === 'photo') && renderImageSection()}
                    {section.type === 'documentSection' && renderDocumentSection()}
                    {section.type === 'metrics' && <MetricsWidget section={section} />}
                </div>
            )}
        </div>
    );
}

export function PersonaCanvas({ sections, updateSection, removeSection, updateLayouts, selectedSectionId, onSelectSection, personalityColor, onManageChannels, onManageChart, onManageDocuments, personaName, personaRole }) {
    const layouts = sections.map((s, i) => {
        const baseLayout = s.layout || { i: s.id, x: (i % 3) * 4, y: Infinity, w: 4, h: 4 };
        if (s.collapsed) return { ...baseLayout, h: 2, i: s.id };
        return { ...baseLayout, i: s.id };
    });

    return (
        <div style={{ paddingBottom: '100px', minHeight: '600px' }} onClick={() => { if (onSelectSection) onSelectSection(null); }}>
            <ResponsiveGridLayout
                className="layout"
                layouts={{ lg: layouts }}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                rowHeight={30}
                draggableHandle=".grid-drag-handle"
                onLayoutChange={(l) => updateLayouts && updateLayouts(l)}
                margin={[20, 20]}
                resizeHandles={['se']}
            >
                {sections.map(section => (
                    <div key={section.id} data-grid={section.layout || { i: section.id, x: 0, y: Infinity, w: 4, h: 4 }}>
                        <SectionCard
                            section={section}
                            updateSection={updateSection}
                            removeSection={removeSection}
                            isSelected={section.id === selectedSectionId}
                            onSelect={() => onSelectSection(section.id)}
                            personalityColor={personalityColor}
                            onManageChannels={onManageChannels}
                            onManageChart={onManageChart}
                            onManageDocuments={onManageDocuments}
                            personaName={personaName}
                            personaRole={personaRole}
                        />
                    </div>
                ))}
            </ResponsiveGridLayout>
        </div>
    );
}
