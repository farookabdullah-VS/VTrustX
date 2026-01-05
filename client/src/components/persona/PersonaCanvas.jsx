import React from 'react';
import { Trash2, GripVertical, FileText, BarChart2, Smartphone } from 'lucide-react';

export function PersonaCanvas({ sections, updateSection, removeSection }) {

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
            {sections.map(section => (
                <div key={section.id} style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', minHeight: '200px', display: 'flex', flexDirection: 'column' }}>

                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ cursor: 'grab', color: '#cbd5e1' }}><GripVertical size={16} /></div>
                            <input
                                value={section.title}
                                onChange={e => updateSection(section.id, { title: e.target.value })}
                                style={{ fontSize: '1.1em', fontWeight: 'bold', color: '#1e293b', border: 'none', background: 'transparent', outline: 'none' }}
                                placeholder="Section Title"
                            />
                        </div>
                        <button onClick={() => removeSection(section.id)} style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                    </div>

                    {/* Card Content based on Type */}
                    <div style={{ flex: 1 }}>
                        {section.type === 'text' && (
                            <textarea
                                value={section.content}
                                onChange={e => updateSection(section.id, { content: e.target.value })}
                                placeholder="Write here..."
                                style={{ width: '100%', height: '100%', border: 'none', resize: 'none', fontSize: '0.95em', lineHeight: '1.5', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '8px', outline: 'none' }}
                            />
                        )}

                        {section.type === 'skills' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {(section.data || [{ label: 'Tech Savvy', value: 50 }, { label: 'Loyalty', value: 80 }]).map((skill, idx) => (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9em', color: '#475569' }}>
                                            <span>{skill.label}</span>
                                            <span>{skill.value}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${skill.value}%`, background: '#0e7490' }}></div>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ fontSize: '0.8em', color: '#94a3b8', textAlign: 'center', marginTop: '10px' }}>Slider editing not implemented in preview</div>
                            </div>
                        )}

                        {(section.type === 'chart' || section.type === 'technology' || section.type === 'media') && (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: '8px', color: '#94a3b8' }}>
                                <div style={{ textAlign: 'center' }}>
                                    {section.type === 'technology' ? <Smartphone size={32} /> : <BarChart2 size={32} />}
                                    <div style={{ marginTop: '10px', fontSize: '0.9em' }}>{section.type.toUpperCase()} Placeholder</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
