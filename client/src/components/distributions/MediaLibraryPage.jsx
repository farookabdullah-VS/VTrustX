import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import {
    Upload, X, Image as ImageIcon, Video, FileText, Music,
    Trash2, Eye, Search, FolderOpen, Tag, Edit3, Check, ChevronDown
} from 'lucide-react';
import { useToast } from '../common/Toast';

const MEDIA_TYPE_ICONS = {
    image: ImageIcon,
    video: Video,
    document: FileText,
    audio: Music,
};

const MEDIA_TYPE_COLORS = {
    image: '#3B82F6',
    video: '#8B5CF6',
    document: '#F59E0B',
    audio: '#10B981',
};

const TYPE_LABELS = { all: 'All Types', image: 'Images', video: 'Videos', document: 'Documents', audio: 'Audio' };

function formatFileSize(bytes) {
    if (!bytes) return '—';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function MediaLibraryPage() {
    const toast = useToast();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFolder, setSelectedFolder] = useState(null);  // null = All
    const [folders, setFolders] = useState([]);
    const [previewAsset, setPreviewAsset] = useState(null);
    const [editingAsset, setEditingAsset] = useState(null);
    const [editForm, setEditForm] = useState({ folder: '', tags: '', description: '' });
    const [dragActive, setDragActive] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkFolder, setBulkFolder] = useState('');
    const [showBulkMove, setShowBulkMove] = useState(false);

    useEffect(() => {
        fetchAssets();
    }, [filterType, selectedFolder]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType !== 'all') params.type = filterType;
            if (selectedFolder !== null) params.folder = selectedFolder || 'null';
            const res = await axios.get('/api/media', { params });
            const data = res.data.assets || [];
            setAssets(data);
            // Derive unique folders from data
            const folderSet = new Set(data.map(a => a.folder).filter(Boolean));
            setFolders([...folderSet].sort());
        } catch (e) {
            toast?.error('Failed to load media library');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        try {
            const uploaded = await Promise.all(Array.from(files).map(async (file) => {
                const fd = new FormData();
                fd.append('file', file);
                const res = await axios.post('/api/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                return res.data.asset;
            }));
            setAssets(prev => [...uploaded, ...prev]);
            toast?.success(`${uploaded.length} file(s) uploaded`);
        } catch (e) {
            toast?.error(e.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files?.length) handleUpload(e.dataTransfer.files);
    }, []);

    const handleDelete = async (id) => {
        if (!confirm('Delete this media asset?')) return;
        try {
            await axios.delete(`/api/media/${id}`);
            setAssets(prev => prev.filter(a => a.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
            toast?.success('Deleted');
        } catch (e) {
            toast?.error('Failed to delete');
        }
    };

    const openEdit = (asset) => {
        setEditingAsset(asset);
        setEditForm({
            folder: asset.folder || '',
            tags: (asset.tags || []).join(', '),
            description: asset.description || '',
        });
    };

    const saveEdit = async () => {
        try {
            const payload = {
                folder: editForm.folder.trim() || null,
                tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
                description: editForm.description.trim() || null,
            };
            const res = await axios.patch(`/api/media/${editingAsset.id}`, payload);
            setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, ...res.data } : a));
            setEditingAsset(null);
            toast?.success('Updated');
        } catch (e) {
            toast?.error('Failed to update');
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.length} assets?`)) return;
        try {
            await axios.post('/api/media/bulk-update', { assetIds: selectedIds, action: 'delete' });
            setAssets(prev => prev.filter(a => !selectedIds.includes(a.id)));
            setSelectedIds([]);
            toast?.success('Deleted');
        } catch (e) {
            toast?.error('Bulk delete failed');
        }
    };

    const handleBulkMove = async () => {
        if (!bulkFolder.trim()) return;
        try {
            await axios.post('/api/media/bulk-update', { assetIds: selectedIds, action: 'move', data: { folder: bulkFolder.trim() } });
            await fetchAssets();
            setSelectedIds([]);
            setShowBulkMove(false);
            setBulkFolder('');
            toast?.success('Moved');
        } catch (e) {
            toast?.error('Bulk move failed');
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const filtered = assets.filter(a => {
        if (searchQuery) return a.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
        return true;
    });

    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 80px)', fontFamily: "'Outfit', sans-serif" }}>
            {/* ── Left Sidebar ─────────────────────────────── */}
            <div style={{ width: '220px', flexShrink: 0, borderRight: '1px solid var(--glass-border)', padding: '24px 16px', background: 'var(--card-bg)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.75em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Filters</p>

                {/* Type filter */}
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <button key={k} onClick={() => setFilterType(k)}
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', background: filterType === k ? 'var(--primary-color)' : 'transparent', color: filterType === k ? 'white' : 'var(--text-color)', fontWeight: filterType === k ? '700' : '500', cursor: 'pointer', fontSize: '0.9em' }}>
                        {v}
                    </button>
                ))}

                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.75em', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Folders</p>
                    <button onClick={() => setSelectedFolder(null)}
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', width: '100%', background: selectedFolder === null ? 'var(--primary-color)' : 'transparent', color: selectedFolder === null ? 'white' : 'var(--text-color)', fontWeight: selectedFolder === null ? '700' : '500', cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderOpen size={14} /> All Files
                    </button>
                    <button onClick={() => setSelectedFolder('')}
                        style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', width: '100%', background: selectedFolder === '' ? 'var(--primary-color)' : 'transparent', color: selectedFolder === '' ? 'white' : 'var(--text-color)', cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderOpen size={14} /> Ungrouped
                    </button>
                    {folders.map(f => (
                        <button key={f} onClick={() => setSelectedFolder(f)}
                            style={{ textAlign: 'left', padding: '8px 12px', borderRadius: '8px', border: 'none', width: '100%', background: selectedFolder === f ? 'var(--primary-color)' : 'transparent', color: selectedFolder === f ? 'white' : 'var(--text-color)', cursor: 'pointer', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <FolderOpen size={14} style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main Content ──────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--card-bg)' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-color)' }}>Media Library</h2>
                        <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: '0.85em' }}>{filtered.length} asset{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {/* Bulk actions */}
                        {selectedIds.length > 0 && (
                            <>
                                <span style={{ fontSize: '0.85em', color: 'var(--primary-color)', fontWeight: '700' }}>{selectedIds.length} selected</span>
                                <button onClick={() => setShowBulkMove(true)} style={{ padding: '8px 14px', border: '1px solid var(--primary-color)', borderRadius: '8px', background: 'transparent', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600' }}>
                                    Move to Folder
                                </button>
                                <button onClick={handleBulkDelete} style={{ padding: '8px 14px', border: '1px solid #EF4444', borderRadius: '8px', background: 'transparent', color: '#EF4444', cursor: 'pointer', fontSize: '0.85em', fontWeight: '600' }}>
                                    Delete
                                </button>
                            </>
                        )}
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input type="text" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                style={{ paddingLeft: '34px', paddingRight: '12px', paddingTop: '9px', paddingBottom: '9px', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--input-bg)', color: 'var(--text-color)', width: '200px', fontSize: '0.9em' }} />
                        </div>
                        {/* Upload */}
                        <label style={{ padding: '9px 18px', background: 'var(--primary-color)', color: 'white', borderRadius: '8px', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '6px', opacity: uploading ? 0.6 : 1 }}>
                            <Upload size={16} />
                            {uploading ? 'Uploading…' : 'Upload'}
                            <input type="file" multiple accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                                onChange={e => handleUpload(e.target.files)} disabled={uploading} style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>

                {/* Grid */}
                <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                    style={{ flex: 1, overflow: 'auto', padding: '24px', background: dragActive ? 'var(--input-bg)' : 'var(--bg)', transition: 'background 0.2s' }}>

                    {loading && <p style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: '60px' }}>Loading…</p>}

                    {!loading && filtered.length === 0 && (
                        <div style={{ textAlign: 'center', paddingTop: '80px', color: 'var(--text-muted)' }}>
                            <Upload size={48} style={{ opacity: 0.3 }} />
                            <p style={{ marginTop: '16px', fontSize: '1.1em' }}>{searchQuery ? 'No results' : 'No files yet — drag & drop or click Upload'}</p>
                        </div>
                    )}

                    {!loading && filtered.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                            {filtered.map(asset => {
                                const Icon = MEDIA_TYPE_ICONS[asset.mediaType] || FileText;
                                const isSelected = selectedIds.includes(asset.id);
                                return (
                                    <div key={asset.id} style={{
                                        border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--glass-border)'}`,
                                        borderRadius: '12px', overflow: 'hidden', background: 'var(--card-bg)',
                                        transition: 'border-color 0.2s', position: 'relative'
                                    }}>
                                        {/* Select checkbox */}
                                        <div onClick={() => toggleSelect(asset.id)} style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 2 }}>
                                            <div style={{ width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isSelected ? 'var(--primary-color)' : '#fff'}`, background: isSelected ? 'var(--primary-color)' : 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
                                                {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                                            </div>
                                        </div>

                                        {/* Thumbnail */}
                                        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: asset.mediaType === 'image' ? '#F9FAFB' : `${MEDIA_TYPE_COLORS[asset.mediaType]}15` }}>
                                            {asset.mediaType === 'image'
                                                ? <img src={asset.thumbnailUrl || asset.url} alt={asset.originalName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <Icon size={44} color={MEDIA_TYPE_COLORS[asset.mediaType]} />}
                                        </div>

                                        {/* Info */}
                                        <div style={{ padding: '10px 12px' }}>
                                            <p style={{ margin: 0, fontSize: '0.85em', fontWeight: '600', color: 'var(--text-color)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={asset.originalName}>{asset.originalName}</p>
                                            <p style={{ margin: '2px 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>{formatFileSize(asset.size)}</p>
                                            {asset.folder && <p style={{ margin: '4px 0 0', fontSize: '0.75em', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '3px' }}><FolderOpen size={11} />{asset.folder}</p>}
                                            {asset.tags?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                                                    {asset.tags.slice(0, 3).map(t => (
                                                        <span key={t} style={{ fontSize: '0.65em', padding: '1px 6px', borderRadius: '10px', background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action row */}
                                        <div style={{ padding: '0 12px 10px', display: 'flex', gap: '6px' }}>
                                            <button onClick={() => setPreviewAsset(asset)} style={{ flex: 1, padding: '5px', border: '1px solid var(--glass-border)', borderRadius: '6px', background: 'var(--input-bg)', cursor: 'pointer', fontSize: '0.75em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                                <Eye size={13} /> View
                                            </button>
                                            <button onClick={() => openEdit(asset)} style={{ flex: 1, padding: '5px', border: '1px solid var(--glass-border)', borderRadius: '6px', background: 'var(--input-bg)', cursor: 'pointer', fontSize: '0.75em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                                <Edit3 size={13} /> Edit
                                            </button>
                                            <button onClick={() => handleDelete(asset.id)} style={{ padding: '5px 8px', border: '1px solid #FCA5A5', borderRadius: '6px', background: 'transparent', cursor: 'pointer', color: '#EF4444' }}>
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Edit Metadata Dialog ──────────────────────── */}
            {editingAsset && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setEditingAsset(null)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '28px', width: '420px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: '4px', color: 'var(--text-color)' }}>Edit Asset</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85em', marginBottom: '20px' }}>{editingAsset.originalName}</p>

                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '6px', color: 'var(--text-color)' }}>Folder</label>
                        <input type="text" value={editForm.folder} onChange={e => setEditForm(p => ({ ...p, folder: e.target.value }))} placeholder="e.g. Campaign 2026"
                            style={{ width: '100%', padding: '9px', border: '1px solid var(--input-border)', borderRadius: '8px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)', marginBottom: '14px' }} />

                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '6px', color: 'var(--text-color)' }}>Tags <span style={{ fontWeight: '400', color: 'var(--text-muted)' }}>(comma-separated)</span></label>
                        <input type="text" value={editForm.tags} onChange={e => setEditForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. promotional, hero, q1"
                            style={{ width: '100%', padding: '9px', border: '1px solid var(--input-border)', borderRadius: '8px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)', marginBottom: '14px' }} />

                        <label style={{ display: 'block', fontSize: '0.85em', fontWeight: '600', marginBottom: '6px', color: 'var(--text-color)' }}>Description</label>
                        <input type="text" value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} placeholder="Short description…"
                            style={{ width: '100%', padding: '9px', border: '1px solid var(--input-border)', borderRadius: '8px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)', marginBottom: '20px' }} />

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingAsset(null)} style={{ padding: '9px 18px', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--input-bg)', cursor: 'pointer', fontWeight: '600', color: 'var(--text-color)' }}>Cancel</button>
                            <button onClick={saveEdit} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontWeight: '700' }}>Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Bulk Move Dialog ──────────────────────────── */}
            {showBulkMove && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowBulkMove(false)}>
                    <div style={{ background: 'var(--card-bg)', borderRadius: '16px', padding: '28px', width: '360px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-color)' }}>Move {selectedIds.length} files to folder</h3>
                        <input type="text" value={bulkFolder} onChange={e => setBulkFolder(e.target.value)} placeholder="Folder name…"
                            autoFocus
                            style={{ width: '100%', padding: '10px', border: '1px solid var(--input-border)', borderRadius: '8px', boxSizing: 'border-box', background: 'var(--input-bg)', color: 'var(--text-color)', marginBottom: '8px' }} />
                        {folders.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {folders.map(f => <button key={f} onClick={() => setBulkFolder(f)} style={{ padding: '4px 10px', border: '1px solid var(--glass-border)', borderRadius: '20px', background: bulkFolder === f ? 'var(--primary-color)' : 'var(--input-bg)', color: bulkFolder === f ? 'white' : 'var(--text-color)', cursor: 'pointer', fontSize: '0.8em' }}>{f}</button>)}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowBulkMove(false)} style={{ padding: '9px 18px', border: '1px solid var(--input-border)', borderRadius: '8px', background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text-color)', fontWeight: '600' }}>Cancel</button>
                            <button onClick={handleBulkMove} disabled={!bulkFolder.trim()} style={{ padding: '9px 18px', border: 'none', borderRadius: '8px', background: bulkFolder.trim() ? 'var(--primary-color)' : '#E5E7EB', color: 'white', cursor: bulkFolder.trim() ? 'pointer' : 'not-allowed', fontWeight: '700' }}>Move</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Preview Modal ─────────────────────────────── */}
            {previewAsset && (
                <div onClick={() => setPreviewAsset(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
                    <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%' }}>
                        {previewAsset.mediaType === 'image' && <img src={previewAsset.url} alt={previewAsset.originalName} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px' }} />}
                        {previewAsset.mediaType === 'video' && <video controls src={previewAsset.url} style={{ maxWidth: '100%', maxHeight: '85vh' }} />}
                        {previewAsset.mediaType === 'audio' && <audio controls src={previewAsset.url} style={{ width: '400px' }} />}
                        {previewAsset.mediaType === 'document' && (
                            <div style={{ background: 'white', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                                <FileText size={64} color="#F59E0B" />
                                <p style={{ marginTop: '12px', fontWeight: '600' }}>{previewAsset.originalName}</p>
                                <a href={previewAsset.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)' }}>Download</a>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setPreviewAsset(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}>
                        <X size={24} color="white" />
                    </button>
                </div>
            )}
        </div>
    );
}

export default MediaLibraryPage;
