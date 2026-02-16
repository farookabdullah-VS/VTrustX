/**
 * ExportModal - Modal for exporting reports to PDF/PowerPoint
 *
 * Features:
 * - Format selection (PDF, PowerPoint)
 * - Export options configuration
 * - Progress indication
 * - Download link generation
 */

import React, { useState } from 'react';
import axios from 'axios';
import { X, FileText, Presentation, Download, Loader } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

export function ExportModal({ report, onClose }) {
  const [format, setFormat] = useState('pdf');
  const [options, setOptions] = useState({
    orientation: 'landscape',
    includeCharts: true,
    includeData: false
  });
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setExportResult(null);

    try {
      const endpoint = format === 'pdf'
        ? `/api/analytics/reports/${report.id}/export/pdf`
        : `/api/analytics/reports/${report.id}/export/pptx`;

      const response = await axios.post(endpoint, options);

      setExportResult(response.data);
    } catch (err) {
      console.error('Export failed:', err);
      setError(err.response?.data?.error || 'Failed to export report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = () => {
    if (exportResult?.fileUrl) {
      window.open(exportResult.fileUrl, '_blank');
    }
  };

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 id="export-modal-title" className={styles.modalTitle}>
            Export Report
          </h2>
          <button
            onClick={onClose}
            className={styles.iconButton}
            aria-label="Close export dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {!exportResult ? (
            <>
              {/* Format Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#334155',
                  marginBottom: '12px'
                }}>
                  Export Format
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* PDF Option */}
                  <button
                    onClick={() => setFormat('pdf')}
                    style={{
                      padding: '16px',
                      border: `2px solid ${format === 'pdf' ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      background: format === 'pdf' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <FileText
                      size={32}
                      color={format === 'pdf' ? '#2563eb' : '#94a3b8'}
                      style={{ margin: '0 auto 8px' }}
                    />
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: format === 'pdf' ? '#2563eb' : '#64748b'
                    }}>
                      PDF Document
                    </div>
                  </button>

                  {/* PowerPoint Option */}
                  <button
                    onClick={() => setFormat('pptx')}
                    style={{
                      padding: '16px',
                      border: `2px solid ${format === 'pptx' ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      background: format === 'pptx' ? '#eff6ff' : 'white',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Presentation
                      size={32}
                      color={format === 'pptx' ? '#2563eb' : '#94a3b8'}
                      style={{ margin: '0 auto 8px' }}
                    />
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: format === 'pptx' ? '#2563eb' : '#64748b'
                    }}>
                      PowerPoint
                    </div>
                  </button>
                </div>
              </div>

              {/* PDF Options */}
              {format === 'pdf' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: '#334155',
                    marginBottom: '12px'
                  }}>
                    PDF Options
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Orientation */}
                    <div>
                      <label style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Orientation
                      </label>
                      <select
                        value={options.orientation}
                        onChange={(e) => setOptions({ ...options, orientation: e.target.value })}
                        className={styles.input}
                        style={{ marginTop: '4px' }}
                      >
                        <option value="landscape">Landscape</option>
                        <option value="portrait">Portrait</option>
                      </select>
                    </div>

                    {/* Include Charts */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#475569',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={options.includeCharts}
                        onChange={(e) => setOptions({ ...options, includeCharts: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      Include charts and visualizations
                    </label>

                    {/* Include Data */}
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.875rem',
                      color: '#475569',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={options.includeData}
                        onChange={(e) => setOptions({ ...options, includeData: e.target.checked })}
                        style={{ width: '16px', height: '16px' }}
                      />
                      Include raw data tables
                    </label>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  marginBottom: '16px'
                }}>
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: '#dcfce7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <Download size={32} color="#16a34a" />
              </div>

              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1e293b',
                marginBottom: '8px'
              }}>
                Export Ready!
              </h3>

              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
                Your report has been exported successfully.
              </p>

              <div style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                fontSize: '0.875rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b' }}>File size:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    {(exportResult.size / 1024).toFixed(2)} KB
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Expires:</span>
                  <span style={{ fontWeight: '600', color: '#1e293b' }}>
                    {new Date(exportResult.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleDownload}
                className={`${styles.button} ${styles.buttonPrimary}`}
                style={{ width: '100%' }}
              >
                <Download size={16} style={{ marginRight: '8px' }} />
                Download Report
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!exportResult && (
          <div className={styles.modalFooter}>
            <button
              onClick={onClose}
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={exporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={exporting}
              style={{ minWidth: '120px' }}
            >
              {exporting ? (
                <>
                  <Loader size={16} style={{ marginRight: '8px', animation: 'spin 1s linear infinite' }} />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Export
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportModal;
