import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Plus, Save, MoreHorizontal, Layout, Type, BarChart2, Image as ImageIcon, FileText } from 'lucide-react';
import { PersonaHeader } from './PersonaHeader';
import { PersonaCanvas } from './PersonaCanvas';
import { AddSectionModal } from './AddSectionModal';

export function ModernPersonaEditor({ personaId, onClose }) {
    const [persona, setPersona] = useState({
        name: 'New Persona',
        tagline: '',
        type: 'Rational',
        marketSize: 0,
        photoUrl: '',
        sections: [] // { id, type, title, content, data }
    });
    const [loading, setLoading] = useState(false);
    const [showAddSection, setShowAddSection] = useState(false);

    useEffect(() => {
        if (personaId) {
            loadPersona();
        }
    }, [personaId]);

    const loadPersona = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/cx-personas/${personaId}`);
            const p = res.data;
            setPersona({
                ...p,
                // Merge attributes back into top level state
                ...(p.attributes || {})
            });
        } catch (err) {
            console.error("Failed to load persona", err);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        try {
            const payload = {
                name: persona.name,
                // Map top level state to attributes JSON
                attributes: {
                    tagline: persona.tagline,
                    type: persona.type,
                    marketSize: persona.marketSize,
                    photoUrl: persona.photoUrl,
                    sections: persona.sections
                }
            };

            if (personaId) {
                await axios.put(`/api/cx-personas/${personaId}`, payload);
            } else {
                await axios.post('/api/cx-personas', payload);
            }
            alert("Persona Saved!");
        } catch (err) {
            alert("Error saving persona");
        }
    };

    const addSection = (template) => {
        const newSection = {
            id: Math.random().toString(36).substr(2, 9),
            type: template.type, // 'text', 'skills', 'chart', 'technology', 'media'
            title: template.title,
            content: template.defaultContent || '',
            data: template.defaultData || null
        };
        setPersona(prev => ({ ...prev, sections: [...prev.sections, newSection] }));
        setShowAddSection(false);
    };

    const updateSection = (id, updates) => {
        setPersona(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    const removeSection = (id) => {
        if (!confirm("Remove this section?")) return;
        setPersona(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== id)
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif" }}>
            {/* Top Bar */}
            <div style={{ height: '60px', background: '#1e293b', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white', borderBottom: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}><span style={{ color: '#0e7490' }}>VTrustX</span> Persona</div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#0e7490', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                        <Save size={16} /> Save
                    </button>
                    <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: '6px', cursor: 'pointer' }}>
                        Close
                    </button>
                </div>
            </div>

            {/* Persona Header (Dark Area) */}
            <div style={{ background: '#0f172a', padding: '20px 40px', color: 'white' }}>
                <PersonaHeader persona={persona} setPersona={setPersona} />
            </div>

            {/* Main Canvas (Scrollable) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '40px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                <PersonaCanvas
                    sections={persona.sections}
                    updateSection={updateSection}
                    removeSection={removeSection}
                />

                {/* Add Section Button */}
                <div
                    onClick={() => setShowAddSection(true)}
                    style={{
                        marginTop: '20px', border: '2px dashed #cbd5e1', borderRadius: '12px',
                        height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#64748b', fontWeight: 'bold', cursor: 'pointer',
                        background: 'rgba(255,255,255,0.5)', transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'white'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0e7490', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}><Plus size={18} /></div>
                        Add Section
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddSection && (
                <AddSectionModal
                    onClose={() => setShowAddSection(false)}
                    onAdd={addSection}
                />
            )}
        </div>
    );
}
