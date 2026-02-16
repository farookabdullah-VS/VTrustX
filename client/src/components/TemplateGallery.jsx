import React, { useState } from 'react';
import { surveyTemplates } from '../data/surveyTemplates';

export function TemplateGallery({ isOpen, onClose, onSelect, displayMode = 'modal' }) {
    const [selectedCategory, setSelectedCategory] = useState("All");

    if (displayMode === 'modal' && !isOpen) return null;

    const categories = ["All", ...new Set(surveyTemplates.map(t => t.category))];

    const filteredTemplates = selectedCategory === "All"
        ? surveyTemplates
        : surveyTemplates.filter(t => t.category === selectedCategory);

    const containerStyle = displayMode === 'page' ? {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--deep-bg)',
        fontFamily: "'Outfit', sans-serif"
    } : {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(4px)',
        fontFamily: "'Outfit', sans-serif"
    };

    const contentStyle = displayMode === 'page' ? {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    } : {
        background: 'var(--deep-bg)',
        width: '900px',
        maxWidth: '95%',
        height: '80vh',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
    };

    return (
        <div style={containerStyle}>
            <div style={contentStyle}>
                {/* Header */}
                <div style={{ padding: '20px 30px', background: 'var(--deep-bg)', borderBottom: '1px solid var(--sidebar-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5em', color: 'var(--primary-color)' }}>Template Gallery</h2>
                        <p style={{ margin: '5px 0 0', color: 'var(--text-muted)' }}>Choose from our pre-designed templates.</p>
                    </div>
                    {displayMode === 'modal' && (
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '2em', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                    )}
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Sidebar Filters */}
                    <div style={{ width: '220px', background: 'var(--deep-bg)', borderRight: '1px solid var(--sidebar-border)', padding: '20px', overflowY: 'auto' }}>
                        <h4 style={{ margin: '0 0 15px', color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.75em', letterSpacing: '1px' }}>Categories</h4>
                        {categories.map(cat => (
                            <div
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                style={{
                                    padding: '10px 15px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginBottom: '5px',
                                    fontSize: '0.95em',
                                    color: selectedCategory === cat ? 'white' : 'var(--text-color)',
                                    background: selectedCategory === cat ? 'var(--primary-color)' : 'transparent',
                                    fontWeight: selectedCategory === cat ? '600' : '400',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {cat}
                            </div>
                        ))}
                    </div>

                    {/* Template Grid */}
                    <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                            {filteredTemplates.map(t => (
                                <div key={t.id} style={{
                                    background: 'var(--input-bg)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--input-border)',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'default',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-4px)';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--input-bg) 0%, var(--sidebar-active-bg) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                                        {React.createElement(t.icon, { size: 48, strokeWidth: 1.5 })}
                                    </div>
                                    <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '0.8em', color: 'var(--secondary-color)', fontWeight: 'bold', marginBottom: '5px', textTransform: 'uppercase' }}>{t.category}</div>
                                        <h3 style={{ margin: '0 0 10px', fontSize: '1.1em', color: 'var(--primary-color)' }}>{t.title}</h3>
                                        <p style={{ margin: '0 0 20px', fontSize: '0.9em', color: 'var(--text-muted)', lineHeight: '1.4', flex: 1 }}>{t.description}</p>

                                        <button
                                            onClick={() => onSelect(t)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--primary-color)',
                                                background: 'transparent',
                                                color: 'var(--primary-color)',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.target.style.background = 'var(--primary-color)'; e.target.style.color = 'var(--button-text)'; }}
                                            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--primary-color)'; }}
                                        >
                                            Use Template
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
