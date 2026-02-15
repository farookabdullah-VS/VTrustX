import React, { useState, useEffect } from 'react';
import { ModernPersonaEditor } from './persona/ModernPersonaEditor';
import { AIPersonaGenerator } from './persona/AIPersonaGenerator';
import { Plus, X, File, Layout, Sparkles, User, Calendar, MoreVertical, Trash2, Edit2, Copy, Search, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from './common/Toast';

// Simple time ago helper
const timeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

export function CxPersonaBuilder({ onToggleSidebar, onNavigate }) {
    const toast = useToast();
    const [mode, setMode] = useState('list'); // 'list' | 'editor'
    const [personas, setPersonas] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [selectedPersonaId, setSelectedPersonaId] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);

    // Load personas on mount or when mode changes to list
    useEffect(() => {
        if (mode === 'list') {
            loadPersonas();
            // Expand sidebar when in list mode
            if (onToggleSidebar) onToggleSidebar(false);
        }
    }, [mode, onToggleSidebar]);

    const loadPersonas = async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await axios.get('/api/cx-personas');
            setPersonas(res.data);
        } catch (e) {
            console.error("Failed to load personas", e);
            setLoadError("Failed to load personas. Please try again.");
        }
        setLoading(false);
    };

    const handleCreateOption = async (option) => {
        if (option === 'blank') {
            try {
                // Create a new blank persona
                const res = await axios.post('/api/cx-personas', {
                    name: "Untitled Persona",
                    status: "Draft",
                    layout_config: { left: [], right: [] } // Empty layout
                });
                const newId = res.data.id;

                // Switch to editor
                setSelectedPersonaId(newId);
                setShowCreateModal(false);
                setMode('editor');

                // Collapse sidebar for studio mode
                if (onToggleSidebar) onToggleSidebar(true);

            } catch (e) {
                toast.error("Failed to create persona: " + (e.response?.data?.error || e.message));
            }
        } else if (option === 'template') {
            if (onNavigate) {
                onNavigate('persona-templates');
            } else {
                toast.info("To use a template, please visit the 'Persona Templates' gallery.");
            }
            setShowCreateModal(false);
        } else if (option === 'ai') {
            setShowCreateModal(false);
            setShowAIGenerator(true);
        }
    };

    const handleEdit = (id) => {
        setSelectedPersonaId(id);
        setMode('editor');
        if (onToggleSidebar) onToggleSidebar(true); // Collapse sidebar
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this persona?")) return;
        try {
            await axios.delete(`/api/cx-personas/${id}`);
            loadPersonas(); // Refresh list
        } catch (e) {
            toast.error("Failed to delete: " + e.message);
        }
    };

    // --- RENDER EDITOR ---
    if (mode === 'editor') {
        return (
            <ModernPersonaEditor
                personaId={selectedPersonaId}
                onClose={() => {
                    setMode('list');
                    setSelectedPersonaId(null);
                    // Sidebar expansion handled by useEffect when mode becomes 'list'
                }}
            />
        );
    }

    // --- RENDER LIST ---
    return (
        <div style={{ padding: '30px', fontFamily: "'Outfit', sans-serif" }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>CX Personas</h1>
                    <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Manage your customer personas and profiles.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                        background: '#0f172a', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600',
                        boxShadow: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
                        transition: 'all 0.2s', fontSize: '0.95rem'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <Plus size={20} /> New Persona
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: '#64748b', gap: '15px' }}>
                    <Loader2 size={32} className="animate-spin" />
                    <div>Loading personas...</div>
                </div>
            ) : loadError ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', color: '#b91c1c', gap: '15px' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>{loadError}</div>
                    <button onClick={loadPersonas} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#b91c1c', cursor: 'pointer', fontWeight: '600' }}>Retry</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {personas.map(p => (
                        <div
                            key={p.id}
                            onClick={() => handleEdit(p.id)}
                            style={{
                                background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '0',
                                cursor: 'pointer', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; }}
                        >
                            {/* Card Top: Gradient or Image */}
                            <div style={{ height: '140px', background: p.photo_url ? `url(${p.photo_url}) center/cover` : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', position: 'relative' }}>
                                {!p.photo_url && (
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#cbd5e1' }}>
                                        <User size={48} opacity={0.5} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                                    <div style={{ background: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: '600', color: '#475569', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                        {p.status || 'Draft'}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#1e293b' }}>{p.name}</h3>
                                <p style={{ margin: '0 0 15px 0', color: '#64748b', fontSize: '0.9rem' }}>{p.title || 'No Title'}</p>

                                <div style={{ marginTop: 'auto', paddingTop: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Calendar size={14} />
                                        <span>{timeAgo(p.updated_at)}</span>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, p.id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        aria-label={`Delete persona ${p.name}`}
                                        onMouseOver={e => e.currentTarget.style.background = '#fee2e2'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Trash2 size={16} aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add New Ghost Card */}
                    <div
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            borderRadius: '16px', border: '2px dashed #e2e8f0', display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', minHeight: '300px', cursor: 'pointer',
                            color: '#94a3b8', background: '#f8fafc', transition: 'all 0.2s'
                        }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.background = '#f1f5f9'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                    >
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                            <Plus size={32} color="#cbd5e1" />
                        </div>
                        <span style={{ fontWeight: '600' }}>Create New Persona</span>
                    </div>
                </div>
            )}

            {/* AI Generator Modal */}
            <AIPersonaGenerator
                isOpen={showAIGenerator}
                onClose={() => setShowAIGenerator(false)}
                onGenerate={async (data) => {
                    try {
                        const res = await axios.post('/api/cx-personas', {
                            name: data.name || 'AI Generated Persona',
                            title: data.title || '',
                            status: 'Draft',
                            persona_type: data.persona_type || 'Rational',
                            layout_config: data.sections || []
                        });
                        const newId = res.data.id;
                        setShowAIGenerator(false);
                        setSelectedPersonaId(newId);
                        setMode('editor');
                        if (onToggleSidebar) onToggleSidebar(true);
                    } catch (e) {
                        toast.error("Failed to create persona: " + (e.response?.data?.error || e.message));
                    }
                }}
            />

            {/* Create Modal */}
            {showCreateModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', borderRadius: '24px', width: '800px', maxWidth: '95%', padding: '40px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', position: 'relative' }}>
                        <button onClick={() => setShowCreateModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={24} /></button>

                        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginBottom: '10px' }}>Create New Persona</h2>
                            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Choose how you want to start building your persona.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                            <OptionCard
                                icon={File}
                                title="Start Blank"
                                desc="Create from scratch with an empty canvas."
                                onClick={() => handleCreateOption('blank')}
                                color="#3b82f6"
                            />
                            <OptionCard
                                icon={Layout}
                                title="Use Template"
                                desc="Start with a pre-built industry template."
                                onClick={() => handleCreateOption('template')}
                                color="#8b5cf6"
                            />
                            <OptionCard
                                icon={Sparkles}
                                title="Generate with AI"
                                desc="Let AI build a persona from your description."
                                onClick={() => handleCreateOption('ai')}
                                color="#10b981"
                                badge="New"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function OptionCard({ icon: Icon, title, desc, onClick, color, badge }) {
    return (
        <div
            onClick={onClick}
            style={{
                border: '1px solid #e2e8f0', borderRadius: '16px', padding: '30px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', background: 'white'
            }}
            onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = `0 20px 25px -5px ${color}15, 0 8px 10px -6px ${color}10`;
                e.currentTarget.style.borderColor = color;
            }}
            onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#e2e8f0';
            }}
        >
            {badge && (
                <div style={{ position: 'absolute', top: '15px', right: '15px', background: `color-mix(in srgb, ${color} 10%, white)`, color: color, fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>
                    {badge}
                </div>
            )}
            <div style={{
                width: '64px', height: '64px', borderRadius: '20px', background: `color-mix(in srgb, ${color} 10%, white)`,
                color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px'
            }}>
                <Icon size={32} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 10px 0' }}>{title}</h3>
            <p style={{ fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5', margin: 0 }}>{desc}</p>
        </div>
    );
}
