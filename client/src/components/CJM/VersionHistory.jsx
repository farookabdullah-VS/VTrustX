import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, History, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../common/Toast';

export function VersionHistory({ mapId, onRestore, onClose }) {
    const toast = useToast();
    const [versions, setVersions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewId, setPreviewId] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [restoring, setRestoring] = useState(false);

    useEffect(() => {
        loadVersions();
    }, [mapId]);

    const loadVersions = async () => {
        try {
            const res = await axios.get(`/api/cjm/${mapId}/versions`);
            setVersions(res.data || []);
        } catch (e) {
            console.error("Failed to load versions:", e);
        } finally {
            setLoading(false);
        }
    };

    const togglePreview = async (version) => {
        if (previewId === version.id) {
            setPreviewId(null);
            setPreviewData(null);
            return;
        }
        try {
            const res = await axios.get(`/api/cjm/${mapId}/versions/${version.id}`);
            setPreviewData(res.data.data);
            setPreviewId(version.id);
        } catch (e) {
            console.error("Failed to load version preview:", e);
        }
    };

    const handleRestore = async (version) => {
        if (!window.confirm(`Restore to version ${version.version_number}? Current unsaved changes will be lost.`)) return;
        setRestoring(true);
        try {
            const res = await axios.post(`/api/cjm/${mapId}/versions/${version.id}/restore`);
            const restoredData = res.data.data || res.data;
            onRestore(restoredData);
        } catch (e) {
            toast.error("Restore failed: " + e.message);
        } finally {
            setRestoring(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString();
    };

    return (
        <div className="cjm-panel" style={{ width: '320px', borderLeft: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    <History size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Version History
                </h3>
                <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '0.9rem' }}>Loading...</div>
                ) : versions.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 0', fontSize: '0.9rem' }}>
                        No versions saved yet. Versions are created each time you save.
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        {/* Timeline line */}
                        <div style={{
                            position: 'absolute', left: '11px', top: '12px', bottom: '12px',
                            width: '2px', background: '#e2e8f0'
                        }} />

                        {versions.map((version, idx) => (
                            <div key={version.id} style={{ position: 'relative', paddingLeft: '30px', marginBottom: '16px' }}>
                                {/* Timeline dot */}
                                <div style={{
                                    position: 'absolute', left: '6px', top: '6px',
                                    width: '12px', height: '12px', borderRadius: '50%',
                                    background: idx === 0 ? '#3b82f6' : '#cbd5e1',
                                    border: '2px solid white', zIndex: 1
                                }} />

                                <div style={{
                                    padding: '10px', background: previewId === version.id ? '#f0f9ff' : '#f8fafc',
                                    borderRadius: '8px', border: previewId === version.id ? '1px solid #93c5fd' : '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                            v{version.version_number}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                            {formatDate(version.created_at)}
                                        </span>
                                    </div>

                                    {version.created_by && (
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '8px' }}>
                                            by User #{version.created_by}
                                        </div>
                                    )}

                                    {/* Preview area */}
                                    {previewId === version.id && previewData && (
                                        <div style={{
                                            marginBottom: '8px', padding: '8px', background: 'white',
                                            borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: '150px', overflow: 'auto'
                                        }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>
                                                Stages: {(previewData.stages || []).map(s => s.name).join(' → ')}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                Sections: {(previewData.sections || []).length} rows
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            onClick={() => togglePreview(version)}
                                            style={{
                                                border: 'none', background: 'none', cursor: 'pointer',
                                                fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px',
                                                color: previewId === version.id ? '#3b82f6' : '#94a3b8', padding: 0
                                            }}
                                        >
                                            {previewId === version.id ? <EyeOff size={12} /> : <Eye size={12} />}
                                            {previewId === version.id ? 'Hide' : 'Preview'}
                                        </button>
                                        <button
                                            onClick={() => handleRestore(version)}
                                            disabled={restoring}
                                            style={{
                                                border: 'none', background: 'none', cursor: 'pointer',
                                                fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px',
                                                color: '#f59e0b', padding: 0
                                            }}
                                        >
                                            <RotateCcw size={12} />
                                            Restore
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
