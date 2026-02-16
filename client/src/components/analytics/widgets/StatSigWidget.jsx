import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from '../styles/Analytics.module.css';

/**
 * StatSigWidget - Statistical Significance Testing
 * Performs Z-test to determine if NPS changes are statistically significant
 */
export function StatSigWidget({ surveyId }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId) return;
        setLoading(true);
        axios.post('/api/analytics/nps-significance', { surveyId })
            .then(res => {
                setStats(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId]);

    if (!surveyId) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>Bind report to survey first.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingText}>Running Z-Test...</div>
            </div>
        );
    }

    if (!stats || stats.status === 'insufficient_data') {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                    Insufficient data for significance testing.
                </div>
            </div>
        );
    }

    const isGood = stats.verdict.includes('Improvement');
    const isBad = stats.verdict.includes('Decline');

    return (
        <div style={{
            padding: '20px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
        }}>
            <div style={{
                fontSize: '1rem',
                fontWeight: 'bold',
                color: isGood ? '#16a34a' : (isBad ? '#dc2626' : '#64748b'),
                marginBottom: '8px'
            }}>
                {stats.verdict}
            </div>
            <div style={{
                fontSize: '0.8rem',
                color: '#94a3b8',
                marginBottom: '15px'
            }}>
                95% Confidence Level
            </div>

            <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'baseline'
            }}>
                <div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#1e293b'
                    }}>
                        {stats.currentNPS}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                    }}>
                        Current Month
                    </div>
                </div>
                <div style={{
                    fontSize: '1rem',
                    color: '#cbd5e1'
                }}>
                    vs
                </div>
                <div>
                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: '600',
                        color: '#94a3b8'
                    }}>
                        {stats.previousNPS}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#64748b'
                    }}>
                        Previous Month
                    </div>
                </div>
            </div>
        </div>
    );
}

StatSigWidget.propTypes = {
    surveyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
};

export default StatSigWidget;
