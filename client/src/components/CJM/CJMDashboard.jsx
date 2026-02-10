import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Search, Grid, List, Copy, Trash2, Edit3, Filter, Clock, MoreVertical, Wand2 } from 'lucide-react';
import { TemplateGallery } from './TemplateGallery';
import { AIMapGenerator } from './AIMapGenerator';
import './CJMDashboard.css';

const STATUS_COLORS = {
    draft: { bg: '#fef3c7', text: '#92400e', label: 'Draft' },
    published: { bg: '#dcfce7', text: '#166534', label: 'Published' },
    archived: { bg: '#f1f5f9', text: '#64748b', label: 'Archived' }
};

function MapCard({ map, onEdit, onDuplicate, onDelete }) {
    const [showMenu, setShowMenu] = useState(false);
    const statusStyle = STATUS_COLORS[map.status] || STATUS_COLORS.draft;

    return (
        <div className="cjm-dash-card" onClick={() => onEdit(map.id)}>
            <div className="cjm-dash-card-thumb">
                {map.thumbnail_data ? (
                    <img src={map.thumbnail_data} alt={map.title} />
                ) : (
                    <div className="cjm-dash-card-placeholder">
                        <Grid size={32} />
                    </div>
                )}
                <span className="cjm-dash-status-badge" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                    {statusStyle.label}
                </span>
            </div>
            <div className="cjm-dash-card-body">
                <h4>{map.title}</h4>
                {map.description && <p className="cjm-dash-card-desc">{map.description}</p>}
                <div className="cjm-dash-card-meta">
                    <span><Clock size={12} /> {new Date(map.updated_at).toLocaleDateString()}</span>
                    <div className="cjm-dash-card-actions" onClick={e => e.stopPropagation()}>
                        <button className="cjm-dash-action-btn" onClick={() => setShowMenu(!showMenu)}>
                            <MoreVertical size={16} />
                        </button>
                        {showMenu && (
                            <div className="cjm-dash-action-menu">
                                <button onClick={() => { onEdit(map.id); setShowMenu(false); }}><Edit3 size={14} /> Edit</button>
                                <button onClick={() => { onDuplicate(map.id); setShowMenu(false); }}><Copy size={14} /> Duplicate</button>
                                <button className="danger" onClick={() => { onDelete(map.id); setShowMenu(false); }}><Trash2 size={14} /> Delete</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MapListItem({ map, onEdit, onDuplicate, onDelete }) {
    const statusStyle = STATUS_COLORS[map.status] || STATUS_COLORS.draft;
    return (
        <tr className="cjm-dash-list-row" onClick={() => onEdit(map.id)}>
            <td><strong>{map.title}</strong></td>
            <td><span className="cjm-dash-status-badge-sm" style={{ background: statusStyle.bg, color: statusStyle.text }}>{statusStyle.label}</span></td>
            <td>{new Date(map.updated_at).toLocaleDateString()}</td>
            <td>{new Date(map.created_at).toLocaleDateString()}</td>
            <td onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="cjm-dash-icon-btn" onClick={() => onEdit(map.id)} title="Edit"><Edit3 size={14} /></button>
                    <button className="cjm-dash-icon-btn" onClick={() => onDuplicate(map.id)} title="Duplicate"><Copy size={14} /></button>
                    <button className="cjm-dash-icon-btn danger" onClick={() => onDelete(map.id)} title="Delete"><Trash2 size={14} /></button>
                </div>
            </td>
        </tr>
    );
}

export function CJMDashboard({ onSelectMap }) {
    const [maps, setMaps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState('gallery');
    const [showTemplates, setShowTemplates] = useState(false);
    const [showAIGenerator, setShowAIGenerator] = useState(false);

    const loadMaps = async () => {
        try {
            setLoading(true);
            const params = {};
            if (searchText) params.search = searchText;
            if (statusFilter) params.status = statusFilter;
            const res = await axios.get('/api/cjm', { params });
            setMaps(res.data);
        } catch (e) {
            console.error("Failed to load maps:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadMaps(); }, [searchText, statusFilter]);

    const handleDuplicate = async (id) => {
        try {
            await axios.post(`/api/cjm/${id}/duplicate`);
            loadMaps();
        } catch (e) { alert("Duplicate failed: " + e.message); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this journey map?")) return;
        try {
            await axios.delete(`/api/cjm/${id}`);
            loadMaps();
        } catch (e) { alert("Delete failed: " + e.message); }
    };

    const handleNewFromTemplate = async (templateData) => {
        setShowTemplates(false);
        try {
            const res = await axios.post('/api/cjm', {
                title: templateData.title || 'New Journey Map',
                description: templateData.description || '',
                data: templateData.data
            });
            onSelectMap(res.data.id);
        } catch (e) { alert("Create failed: " + e.message); }
    };

    const handleNewBlank = async () => {
        try {
            const res = await axios.post('/api/cjm', { title: 'New Journey Map' });
            onSelectMap(res.data.id);
        } catch (e) { alert("Create failed: " + e.message); }
    };

    const handleAIGenerate = async (generatedData) => {
        setShowAIGenerator(false);
        try {
            const res = await axios.post('/api/cjm', {
                title: generatedData.project_name || 'AI Generated Journey Map',
                data: generatedData
            });
            onSelectMap(res.data.id);
        } catch (e) { alert("Create failed: " + e.message); }
    };

    return (
        <div className="cjm-dashboard">
            {showTemplates && (
                <TemplateGallery
                    onSelect={handleNewFromTemplate}
                    onClose={() => setShowTemplates(false)}
                    onBlank={handleNewBlank}
                />
            )}

            {showAIGenerator && (
                <AIMapGenerator
                    onGenerate={handleAIGenerate}
                    onClose={() => setShowAIGenerator(false)}
                />
            )}

            <div className="cjm-dash-header">
                <h2>Customer Journey Maps</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="cjm-dash-ai-btn" onClick={() => setShowAIGenerator(true)}>
                        <Wand2 size={18} /> AI Generate
                    </button>
                    <button className="cjm-dash-new-btn" onClick={() => setShowTemplates(true)}>
                        <Plus size={18} /> New Map
                    </button>
                </div>
            </div>

            <div className="cjm-dash-toolbar">
                <div className="cjm-dash-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search maps..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                    />
                </div>

                <div className="cjm-dash-filters">
                    <Filter size={14} />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">All Status</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                <div className="cjm-dash-view-toggle">
                    <button className={viewMode === 'gallery' ? 'active' : ''} onClick={() => setViewMode('gallery')}><Grid size={16} /></button>
                    <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={16} /></button>
                </div>
            </div>

            {loading ? (
                <div className="cjm-dash-loading">Loading maps...</div>
            ) : maps.length === 0 ? (
                <div className="cjm-dash-empty">
                    <Grid size={48} />
                    <h3>No Journey Maps Yet</h3>
                    <p>Create your first customer journey map to get started.</p>
                    <button className="cjm-dash-new-btn" onClick={() => setShowTemplates(true)}>
                        <Plus size={18} /> Create Journey Map
                    </button>
                </div>
            ) : viewMode === 'gallery' ? (
                <div className="cjm-dash-grid">
                    {maps.map(map => (
                        <MapCard
                            key={map.id}
                            map={map}
                            onEdit={onSelectMap}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            ) : (
                <div className="cjm-dash-list-wrapper">
                    <table className="cjm-dash-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Updated</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {maps.map(map => (
                                <MapListItem
                                    key={map.id}
                                    map={map}
                                    onEdit={onSelectMap}
                                    onDuplicate={handleDuplicate}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
