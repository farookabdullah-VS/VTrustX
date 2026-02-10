import React, { useState, useRef } from 'react';
import { X, CloudUpload, Link, Image as ImageIcon, FileText } from 'lucide-react';

export function DocumentSelectorModal({ isOpen, onClose, onSelect }) {
    const [activeTab, setActiveTab] = useState('upload');
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSelect({ type: 'file', name: file.name, size: file.size });
            onClose();
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            onSelect({ type: 'file', name: file.name, size: file.size });
            onClose();
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'white', borderRadius: '8px', width: '500px', maxWidth: '95%', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                {/* Tabs / Header */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={() => setActiveTab('upload')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'upload' ? '#10B981' : '#cbd5e1' }}><CloudUpload size={24} /></button>
                        <button onClick={() => setActiveTab('link')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'link' ? '#10B981' : '#cbd5e1' }}><Link size={24} /></button>
                        <button onClick={() => setActiveTab('library')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'library' ? '#10B981' : '#cbd5e1' }}><ImageIcon size={24} /></button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ padding: '30px' }}>
                    {activeTab === 'upload' && (
                        <div
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            style={{
                                border: '2px dashed #cbd5e1',
                                borderRadius: '8px',
                                padding: '40px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '20px',
                                background: dragActive ? '#f0fdf4' : 'transparent',
                                transition: 'background 0.2s'
                            }}
                        >
                            <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#334155' }}>Drop document here</div>

                            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '15px' }}>
                                <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
                                <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '0.9em' }}>OR</span>
                                <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
                            </div>

                            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />

                            <button
                                onClick={() => fileInputRef.current.click()}
                                style={{
                                    background: '#6EE7B7',
                                    color: '#064e3b',
                                    border: 'none',
                                    borderRadius: '24px',
                                    padding: '12px 30px',
                                    fontSize: '0.9em',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                SELECT DOCUMENTS
                            </button>
                        </div>
                    )}

                    {activeTab === 'link' && (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>Link input not implemented yet.</div>
                    )}

                    {activeTab === 'library' && (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>Library not implemented yet.</div>
                    )}
                </div>

                <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'right' }}>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 12px', cursor: 'pointer', color: '#64748b' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
