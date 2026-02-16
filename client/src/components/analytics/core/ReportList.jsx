import React, { useState, useEffect } from 'react';
import { Plus, Database, Share2, BarChart2, Trash2, Globe, Link as LinkIcon } from 'lucide-react';
import { getReports, deleteReport } from '../../../services/reportService';
import { useToast } from '../../common/Toast';
import styles from '../styles/Analytics.module.css';

/**
 * ReportCard - Individual report card component
 */
function ReportCard({ report, onOpen, onDelete, isPublic }) {
  const toast = useToast();

  const handleCopyLink = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/report/${report.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public link copied!");
  };

  return (
    <div
      onClick={() => onOpen(report)}
      className={styles.reportCard}
      style={{
        border: isPublic ? '1px solid #10b981' : undefined,
        position: 'relative'
      }}
    >
      {/* Public Badge */}
      {isPublic && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: '#10b981',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '700',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <Globe size={10} /> PUBLIC
        </div>
      )}

      {/* Thumbnail/Logo */}
      <div style={{
        height: '140px',
        background: isPublic ? '#f0fdf4' : '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}>
        {report.theme?.logo ? (
          <img
            src={report.theme.logo}
            alt={`${report.title} logo`}
            style={{ maxHeight: '100%', maxWidth: '100%' }}
          />
        ) : (
          <BarChart2
            size={48}
            color={isPublic ? '#10b981' : '#cbd5e1'}
            style={{ opacity: 0.5 }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        <div className={styles.reportCardHeader}>
          <h4 className={styles.reportCardTitle}>{report.title}</h4>

          <div className={styles.reportCardActions}>
            {isPublic && (
              <button
                onClick={handleCopyLink}
                className={styles.iconButton}
                style={{ color: '#10b981' }}
                title="Copy Public Link"
                aria-label="Copy public link"
              >
                <LinkIcon size={16} />
              </button>
            )}
            <button
              onClick={(e) => onDelete(e, report.id)}
              className={styles.iconButton}
              style={{ color: '#ef4444' }}
              title="Delete Report"
              aria-label="Delete report"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className={styles.reportCardMeta}>
          <span>Survey ID: {report.description || report.surveyId}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * ReportList - Main report listing component
 */
export function ReportList({ onOpenReport, onCreateReport }) {
  const toast = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getReports();
      setReports(data || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await deleteReport(id);
        toast.success('Report deleted successfully');
        loadReports();
      } catch (err) {
        console.error('Failed to delete report:', err);
        toast.error('Failed to delete report');
      }
    }
  };

  const privateReports = reports.filter(r => !r.is_published);
  const publicReports = reports.filter(r => r.is_published);

  return (
    <div className={styles.mainContent}>
      {/* Header */}
      <div className={styles.flexBetween} style={{ marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1e293b', marginBottom: '10px' }}>
            Analytics Studio
          </h1>
          <p style={{ color: '#64748b' }}>
            Create, design, and analyze survey-based reports.
          </p>
        </div>
        <button
          onClick={onCreateReport}
          className={`${styles.button} ${styles.buttonPrimary} ${styles.buttonLarge}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          aria-label="Create new report"
        >
          <Plus size={20} /> New Report
        </button>
      </div>

      {/* Your Reports Section */}
      <h3 style={{
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '10px',
        marginBottom: '20px',
        color: '#334155',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <Database size={18} /> Your Reports
      </h3>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <div>Loading reports...</div>
        </div>
      ) : (
        <>
          {privateReports.length > 0 ? (
            <div className={styles.reportGrid}>
              {privateReports.map(report => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onOpen={onOpenReport}
                  onDelete={handleDelete}
                  isPublic={false}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <BarChart2 size={64} />
              </div>
              <div className={styles.emptyStateText}>
                No reports found. Create your first report to get started!
              </div>
            </div>
          )}
        </>
      )}

      {/* Public/Published Reports Section */}
      {publicReports.length > 0 && (
        <>
          <h3 style={{
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '10px',
            marginTop: '40px',
            marginBottom: '20px',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Share2 size={18} /> Publicly Shared / Published
          </h3>

          <div className={styles.reportGrid}>
            {publicReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onOpen={onOpenReport}
                onDelete={handleDelete}
                isPublic={true}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ReportList;
