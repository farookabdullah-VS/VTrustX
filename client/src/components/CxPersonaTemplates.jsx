
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import {
    Search, Plus, LayoutTemplate, Tag, MoreHorizontal, Edit, Trash, Copy
} from 'lucide-react';
import './CxPersonaBuilder.css'; // Reuse styles

export default function CxPersonaTemplates({ onSelectTemplate, onEditTemplate }) {
    const { t } = useTranslation();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = () => {
        setLoading(true);
        axios.get('/api/cx-persona-templates')
            .then(res => setTemplates(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    const categories = ['All', ...new Set(templates.map(t => t.category).filter(Boolean))];

    const filtered = templates.filter(tmpl => {
        const matchSearch = tmpl.title.toLowerCase().includes(search.toLowerCase()) ||
            tmpl.description.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === 'All' || tmpl.category === categoryFilter;
        return matchSearch && matchCat;
    });

    return (
        <div className="persona-builder-container" style={{ padding: '20px', background: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LayoutTemplate size={28} className="text-emerald-600" />
                        Persona Templates Libraries
                    </h1>
                    <p style={{ color: '#64748b' }}>Select a template to start building a new persona or manage existing templates.</p>
                </div>
                {/* <button className="btn-primary" ><Plus size={16} /> New Template</button> */}
                {/* Usually created by saving a persona AS template */}
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                <div className="search-bar" style={{ flex: 1, maxWidth: '400px', display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
                    <Search size={18} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search templates..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ border: 'none', outline: 'none', paddingLeft: '8px', width: '100%' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid',
                                borderColor: categoryFilter === cat ? '#059669' : '#e2e8f0',
                                background: categoryFilter === cat ? '#ecfdf5' : 'white',
                                color: categoryFilter === cat ? '#059669' : '#64748b',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '40px' }}>
                {loading ? <div style={{ gridColumn: '1/-1', textAlign: 'center' }}>Loading templates...</div> : null}

                {filtered.map(tmpl => (
                    <div key={tmpl.id} className="persona-card" style={{
                        background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all 0.2s',
                        cursor: 'default'
                    }}>
                        <div style={{ height: '8px', background: 'linear-gradient(90deg, #10b981, #3b82f6)' }}></div>
                        <div style={{ padding: '20px', flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                    {tmpl.category}
                                </span>
                                {tmpl.is_system && <span title="System Template" style={{ color: '#94a3b8' }}><Tag size={12} /></span>}
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '12px 0 8px', color: '#1e293b' }}>{tmpl.title}</h3>
                            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {tmpl.description}
                            </p>
                        </div>
                        <div style={{ padding: '16px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => onSelectTemplate(tmpl)}
                                style={{ flex: 1, padding: '8px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                            >
                                Use Template
                            </button>
                            {/* Edit/Delete if needed */}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
