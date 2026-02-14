import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { Shield, Save, AlertTriangle, Info, Trash2, Calendar, Database } from 'lucide-react';
import './RetentionPolicySettings.css';

function RetentionPolicySettings() {
    const [policy, setPolicy] = useState({
        retention_days: 90,
        critical_retention_days: 365,
        auto_archive: false,
        archive_storage_path: '',
        isDefault: true
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [cleanupResult, setCleanupResult] = useState(null);

    useEffect(() => {
        fetchPolicy();
    }, []);

    const fetchPolicy = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get('/api/audit-logs/retention-policy');
            setPolicy(response.data);
        } catch (err) {
            console.error('Failed to fetch retention policy:', err);
            setError('Failed to load retention policy');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const updateData = {
                retention_days: parseInt(policy.retention_days),
                critical_retention_days: parseInt(policy.critical_retention_days),
                auto_archive: policy.auto_archive,
                archive_storage_path: policy.archive_storage_path || null
            };

            await axios.put('/api/audit-logs/retention-policy', updateData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            await fetchPolicy();
        } catch (err) {
            console.error('Failed to save retention policy:', err);
            setError(err.response?.data?.error || 'Failed to save retention policy');
        } finally {
            setSaving(false);
        }
    };

    const handleCleanup = async () => {
        if (!window.confirm('Are you sure you want to manually trigger cleanup? This will permanently delete old audit logs according to the retention policy.')) {
            return;
        }

        try {
            setCleanupResult(null);
            const response = await axios.post('/api/audit-logs/cleanup');
            setCleanupResult(response.data);
        } catch (err) {
            console.error('Cleanup failed:', err);
            setError(err.response?.data?.error || 'Failed to trigger cleanup');
        }
    };

    const handleChange = (field, value) => {
        setPolicy(prev => ({ ...prev, [field]: value }));
    };

    const calculateStorageEstimate = () => {
        const avgLogSize = 1.5; // KB
        const logsPerDay = 1000; // Estimate
        const totalDays = Math.max(policy.retention_days, policy.critical_retention_days);
        const estimatedSize = (avgLogSize * logsPerDay * totalDays) / 1024; // MB
        return estimatedSize.toFixed(1);
    };

    if (loading) {
        return (
            <div className="retention-policy-settings">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading retention policy...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="retention-policy-settings">
            <div className="settings-header">
                <div className="header-left">
                    <Shield size={24} />
                    <div>
                        <h1>Audit Log Retention Policy</h1>
                        <p>Configure how long audit logs are retained before automatic deletion</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    <Info size={16} />
                    <span>Retention policy updated successfully</span>
                </div>
            )}

            <form onSubmit={handleSave} className="policy-form">
                <div className="form-section">
                    <h2>Retention Periods</h2>
                    <p className="section-description">
                        Define how long different types of audit logs should be retained
                    </p>

                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="retention_days">
                                <Calendar size={16} />
                                Standard Retention (days)
                            </label>
                            <input
                                type="number"
                                id="retention_days"
                                min="0"
                                max="3650"
                                value={policy.retention_days}
                                onChange={(e) => handleChange('retention_days', e.target.value)}
                                required
                            />
                            <span className="field-help">
                                Logs with info/warning severity will be deleted after this many days (0 = keep forever)
                            </span>
                        </div>

                        <div className="form-group">
                            <label htmlFor="critical_retention_days">
                                <AlertTriangle size={16} />
                                Critical Retention (days)
                            </label>
                            <input
                                type="number"
                                id="critical_retention_days"
                                min="0"
                                max="3650"
                                value={policy.critical_retention_days}
                                onChange={(e) => handleChange('critical_retention_days', e.target.value)}
                                required
                            />
                            <span className="field-help">
                                Critical severity logs will be retained longer for compliance
                            </span>
                        </div>
                    </div>

                    <div className="retention-preview">
                        <div className="preview-item">
                            <div className="preview-label">Standard Logs</div>
                            <div className="preview-value">
                                {policy.retention_days === '0' ? 'Forever' : `${policy.retention_days} days`}
                            </div>
                        </div>
                        <div className="preview-item">
                            <div className="preview-label">Critical Logs</div>
                            <div className="preview-value">
                                {policy.critical_retention_days === '0' ? 'Forever' : `${policy.critical_retention_days} days`}
                            </div>
                        </div>
                        <div className="preview-item">
                            <div className="preview-label">Est. Storage</div>
                            <div className="preview-value">{calculateStorageEstimate()} MB</div>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2>Archive Settings</h2>
                    <p className="section-description">
                        Configure automatic archiving of old logs before deletion
                    </p>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={policy.auto_archive}
                                onChange={(e) => handleChange('auto_archive', e.target.checked)}
                            />
                            <span>Enable automatic archiving</span>
                        </label>
                        <span className="field-help">
                            Archive logs to external storage before deletion for long-term compliance
                        </span>
                    </div>

                    {policy.auto_archive && (
                        <div className="form-group">
                            <label htmlFor="archive_storage_path">
                                <Database size={16} />
                                Archive Storage Path
                            </label>
                            <input
                                type="text"
                                id="archive_storage_path"
                                placeholder="gs://bucket-name/audit-logs/"
                                value={policy.archive_storage_path}
                                onChange={(e) => handleChange('archive_storage_path', e.target.value)}
                            />
                            <span className="field-help">
                                GCS bucket path for archived logs (e.g., gs://my-bucket/audit-archives/)
                            </span>
                        </div>
                    )}
                </div>

                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn-save"
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? 'Saving...' : 'Save Policy'}
                    </button>
                </div>
            </form>

            <div className="cleanup-section">
                <div className="cleanup-header">
                    <div>
                        <h2>Manual Cleanup</h2>
                        <p>Trigger immediate cleanup of old audit logs based on current retention policy</p>
                    </div>
                    <button
                        className="btn-cleanup"
                        onClick={handleCleanup}
                    >
                        <Trash2 size={16} />
                        Run Cleanup
                    </button>
                </div>

                {cleanupResult && (
                    <div className="cleanup-result">
                        <Info size={16} />
                        <div>
                            <strong>Cleanup completed</strong>
                            <p>Deleted {cleanupResult.deletedCount} old audit log entries</p>
                        </div>
                    </div>
                )}

                <div className="cleanup-warning">
                    <AlertTriangle size={16} />
                    <div>
                        <strong>Warning:</strong> Cleanup is permanent and cannot be undone. Ensure your retention
                        policy is correct before running manual cleanup.
                    </div>
                </div>
            </div>

            <div className="info-section">
                <h2>Compliance Guidelines</h2>
                <div className="guidelines-grid">
                    <div className="guideline-item">
                        <strong>SOC 2</strong>
                        <p>Minimum 90 days retention recommended</p>
                    </div>
                    <div className="guideline-item">
                        <strong>GDPR</strong>
                        <p>Retain only as long as necessary for purpose</p>
                    </div>
                    <div className="guideline-item">
                        <strong>HIPAA</strong>
                        <p>Minimum 6 years (2190 days) for healthcare</p>
                    </div>
                    <div className="guideline-item">
                        <strong>ISO 27001</strong>
                        <p>12-month retention for security events</p>
                    </div>
                </div>
            </div>

            {policy.isDefault && (
                <div className="default-notice">
                    <Info size={16} />
                    <span>Currently using default retention policy. Save changes to create a custom policy.</span>
                </div>
            )}
        </div>
    );
}

export default RetentionPolicySettings;
