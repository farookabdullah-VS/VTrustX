import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from '../styles/Analytics.module.css';

/**
 * KeyDriverWidget - Key Driver Analysis
 * Shows correlation between questions and a target metric (e.g., NPS)
 */
export function KeyDriverWidget({ surveyId, targetMetric }) {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!surveyId || !targetMetric) return;

        setLoading(true);
        axios.post('/api/analytics/key-drivers', { surveyId, targetMetric })
            .then(res => {
                if (res.data.drivers) setDrivers(res.data.drivers);
                else if (res.data.error) setError(res.data.error);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Failed to load analysis");
                setLoading(false);
            });
    }, [surveyId, targetMetric]);

    if (!targetMetric) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                    Select a target metric (e.g., NPS) in settings.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingText}>Analyzing Correlations...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorState}>
                <div className={styles.errorText}>{error}</div>
            </div>
        );
    }

    if (drivers.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>No significant drivers found.</div>
            </div>
        );
    }

    return (
        <div style={{ padding: '10px', height: '100%', overflowY: 'auto' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '10px',
                fontSize: '0.75rem',
                fontWeight: '600',
                color: '#94a3b8',
                textTransform: 'uppercase'
            }}>
                <span>Driver (Question)</span>
                <span>Impact</span>
            </div>
            {drivers.map((d, i) => (
                <div key={i} style={{
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                fontSize: '0.85rem',
                                color: '#1e293b',
                                marginBottom: '4px',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}
                            title={d.key}
                        >
                            {d.key}
                        </div>
                        <div style={{
                            height: '6px',
                            background: '#f1f5f9',
                            borderRadius: '3px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.abs(d.correlation) * 100}%`,
                                background: d.correlation > 0 ? '#10b981' : '#ef4444',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

KeyDriverWidget.propTypes = {
    surveyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    targetMetric: PropTypes.string
};

export default KeyDriverWidget;
