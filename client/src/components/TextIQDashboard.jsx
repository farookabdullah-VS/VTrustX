import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, RefreshCw, BarChart2 } from 'lucide-react';

export function TextIQDashboard() {
    const [topics, setTopics] = useState([]);
    const [verbatims, setVerbatims] = useState([]);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTopics();
    }, []);

    const loadTopics = async () => {
        try {
            const res = await axios.get('/api/textiq/topics');
            setTopics(res.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const loadVerbatims = async (topic) => {
        setSelectedTopic(topic);
        try {
            const res = await axios.get(`/api/textiq/verbatims?topic=${encodeURIComponent(topic)}`);
            setVerbatims(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    // Helper calculate bubble color/size
    const getBubbleStyle = (t) => {
        const minSize = 80;
        const size = Math.min(200, minSize + (t.count / 2)); // Scale size
        let bg = '#f1f5f9';
        if (t.sentiment > 0.3) bg = '#dcfce7'; // Green
        else if (t.sentiment < -0.3) bg = '#fee2e2'; // Red

        return {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            background: bg,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            border: selectedTopic === t.topic ? '3px solid #6366f1' : '1px solid #cbd5e1',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '10px',
            textAlign: 'center'
        };
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>CogniVue</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>AI-powered Text Analytics</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '30px', height: '600px' }}>

                {/* LEFT: BUBBLE CHART */}
                <div style={{ flex: 2, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', position: 'relative' }}>
                    <h3 style={{ margin: '0 0 24px 0', color: '#334155' }}>Topic Landscape</h3>
                    {loading && <div>Loading AI Models...</div>}

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', alignItems: 'center', height: '90%', overflow: 'auto' }}>
                        {topics.map(t => (
                            <div
                                key={t.id}
                                style={getBubbleStyle(t)}
                                onClick={() => loadVerbatims(t.topic)}
                            >
                                <div style={{ fontWeight: '700', fontSize: '1em', color: '#1e293b' }}>{t.topic}</div>
                                <div style={{ fontSize: '0.85em', color: '#64748b' }}>{t.count} mentions</div>
                                <div style={{ fontSize: '0.8em', fontWeight: 'bold', marginTop: '4px', color: t.sentiment > 0 ? '#15803d' : '#b91c1c' }}>
                                    {(t.sentiment * 100).toFixed(0)} Sentiment
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: DRILLDOWN */}
                <div style={{ flex: 1, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 16px 0', color: '#334155' }}>
                        {selectedTopic ? `Comments: ${selectedTopic}` : 'Select a topic to view comments'}
                    </h3>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {!selectedTopic && <div style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>Click a bubble to see what people are saying.</div>}

                        {verbatims.map(v => (
                            <div key={v.id} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                                <p style={{ margin: '0 0 8px 0', color: '#334155', fontStyle: 'italic' }}>"{v.text}"</p>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: '0.75em', padding: '2px 8px', borderRadius: '4px', fontWeight: '600',
                                        background: v.sentiment > 0 ? '#dcfce7' : '#fee2e2',
                                        color: v.sentiment > 0 ? '#15803d' : '#b91c1c'
                                    }}>
                                        Sentiment: {v.sentiment}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
