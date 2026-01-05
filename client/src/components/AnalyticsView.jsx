import React, { useEffect, useState } from 'react';
import { VisualizationPanel } from 'survey-analytics';
import 'plotly.js-dist-min';
import 'survey-analytics/survey.analytics.min.css';
import axios from 'axios';
import { Model } from 'survey-core';

export function AnalyticsView({ form, onBack }) {
    const [loading, setLoading] = useState(true);
    const [hasData, setHasData] = useState(false);

    useEffect(() => {
        if (!form) return;

        // Fetch submissions
        axios.get(`/api/submissions?formId=${form.id}`)
            .then(res => {
                const submissions = res.data;
                if (submissions.length === 0) {
                    setLoading(false);
                    return;
                }

                setHasData(true);
                const data = submissions.map(s => s.data);
                const survey = new Model(form.definition);

                // Initialize Analytics
                const vizPanel = new VisualizationPanel(
                    survey.getAllQuestions(),
                    data,
                    {
                        allowHideQuestions: false,
                        labelTruncateLength: 27
                    }
                );

                vizPanel.showHeader = true;
                vizPanel.render("summaryContainer");
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load analytics data", err);
                setLoading(false);
            });
    }, [form]);

    return (
        <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <button onClick={onBack} style={{ marginBottom: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1em' }}>
                ⬅ Back to Builder
            </button>

            <div style={{ marginBottom: '30px' }}>
                <h1 style={{ fontSize: '2em', marginBottom: '8px', color: '#1e293b' }}>Analytics: {form?.title}</h1>
                <p style={{ color: '#64748b' }}>Visualizing results from collected submissions.</p>
            </div>

            {loading && <div>Loading analytics...</div>}

            {!loading && !hasData && (
                <div style={{ textAlign: 'center', padding: '60px', background: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    <h3>No responses yet</h3>
                    <p>Share your survey to start collecting data.</p>
                </div>
            )}

            <div id="summaryContainer" style={{ background: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '500px' }}></div>
        </div>
    );
}
