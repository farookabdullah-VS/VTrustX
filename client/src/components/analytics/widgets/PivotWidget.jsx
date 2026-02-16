import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from '../styles/Analytics.module.css';

/**
 * PivotWidget - Pivot Table / Cross-tabulation
 * Creates a pivot table with configurable row/column dimensions
 */
export function PivotWidget({ surveyId, rowField, colField, valueField, operation }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !rowField || !colField) return;

        setLoading(true);
        axios.post('/api/analytics/cross-tab', {
            surveyId,
            rowField,
            colField,
            valueField,
            operation
        })
            .then(res => {
                setData(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, rowField, colField, valueField, operation]);

    if (!rowField || !colField) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>Configure rows and columns.</div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingText}>Calculating Pivot...</div>
            </div>
        );
    }

    if (!data || !data.rows || !data.rows.length) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>No data.</div>
            </div>
        );
    }

    return (
        <div style={{
            padding: '10px',
            height: '100%',
            overflow: 'auto'
        }}>
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.85rem'
            }}>
                <thead>
                    <tr>
                        <th style={{
                            padding: '8px',
                            borderBottom: '2px solid #e2e8f0',
                            textAlign: 'left',
                            background: '#f8fafc',
                            position: 'sticky',
                            top: 0
                        }}>
                            {rowField} / {colField}
                        </th>
                        {data.cols.map(c => (
                            <th key={c} style={{
                                padding: '8px',
                                borderBottom: '2px solid #e2e8f0',
                                textAlign: 'right',
                                background: '#f8fafc',
                                position: 'sticky',
                                top: 0
                            }}>
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.rows.map(r => {
                        const rowData = data.data.find(d => d.name === r) || {};
                        return (
                            <tr key={r}>
                                <td style={{
                                    padding: '8px',
                                    borderBottom: '1px solid #f1f5f9',
                                    fontWeight: '500',
                                    color: '#475569'
                                }}>
                                    {r}
                                </td>
                                {data.cols.map(c => (
                                    <td key={c} style={{
                                        padding: '8px',
                                        borderBottom: '1px solid #f1f5f9',
                                        textAlign: 'right',
                                        color: '#1e293b'
                                    }}>
                                        {rowData[c] || 0}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

PivotWidget.propTypes = {
    surveyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    rowField: PropTypes.string,
    colField: PropTypes.string,
    valueField: PropTypes.string,
    operation: PropTypes.string
};

export default PivotWidget;
