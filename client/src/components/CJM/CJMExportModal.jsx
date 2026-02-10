import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { X, Download, FileImage, FileText, FileSpreadsheet, Presentation } from 'lucide-react';

const FORMATS = [
    { id: 'png', label: 'PNG Image', desc: 'High-res screenshot of the journey map', icon: <FileImage size={20} />, clientSide: true },
    { id: 'pdf', label: 'PDF Document', desc: 'Print-ready document export', icon: <FileText size={20} />, clientSide: false },
    { id: 'pptx', label: 'PowerPoint', desc: 'Presentation slides per stage', icon: <Presentation size={20} />, clientSide: false },
    { id: 'xlsx', label: 'Excel Spreadsheet', desc: 'Tabular summary of all cells', icon: <FileSpreadsheet size={20} />, clientSide: true }
];

export function CJMExportModal({ mapId, mapData, onClose }) {
    const [selectedFormat, setSelectedFormat] = useState('png');
    const [exporting, setExporting] = useState(false);
    const [status, setStatus] = useState(null);

    const handleExport = async () => {
        setExporting(true);
        setStatus({ type: 'info', message: 'Preparing export...' });

        try {
            const format = FORMATS.find(f => f.id === selectedFormat);

            if (selectedFormat === 'png') {
                await exportPng();
            } else if (selectedFormat === 'xlsx') {
                exportExcel();
            } else if (format && !format.clientSide) {
                await exportServerSide(selectedFormat);
            }
        } catch (e) {
            console.error("Export error:", e);
            setStatus({ type: 'error', message: e.message || 'Export failed' });
            setExporting(false);
        }
    };

    const exportPng = async () => {
        setStatus({ type: 'info', message: 'Capturing map image...' });
        try {
            const { default: html2canvas } = await import('html2canvas');
            const canvas = document.querySelector('.cjm-grid');
            if (!canvas) throw new Error('Map grid not found. Close analytics view first.');

            const canvasEl = await html2canvas(canvas, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                logging: false
            });

            const link = document.createElement('a');
            const safeTitle = (mapData.project_name || 'journey').replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            link.download = `${safeTitle}.png`;
            link.href = canvasEl.toDataURL('image/png');
            link.click();

            setStatus({ type: 'success', message: 'PNG downloaded!' });
            setTimeout(() => { setExporting(false); onClose(); }, 1000);
        } catch (e) {
            throw new Error('PNG export failed: ' + e.message);
        }
    };

    const exportExcel = () => {
        setStatus({ type: 'info', message: 'Generating Excel file...' });

        const stages = mapData.stages || [];
        const sections = mapData.sections || [];

        // Sheet 1: Journey Overview
        const overviewHeaders = ['Section', 'Type', ...stages.map(s => s.name)];
        const overviewData = [overviewHeaders];

        sections.forEach(sec => {
            const row = [sec.title || 'Untitled', sec.type || 'text'];
            stages.forEach(stage => {
                const cell = sec.cells?.[stage.id];
                if (!cell) {
                    row.push('');
                } else if (sec.type === 'touchpoints' && Array.isArray(cell.items)) {
                    row.push(cell.items.map(tp => tp.label || tp.name || tp).join(', '));
                } else if (sec.type === 'sentiment_graph') {
                    row.push(cell.value !== undefined ? `${cell.value}/100` : '');
                } else if (sec.type === 'kpi') {
                    row.push(cell.value ? `${cell.value} (${cell.label || ''})` : '');
                } else if (sec.type === 'pain_point') {
                    row.push(cell.value ? `${cell.value} [Severity: ${cell.severity || 0}/5]` : '');
                } else if (sec.type === 'opportunity') {
                    row.push(cell.value ? `${cell.value} [Impact: ${cell.impact || 0}/5]` : '');
                } else if (sec.type === 'actions' && Array.isArray(cell.items)) {
                    row.push(cell.items.map(a => `${a.done ? '[x]' : '[ ]'} ${a.text || ''}`).join('\n'));
                } else if (sec.type === 'process_flow' && Array.isArray(cell.steps)) {
                    row.push(cell.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'));
                } else {
                    row.push(cell.value || '');
                }
            });
            overviewData.push(row);
        });

        // Sheet 2: Stages
        const stagesData = [['Stage', 'Background Color', 'Text Color']];
        stages.forEach(s => {
            stagesData.push([s.name, s.style?.bg_color || '', s.style?.text_color || '']);
        });

        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Journey Map');
        const ws2 = XLSX.utils.aoa_to_sheet(stagesData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Stages');

        const safeTitle = (mapData.project_name || 'journey').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
        XLSX.writeFile(wb, `CJM_${safeTitle}.xlsx`);

        setStatus({ type: 'success', message: 'Excel downloaded!' });
        setTimeout(() => { setExporting(false); onClose(); }, 1000);
    };

    const exportServerSide = async (format) => {
        setStatus({ type: 'info', message: `Generating ${format.toUpperCase()} on server...` });
        try {
            const res = await axios.post(`/api/cjm/${mapId}/export`, { format }, { responseType: 'blob' });
            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const safeTitle = (mapData.project_name || 'journey').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
            link.href = url;
            link.download = `CJM_${safeTitle}.${format}`;
            link.click();
            window.URL.revokeObjectURL(url);

            setStatus({ type: 'success', message: `${format.toUpperCase()} downloaded!` });
            setTimeout(() => { setExporting(false); onClose(); }, 1000);
        } catch (e) {
            if (e.response?.status === 404) {
                throw new Error(`Server-side ${format.toUpperCase()} export not available. Try PNG or Excel.`);
            }
            throw e;
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '16px', width: '440px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '24px'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={20} /> Export Journey Map
                    </h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={20} /></button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    {FORMATS.map(fmt => (
                        <button
                            key={fmt.id}
                            onClick={() => !exporting && setSelectedFormat(fmt.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                                padding: '12px 16px', marginBottom: '8px', borderRadius: '10px',
                                border: selectedFormat === fmt.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                background: selectedFormat === fmt.id ? '#f0f9ff' : 'white',
                                cursor: exporting ? 'not-allowed' : 'pointer', textAlign: 'left'
                            }}
                        >
                            <span style={{ color: selectedFormat === fmt.id ? '#3b82f6' : '#94a3b8' }}>{fmt.icon}</span>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>{fmt.label}</div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{fmt.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>

                {status && (
                    <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem',
                        background: status.type === 'error' ? '#fef2f2' : status.type === 'success' ? '#f0fdf4' : '#f0f9ff',
                        color: status.type === 'error' ? '#dc2626' : status.type === 'success' ? '#16a34a' : '#2563eb',
                        border: `1px solid ${status.type === 'error' ? '#fecaca' : status.type === 'success' ? '#bbf7d0' : '#bfdbfe'}`
                    }}>
                        {status.message}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        disabled={exporting}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: '1px solid #e2e8f0',
                            background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.9rem'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none',
                            background: exporting ? '#94a3b8' : 'var(--primary-color, #3b82f6)',
                            color: 'white', cursor: exporting ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting...' : 'Export'}
                    </button>
                </div>
            </div>
        </div>
    );
}
