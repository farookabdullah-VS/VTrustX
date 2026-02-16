import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { CheckCircle } from 'lucide-react';
import styles from '../styles/Analytics.module.css';

/**
 * AnomalyWidget - Anomaly Detection
 * Uses statistical methods to detect unusual patterns in time-series data
 */
export function AnomalyWidget({ surveyId, targetMetric }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !targetMetric) return;

        setLoading(true);
        axios.post('/api/analytics/anomalies', { surveyId, targetMetric })
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, targetMetric]);

    if (!targetMetric) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>Select a metric to watch.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingText}>Scanning for Anomalies...</div>
            </div>
        );
    }

    if (!data || data.status === 'insufficient_data') {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                    Need at least 10 days of data.
                </div>
            </div>
        );
    }

    const hasAnomalies = data.anomalies.length > 0;

    return (
        <div style={{
            padding: '15px',
            height: '100%',
            overflowY: 'auto'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '1px solid #e2e8f0'
            }}>
                <div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                    }}>
                        Baseline (60 Days)
                    </div>
                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: 'bold'
                    }}>
                        {parseFloat(data.mean).toFixed(1)}{' '}
                        <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 'normal',
                            color: '#94a3b8'
                        }}>
                            ± {parseFloat(data.stdDev).toFixed(1)}
                        </span>
                    </div>
                </div>
                {!hasAnomalies && (
                    <div style={{
                        color: '#16a34a',
                        fontWeight: '600',
                        fontSize: '0.85rem'
                    }}>
                        All Clear
                    </div>
                )}
                {hasAnomalies && (
                    <div style={{
                        color: '#dc2626',
                        fontWeight: '600',
                        fontSize: '0.85rem'
                    }}>
                        {data.anomalies.length} ALERTS
                    </div>
                )}
            </div>

            {data.anomalies.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    marginTop: '40px',
                    color: '#cbd5e1'
                }}>
                    <CheckCircle size={48} style={{ marginBottom: '10px' }} />
                    <p>No statistical anomalies detected in the last 7 days.</p>
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                }}>
                    {data.anomalies.map((a, i) => (
                        <div key={i} style={{
                            background: '#fef2f2',
                            borderLeft: '4px solid #dc2626',
                            padding: '12px',
                            borderRadius: '4px'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '4px'
                            }}>
                                <span style={{
                                    fontWeight: 'bold',
                                    color: '#991b1b',
                                    fontSize: '0.85rem'
                                }}>
                                    {a.type === 'spike' ? '📈 Spike Detected' : '📉 Drop Detected'}
                                </span>
                                <span style={{
                                    fontSize: '0.75rem',
                                    color: '#ef4444'
                                }}>
                                    {a.date}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '0.9rem',
                                color: '#b91c1c',
                                marginBottom: '4px'
                            }}>
                                Value: {a.value}
                            </div>
                            <div style={{
                                fontSize: '0.8rem',
                                color: '#7f1d1d'
                            }}>
                                {a.message}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

AnomalyWidget.propTypes = {
    surveyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    targetMetric: PropTypes.string
};

export default AnomalyWidget;
