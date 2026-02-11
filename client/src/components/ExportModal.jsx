/**
 * ExportModal - Main export interface component
 * Provides comprehensive export options matching the design specification
 */

import React, { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './ExportModal.css';

const ExportModal = ({ isOpen, onClose, formId, formTitle }) => {
    const [activeTab, setActiveTab] = useState('raw');
    const [exportConfig, setExportConfig] = useState({
        // Raw Data Export Options
        raw: {
            format: 'xlsx',
            singleHeaderRow: true,
            displayAnswerCodes: false,
            displayAnswerValues: true,
            questionCodes: false,
            unselectedCheckboxes: '0',
            showNotDisplayed: false,
            reportLabels: true,
            contentUrls: true,
            geocode: false
        },
        // Analytics Export Options
        analytics: {
            format: 'pptx',
            template: 'QuestionPro/Blue',
            includeOpenEnded: true
        },
        // SPSS Export Options
        spss: {
            answerCodes: true,
            answerValues: false,
            legacyExport: false,
            questionCodeVariableName: true,
            questionCodeInsteadOfText: false,
            showNotDisplayed: false,
            unselectedCheckboxes: '0',
            reportLabels: true,
            includeOpenEnded: true,
            geocode: false
        },
        // SQL Export Options
        sql: {
            includeScores: true,
            includeTimestamps: true
        },
        // Common Filters
        filters: {
            dataset: 'entire',
            dateRange: {
                start: '',
                end: ''
            },
            status: '',
            customFilters: []
        }
    });

    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState(null);

    const templates = [
        'QuestionPro/Blue',
        'surveyanalyticsWhiteLabel',
        'surveyanalyticsWhiteLabel2003',
        'Microsoft/Blends',
        'Microsoft/Pixel',
        'Microsoft/Fireworks',
        'Microsoft/Crayons',
        'Microsoft/Mountain Top',
        'Microsoft/Ocean',
        'Microsoft/Stream',
        'Microsoft/Globe',
        'Microsoft/Fading Grid',
        'Microsoft/Compass'
    ];

    const handleExport = async () => {
        setIsExporting(true);
        setExportStatus({ type: 'info', message: 'Creating export job...' });

        // INTERCEPT: If Excel export is requested, use the specialized 3-sheet client-side generator
        if (activeTab === 'raw' && exportConfig.raw.format === 'xlsx') {
            await generateClientSideExcel();
            return;
        }

        try {
            const userStr = localStorage.getItem('vtrustx_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

            if (!token) {
                setExportStatus({ type: 'error', message: 'Authentication required' });
                setIsExporting(false);
                return;
            }

            let endpoint = '';
            let payload = {};

            // Prepare payload based on active tab
            switch (activeTab) {
                case 'raw':
                    endpoint = '/api/exports/raw';
                    payload = {
                        formId,
                        format: exportConfig.raw.format,
                        options: exportConfig.raw,
                        filters: exportConfig.filters
                    };
                    break;

                case 'analytics':
                    endpoint = '/api/exports/analytics';
                    payload = {
                        formId,
                        format: exportConfig.analytics.format,
                        template: exportConfig.analytics.template,
                        includeOpenEnded: exportConfig.analytics.includeOpenEnded,
                        filters: exportConfig.filters
                    };
                    break;

                case 'spss':
                    endpoint = '/api/exports/spss';
                    payload = {
                        formId,
                        options: exportConfig.spss,
                        filters: exportConfig.filters
                    };
                    break;

                case 'sql':
                    endpoint = '/api/exports/sql';
                    payload = {
                        formId,
                        includeScores: exportConfig.sql.includeScores,
                        includeTimestamps: exportConfig.sql.includeTimestamps,
                        filters: exportConfig.filters
                    };
                    break;

                default:
                    throw new Error('Invalid export type');
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Export failed');
            }

            const result = await response.json();

            // Poll for job completion
            await pollExportStatus(result.jobId, token);

        } catch (error) {
            console.error('Export error:', error);
            setExportStatus({ type: 'error', message: error.message });
            setIsExporting(false);
        }
    };

    // Client-side 3-Sheet Excel Generator
    const generateClientSideExcel = async () => {
        try {
            setExportStatus({ type: 'info', message: 'Fetching data...' });

            // 1. Fetch Submissions
            const subRes = await axios.get(`/api/submissions?formId=${formId}`);
            const submissions = subRes.data;

            if (!submissions || !submissions.length) {
                setExportStatus({ type: 'error', message: 'No data available to export.' });
                setIsExporting(false);
                return;
            }

            // 2. Fetch/Ensure Schema Definition
            let definition = null;
            try {
                const formRes = await axios.get(`/api/forms/${formId}`);
                definition = formRes.data.definition || formRes.data.json;
            } catch (e) {
                console.warn("Could not fetch full form definition", e);
            }

            setExportStatus({ type: 'info', message: 'Generating Excel file...' });

            // 3. Process Questions Metadata
            let qList = [];
            let qIndex = 1;

            if (definition && definition.pages) {
                definition.pages.forEach(p => {
                    if (p.elements) {
                        p.elements.forEach(e => {
                            if (e.type === 'html' || e.type === 'image') return;
                            qList.push({
                                id: `Q${qIndex++}`,
                                name: e.name,
                                title: e.title || e.name,
                                type: e.type,
                                choices: e.choices,
                                rateMax: e.rateMax
                            });
                        });
                    }
                });
            } else {
                // Fallback: Infer from data keys
                const allKeys = new Set();
                submissions.forEach(s => {
                    if (s.data) Object.keys(s.data).forEach(k => allKeys.add(k));
                });
                Array.from(allKeys).forEach(k => {
                    qList.push({ id: `Q${qIndex++}`, name: k, title: k });
                });
            }

            // --- SHEET 1: Questions ---
            const sheet1Data = [["Question ID", "Question Text"]];
            qList.forEach(q => sheet1Data.push([q.id, q.title]));

            // --- SHEET 2: Data ---
            // --- SHEET 2: Data ---
            const sheet2Headers = ["ID", "Date"];
            qList.forEach(q => {
                if (q.type === 'checkbox' && q.choices && q.choices.length > 0) {
                    q.choices.forEach((c, idx) => {
                        sheet2Headers.push(`${q.id}_${idx + 1}`);
                    });
                } else {
                    sheet2Headers.push(q.id);
                }
            });
            sheet2Headers.push("Sentiment");

            const sheet2Data = [sheet2Headers];

            submissions.forEach(sub => {
                const row = [
                    sub.id,
                    (sub.created_at || sub.createdAt) ? new Date(sub.created_at || sub.createdAt).toLocaleString() : '-'
                ];

                qList.forEach(q => {
                    const rawVal = sub.data ? sub.data[q.name] : null;

                    if (q.type === 'checkbox' && q.choices && q.choices.length > 0) {
                        let selected = [];
                        if (Array.isArray(rawVal)) {
                            selected = rawVal;
                        } else if (rawVal && typeof rawVal === 'object') {
                            selected = Object.keys(rawVal).filter(k => rawVal[k]);
                        } else if (rawVal) {
                            selected = [rawVal];
                        }

                        q.choices.forEach(c => {
                            const cVal = (typeof c === 'object') ? (c.value || c.text) : c;
                            const isSelected = selected.some(s => s == cVal);
                            row.push(isSelected ? 1 : 0);
                        });
                    } else {
                        let val = rawVal || '';
                        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                        row.push(val);
                    }
                });

                // Sentiment
                row.push(sub.computedSentiment || '-');
                sheet2Data.push(row);
            });

            // --- SHEET 3: Variables (Codebook) ---
            const sheet3Data = [["Variable", "Label"]];
            qList.forEach(q => {
                if (q.choices) {
                    q.choices.forEach((c, idx) => {
                        const val = (typeof c === 'object') ? (c.value || c.text) : c;
                        const label = (typeof c === 'object') ? (c.text || c.value) : c;

                        if (q.type === 'checkbox') {
                            sheet3Data.push([`${q.id}_${idx + 1}`, label]);
                        } else {
                            sheet3Data.push([q.id, `${val} = ${label}`]);
                        }
                    });
                } else if (q.type === 'boolean') {
                    sheet3Data.push([q.id, "1=Yes, 0=No"]);
                } else if (q.type === 'rating') {
                    const max = q.rateMax || 5;
                    for (let i = 1; i <= max; i++) sheet3Data.push([q.id, i]);
                }
            });

            // --- GENERATE FILE ---
            const wb = XLSX.utils.book_new();

            const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
            XLSX.utils.book_append_sheet(wb, ws1, "Questions");

            const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
            XLSX.utils.book_append_sheet(wb, ws2, "Data");

            const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
            XLSX.utils.book_append_sheet(wb, ws3, "Variables");

            const safeTitle = (formTitle || 'Survey').replace(/[^a-z0-9]/gi, '_').substring(0, 20);
            XLSX.writeFile(wb, `Export_${safeTitle}.xlsx`);

            setExportStatus({ type: 'success', message: 'Download started!' });
            setTimeout(() => {
                setIsExporting(false);
                setExportStatus(null);
                onClose();
            }, 1000);

        } catch (err) {
            console.error(err);
            setExportStatus({ type: 'error', message: "Failed to export data." });
            setIsExporting(false);
        }
    };

    const pollExportStatus = async (jobId, token) => {
        const maxAttempts = 60; // 5 minutes max (5 second intervals)
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`/api/exports/jobs/${jobId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to check export status');
                }

                const job = await response.json();

                if (job.status === 'completed') {
                    setExportStatus({ type: 'success', message: 'Export completed! Downloading...' });

                    // Download file
                    // Download via fetch + blob to avoid token in URL
                    const dlResp = await fetch(`/api/exports/download/${jobId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (dlResp.ok) {
                        const blob = await dlResp.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `export-${jobId}`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }

                    setTimeout(() => {
                        setIsExporting(false);
                        setExportStatus(null);
                        onClose();
                    }, 2000);

                } else if (job.status === 'failed') {
                    throw new Error(job.error_message || 'Export failed');

                } else if (attempts < maxAttempts) {
                    attempts++;
                    setExportStatus({
                        type: 'info',
                        message: `Processing export... (${Math.round(attempts / maxAttempts * 100)}%)`
                    });
                    setTimeout(poll, 5000);

                } else {
                    throw new Error('Export timeout - please try again');
                }

            } catch (error) {
                setExportStatus({ type: 'error', message: error.message });
                setIsExporting(false);
            }
        };

        poll();
    };

    const updateConfig = (section, key, value) => {
        setExportConfig(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [key]: value
            }
        }));
    };

    const updateFilter = (key, value) => {
        setExportConfig(prev => ({
            ...prev,
            filters: {
                ...prev.filters,
                [key]: value
            }
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="export-modal-overlay">
            <div className="export-modal">
                <div className="export-modal-header">
                    <h2>Export Data</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="export-modal-subtitle">
                    <strong>{formTitle}</strong>
                </div>

                <div className="export-tabs">
                    <button
                        className={activeTab === 'raw' ? 'active' : ''}
                        onClick={() => setActiveTab('raw')}
                    >
                        Raw Data Export
                    </button>
                    <button
                        className={activeTab === 'analytics' ? 'active' : ''}
                        onClick={() => setActiveTab('analytics')}
                    >
                        Charts & Analytics
                    </button>
                    <button
                        className={activeTab === 'spss' ? 'active' : ''}
                        onClick={() => setActiveTab('spss')}
                    >
                        Statistical Package (SPSS)
                    </button>
                    <button
                        className={activeTab === 'sql' ? 'active' : ''}
                        onClick={() => setActiveTab('sql')}
                    >
                        SQL Export
                    </button>
                </div>

                <div className="export-modal-body">
                    {/* Raw Data Export */}
                    {activeTab === 'raw' && (
                        <div className="export-section">
                            <h3>Output File Format</h3>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="rawFormat"
                                        value="xlsx"
                                        checked={exportConfig.raw.format === 'xlsx'}
                                        onChange={(e) => updateConfig('raw', 'format', e.target.value)}
                                    />
                                    Microsoft Excel (.xlsx)
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="rawFormat"
                                        value="csv"
                                        checked={exportConfig.raw.format === 'csv'}
                                        onChange={(e) => updateConfig('raw', 'format', e.target.value)}
                                    />
                                    CSV - Comma Separated Values (.csv)
                                </label>
                            </div>

                            <h3>Options</h3>
                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.singleHeaderRow}
                                        onChange={(e) => updateConfig('raw', 'singleHeaderRow', e.target.checked)}
                                    />
                                    Single Header Row
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.displayAnswerCodes}
                                        onChange={(e) => updateConfig('raw', 'displayAnswerCodes', e.target.checked)}
                                    />
                                    Display Answer Codes/Index
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.displayAnswerValues}
                                        onChange={(e) => updateConfig('raw', 'displayAnswerValues', e.target.checked)}
                                    />
                                    Display Answer Values
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.questionCodes}
                                        onChange={(e) => updateConfig('raw', 'questionCodes', e.target.checked)}
                                    />
                                    Question codes instead of text
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.showNotDisplayed}
                                        onChange={(e) => updateConfig('raw', 'showNotDisplayed', e.target.checked)}
                                    />
                                    Show Question Not Displayed
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.reportLabels}
                                        onChange={(e) => updateConfig('raw', 'reportLabels', e.target.checked)}
                                    />
                                    Report labels
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.contentUrls}
                                        onChange={(e) => updateConfig('raw', 'contentUrls', e.target.checked)}
                                    />
                                    Content URL (upload question data)
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.raw.geocode}
                                        onChange={(e) => updateConfig('raw', 'geocode', e.target.checked)}
                                    />
                                    Geo code & additional info
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Analytics Export */}
                    {activeTab === 'analytics' && (
                        <div className="export-section">
                            <h3>Output Format</h3>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="analyticsFormat"
                                        value="pptx"
                                        checked={exportConfig.analytics.format === 'pptx'}
                                        onChange={(e) => updateConfig('analytics', 'format', e.target.value)}
                                    />
                                    PowerPoint (.pptx)
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="analyticsFormat"
                                        value="ppt"
                                        checked={exportConfig.analytics.format === 'ppt'}
                                        onChange={(e) => updateConfig('analytics', 'format', e.target.value)}
                                    />
                                    PowerPoint (.ppt)
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="analyticsFormat"
                                        value="docx"
                                        checked={exportConfig.analytics.format === 'docx'}
                                        onChange={(e) => updateConfig('analytics', 'format', e.target.value)}
                                    />
                                    Word (.docx)
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="analyticsFormat"
                                        value="xlsx"
                                        checked={exportConfig.analytics.format === 'xlsx'}
                                        onChange={(e) => updateConfig('analytics', 'format', e.target.value)}
                                    />
                                    Excel (.xlsx)
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="analyticsFormat"
                                        value="pdf"
                                        checked={exportConfig.analytics.format === 'pdf'}
                                        onChange={(e) => updateConfig('analytics', 'format', e.target.value)}
                                    />
                                    PDF (.pdf)
                                </label>
                            </div>

                            <h3>Template</h3>
                            <select
                                value={exportConfig.analytics.template}
                                onChange={(e) => updateConfig('analytics', 'template', e.target.value)}
                                className="template-select"
                            >
                                {templates.map(template => (
                                    <option key={template} value={template}>{template}</option>
                                ))}
                            </select>

                            <h3>Options</h3>
                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.analytics.includeOpenEnded}
                                        onChange={(e) => updateConfig('analytics', 'includeOpenEnded', e.target.checked)}
                                    />
                                    Include Open-ended text data
                                </label>
                            </div>
                        </div>
                    )}

                    {/* SPSS Export */}
                    {activeTab === 'spss' && (
                        <div className="export-section">
                            <h3>Raw data</h3>
                            <div className="radio-group">
                                <label>
                                    <input
                                        type="radio"
                                        name="spssData"
                                        value="codes"
                                        checked={exportConfig.spss.answerCodes}
                                        onChange={(e) => {
                                            updateConfig('spss', 'answerCodes', true);
                                            updateConfig('spss', 'answerValues', false);
                                        }}
                                    />
                                    Answer Codes/Index
                                </label>
                                <label>
                                    <input
                                        type="radio"
                                        name="spssData"
                                        value="values"
                                        checked={exportConfig.spss.answerValues}
                                        onChange={(e) => {
                                            updateConfig('spss', 'answerCodes', false);
                                            updateConfig('spss', 'answerValues', true);
                                        }}
                                    />
                                    Answer Values
                                </label>
                            </div>

                            <h3>Options</h3>
                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.legacyExport}
                                        onChange={(e) => updateConfig('spss', 'legacyExport', e.target.checked)}
                                    />
                                    Legacy Export
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.questionCodeVariableName}
                                        onChange={(e) => updateConfig('spss', 'questionCodeVariableName', e.target.checked)}
                                    />
                                    Question code variable name
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.questionCodeInsteadOfText}
                                        onChange={(e) => updateConfig('spss', 'questionCodeInsteadOfText', e.target.checked)}
                                    />
                                    Question code instead of text
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.showNotDisplayed}
                                        onChange={(e) => updateConfig('spss', 'showNotDisplayed', e.target.checked)}
                                    />
                                    Show Question Not Displayed
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.reportLabels}
                                        onChange={(e) => updateConfig('spss', 'reportLabels', e.target.checked)}
                                    />
                                    Report labels
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.includeOpenEnded}
                                        onChange={(e) => updateConfig('spss', 'includeOpenEnded', e.target.checked)}
                                    />
                                    Open-ended text data
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.spss.geocode}
                                        onChange={(e) => updateConfig('spss', 'geocode', e.target.checked)}
                                    />
                                    Geo code & additional info
                                </label>
                            </div>
                        </div>
                    )}

                    {/* SQL Export */}
                    {activeTab === 'sql' && (
                        <div className="export-section">
                            <h3>Options</h3>
                            <div className="checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.sql.includeScores}
                                        onChange={(e) => updateConfig('sql', 'includeScores', e.target.checked)}
                                    />
                                    Include Score data
                                </label>
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={exportConfig.sql.includeTimestamps}
                                        onChange={(e) => updateConfig('sql', 'includeTimestamps', e.target.checked)}
                                    />
                                    Include Timestamp data
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Data Filters (Common to all) */}
                    <div className="export-section">
                        <h3>Data Filters</h3>
                        <div className="filter-group">
                            <label>
                                Dataset:
                                <select
                                    value={exportConfig.filters.dataset}
                                    onChange={(e) => updateFilter('dataset', e.target.value)}
                                >
                                    <option value="entire">--Entire Dataset--</option>
                                    <option value="custom">Response Status & Date</option>
                                </select>
                            </label>

                            {exportConfig.filters.dataset === 'custom' && (
                                <>
                                    <div className="date-range">
                                        <label>
                                            Start Date:
                                            <input
                                                type="date"
                                                value={exportConfig.filters.dateRange.start}
                                                onChange={(e) => updateFilter('dateRange', {
                                                    ...exportConfig.filters.dateRange,
                                                    start: e.target.value
                                                })}
                                            />
                                        </label>
                                        <label>
                                            End Date:
                                            <input
                                                type="date"
                                                value={exportConfig.filters.dateRange.end}
                                                onChange={(e) => updateFilter('dateRange', {
                                                    ...exportConfig.filters.dateRange,
                                                    end: e.target.value
                                                })}
                                            />
                                        </label>
                                    </div>
                                    <label>
                                        Response Status:
                                        <select
                                            value={exportConfig.filters.status}
                                            onChange={(e) => updateFilter('status', e.target.value)}
                                        >
                                            <option value="">-- Select --</option>
                                            <option value="partial">Started But Not Completed</option>
                                            <option value="completed">Completed</option>
                                            <option value="terminated">Terminates</option>
                                        </select>
                                    </label>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="export-modal-footer">
                    {exportStatus && (
                        <div className={`export-status ${exportStatus.type}`}>
                            {exportStatus.message}
                        </div>
                    )}

                    <div className="export-actions">
                        <button
                            className="btn-secondary"
                            onClick={onClose}
                            disabled={isExporting}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn-primary"
                            onClick={handleExport}
                            disabled={isExporting}
                        >
                            {isExporting ? 'Exporting...' : 'Export'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExportModal;
