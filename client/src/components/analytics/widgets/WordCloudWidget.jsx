import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from '../styles/Analytics.module.css';

/**
 * WordCloudWidget - Text Analytics Word Cloud
 * Displays word frequency analysis with sentiment coloring
 */
export function WordCloudWidget({
    surveyId,
    textField,
    sentimentMetric,
    onFilterChange,
    textFieldName
}) {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!surveyId || !textField) return;

        setLoading(true);
        axios.post('/api/analytics/text-analytics', { surveyId, textField, sentimentMetric })
            .then(res => {
                if (res.data.words) setWords(res.data.words);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [surveyId, textField, sentimentMetric]);

    if (!textField) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>
                    Select a text field to analyze.
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.loadingState}>
                <div className={styles.loadingText}>Analyzing Text...</div>
            </div>
        );
    }

    if (words.length === 0) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>No data found.</div>
            </div>
        );
    }

    // Normalize sizes
    const maxVal = Math.max(...words.map(w => w.value));
    const minVal = Math.min(...words.map(w => w.value));

    return (
        <div style={{
            padding: '10px',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        }}>
            {words.map((w, i) => {
                const size = 12 + ((w.value - minVal) / (maxVal - minVal || 1)) * 24; // 12px to 36px

                // Color by sentiment if available (0-10 scale assumed)
                let color = '#64748b';
                if (w.sentiment) {
                    const s = parseFloat(w.sentiment);
                    if (s > 8) color = '#16a34a'; // Green (positive)
                    else if (s < 6) color = '#dc2626'; // Red (negative)
                    else color = '#d97706'; // Orange (neutral)
                }

                return (
                    <span
                        key={i}
                        onClick={() => onFilterChange && onFilterChange(textFieldName, [w.text])}
                        style={{
                            fontSize: `${size}px`,
                            color: color,
                            cursor: onFilterChange ? 'pointer' : 'default',
                            padding: '4px',
                            transition: 'all 0.2s',
                            userSelect: 'none'
                        }}
                        onMouseEnter={e => {
                            if (onFilterChange) {
                                e.currentTarget.style.opacity = '0.7';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.opacity = '1';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title={`Frequency: ${w.value}, Sentiment: ${w.sentiment || 'N/A'}`}
                        role={onFilterChange ? 'button' : 'text'}
                        tabIndex={onFilterChange ? 0 : -1}
                        onKeyDown={(e) => {
                            if (onFilterChange && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                onFilterChange(textFieldName, [w.text]);
                            }
                        }}
                    >
                        {w.text}
                    </span>
                );
            })}
        </div>
    );
}

WordCloudWidget.propTypes = {
    surveyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    textField: PropTypes.string,
    sentimentMetric: PropTypes.string,
    onFilterChange: PropTypes.func,
    textFieldName: PropTypes.string
};

export default WordCloudWidget;
