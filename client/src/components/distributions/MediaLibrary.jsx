import React, { useState, useEffect, useCallback } from 'react';
import axios from '../../axiosConfig';
import { Upload, X, Image as ImageIcon, Video, FileText, Music, Trash2, Download, Eye, Search, Filter, FolderOpen } from 'lucide-react';
import { useToast } from '../common/Toast';

const MEDIA_TYPE_ICONS = {
    image: ImageIcon,
    video: Video,
    document: FileText,
    audio: Music
};

const MEDIA_TYPE_COLORS = {
    image: '#3B82F6',
    video: '#8B5CF6',
    document: '#F59E0B',
    audio: '#10B981'
};

export function MediaLibrary({ onSelect, multiSelect = false, onClose }) {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedAssets, setSelectedAssets] = useState([]);
    const [filterType, setFilterType] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterFolder, setFilterFolder] = useState(null);
    const [folders, setFolders] = useState([]);
    const [previewAsset, setPreviewAsset] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const toast = useToast();

    useEffect(() => {
        fetchAssets();
    }, [filterType, filterFolder]);

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filterType !== 'all') params.type = filterType;
            if (filterFolder !== null) params.folder = filterFolder || 'null';

            const response = await axios.get('/api/media', { params });
            const data = response.data.assets || [];
            setAssets(data);
            // Derive folders for filter chips
            const folderSet = new Set(data.map(a => a.folder).filter(Boolean));
            setFolders([...folderSet].sort());
        } catch (error) {
            console.error('Failed to fetch media assets:', error);
            toast?.error('Failed to load media library');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (files) => {
        if (!files || files.length === 0) return;

        setUploading(true);

        try {
            const uploadPromises = Array.from(files).map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);

                const response = await axios.post('/api/media/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                return response.data.asset;
            });

            const uploadedAssets = await Promise.all(uploadPromises);

            setAssets(prev => [...uploadedAssets, ...prev]);
            toast?.success(`${uploadedAssets.length} file(s) uploaded successfully`);
        } catch (error) {
            console.error('Upload failed:', error);
            toast?.error(error.response?.data?.error || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    }, []);

    const handleDelete = async (assetId) => {
        if (!confirm('Are you sure you want to delete this media asset?')) {
            return;
        }

        try {
            await axios.delete(`/api/media/${assetId}`);
            setAssets(prev => prev.filter(a => a.id !== assetId));
            toast?.success('Media asset deleted');
        } catch (error) {
            console.error('Delete failed:', error);
            toast?.error('Failed to delete media asset');
        }
    };

    const toggleAssetSelection = (asset) => {
        if (multiSelect) {
            setSelectedAssets(prev => {
                const isSelected = prev.find(a => a.id === asset.id);
                if (isSelected) {
                    return prev.filter(a => a.id !== asset.id);
                } else {
                    return [...prev, asset];
                }
            });
        } else {
            setSelectedAssets([asset]);
        }
    };

    const handleSelect = () => {
        if (onSelect) {
            onSelect(multiSelect ? selectedAssets : selectedAssets[0]);
        }
        if (onClose) {
            onClose();
        }
    };

    const filteredAssets = assets.filter(asset => {
        if (searchQuery) {
            return asset.originalName.toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true;
    });

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '1200px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '2px solid #E5E7EB',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-color)' }}>
                            Media Library
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Upload and manage media assets
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={24} color="var(--text-muted)" />
                    </button>
                </div>

                {/* Controls */}
                <div style={{ padding: '20px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Upload Button */}
                    <label style={{
                        padding: '10px 20px',
                        background: 'var(--primary)',
                        color: 'white',
                        borderRadius: '8px',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '600',
                        opacity: uploading ? 0.6 : 1
                    }}>
                        <Upload size={18} />
                        {uploading ? 'Uploading...' : 'Upload Files'}
                        <input
                            type="file"
                            multiple
                            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                            onChange={(e) => handleFileUpload(e.target.files)}
                            disabled={uploading}
                            style={{ display: 'none' }}
                        />
                    </label>

                    {/* Filter */}
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{
                            padding: '10px 16px',
                            border: '2px solid var(--border-color)',
                            borderRadius: '8px',
                            background: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Types</option>
                        <option value="image">Images</option>
                        <option value="video">Videos</option>
                        <option value="document">Documents</option>
                        <option value="audio">Audio</option>
                    </select>

                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
                        <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px 16px 10px 40px',
                                border: '2px solid var(--border-color)',
                                borderRadius: '8px'
                            }}
                        />
                    </div>
                </div>

                {/* Folder filter chips */}
                {folders.length > 0 && (
                    <div style={{ padding: '0 20px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <FolderOpen size={14} color="var(--text-muted)" />
                        <button onClick={() => setFilterFolder(null)}
                            style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', background: filterFolder === null ? 'var(--primary, #3B82F6)' : '#F3F4F6', color: filterFolder === null ? 'white' : '#374151', cursor: 'pointer', fontSize: '0.8rem', fontWeight: filterFolder === null ? '700' : '500' }}>
                            All
                        </button>
                        {folders.map(f => (
                            <button key={f} onClick={() => setFilterFolder(filterFolder === f ? null : f)}
                                style={{ padding: '4px 12px', borderRadius: '20px', border: 'none', background: filterFolder === f ? 'var(--primary, #3B82F6)' : '#F3F4F6', color: filterFolder === f ? 'white' : '#374151', cursor: 'pointer', fontSize: '0.8rem', fontWeight: filterFolder === f ? '700' : '500' }}>
                                {f}
                            </button>
                        ))}
                    </div>
                )}

                {/* Upload Drop Zone */}
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    style={{
                        padding: '20px',
                        flex: 1,
                        overflow: 'auto',
                        minHeight: 0,
                        background: dragActive ? '#F0F9FF' : 'transparent',
                        border: dragActive ? '2px dashed var(--primary)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    {loading && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div className="spinner"></div>
                            <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>Loading media assets...</p>
                        </div>
                    )}

                    {!loading && filteredAssets.length === 0 && (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <Upload size={48} color="var(--text-muted)" />
                            <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                {searchQuery ? 'No assets match your search' : 'No media assets yet'}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {!searchQuery && 'Drag & drop files here or click Upload Files'}
                            </p>
                        </div>
                    )}

                    {!loading && filteredAssets.length > 0 && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                            gap: '16px'
                        }}>
                            {filteredAssets.map(asset => {
                                const Icon = MEDIA_TYPE_ICONS[asset.mediaType] || FileText;
                                const isSelected = selectedAssets.find(a => a.id === asset.id);

                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => toggleAssetSelection(asset)}
                                        style={{
                                            position: 'relative',
                                            border: isSelected ? `3px solid var(--primary)` : '2px solid #E5E7EB',
                                            borderRadius: '12px',
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            background: isSelected ? '#F0F9FF' : 'white'
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        <div style={{
                                            height: '150px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: asset.mediaType === 'image' ? '#F9FAFB' : `${MEDIA_TYPE_COLORS[asset.mediaType]}10`
                                        }}>
                                            {(asset.mediaType === 'image' || asset.thumbnailUrl) ? (
                                                <img
                                                    src={asset.thumbnailUrl || asset.url}
                                                    alt={asset.originalName}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <Icon size={48} color={MEDIA_TYPE_COLORS[asset.mediaType]} />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div style={{ padding: '12px' }}>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                color: 'var(--text-color)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }} title={asset.originalName}>
                                                {asset.originalName}
                                            </p>
                                            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {formatFileSize(asset.size)}
                                            </p>
                                            {asset.folder && (
                                                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <FolderOpen size={11} />{asset.folder}
                                                </p>
                                            )}
                                            {asset.tags?.length > 0 && (
                                                <div style={{ display: 'flex', gap: '3px', marginTop: '5px', flexWrap: 'wrap' }}>
                                                    {asset.tags.slice(0, 3).map(t => (
                                                        <span key={t} style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '10px', background: '#F3F4F6', color: '#6B7280' }}>{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '8px',
                                            right: '8px',
                                            display: 'flex',
                                            gap: '4px'
                                        }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPreviewAsset(asset);
                                                }}
                                                style={{
                                                    background: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                                title="Preview"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(asset.id);
                                                }}
                                                style={{
                                                    background: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                }}
                                                title="Delete"
                                            >
                                                <Trash2 size={16} color="#EF4444" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {onSelect && (
                    <div style={{
                        padding: '20px 24px',
                        borderTop: '2px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            {selectedAssets.length} selected
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px',
                                    border: '2px solid var(--border-color)',
                                    borderRadius: '8px',
                                    background: 'white',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSelect}
                                disabled={selectedAssets.length === 0}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    background: selectedAssets.length === 0 ? '#E5E7EB' : 'var(--primary)',
                                    color: 'white',
                                    cursor: selectedAssets.length === 0 ? 'not-allowed' : 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Insert {selectedAssets.length > 0 && `(${selectedAssets.length})`}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewAsset && (
                <div
                    onClick={() => setPreviewAsset(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }}
                >
                    <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', maxHeight: '90%' }}>
                        {previewAsset.mediaType === 'image' && (
                            <img src={previewAsset.url} alt={previewAsset.originalName} style={{ maxWidth: '100%', maxHeight: '90vh' }} />
                        )}
                        {previewAsset.mediaType === 'video' && (
                            <video controls src={previewAsset.url} style={{ maxWidth: '100%', maxHeight: '90vh' }} />
                        )}
                        {previewAsset.mediaType === 'audio' && (
                            <audio controls src={previewAsset.url} style={{ width: '400px' }} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MediaLibrary;
