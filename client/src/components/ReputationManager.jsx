import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, RefreshCw, MessageCircle, MapPin, ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from './common/Toast';

export default function ReputationManager() {
    const toast = useToast();
    const [sources, setSources] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [benchmarks, setBenchmarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Reply State
    const [replyingTo, setReplyingTo] = useState(null); // Review ID
    const [generatedReply, setGeneratedReply] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [srcRes, revRes, benchRes] = await Promise.all([
                axios.get('/api/reputation/sources'),
                axios.get('/api/reputation/reviews'),
                axios.get('/api/reputation/benchmarks')
            ]);
            setSources(srcRes.data);
            setReviews(revRes.data);
            setBenchmarks(benchRes.data);
            setLoading(false);
        } catch (e) {
            console.error(e);
            setLoading(false);
        }
    };

    const handleSync = async (id) => {
        setSyncing(true);
        await axios.post('/api/reputation/sync', { sourceId: id });
        toast.info("Sync started! New reviews will appear shortly.");
        setSyncing(false);
    };

    const handleGenerateReply = async (review) => {
        setReplyingTo(review.id);
        setIsGenerating(true);
        setGeneratedReply('');
        try {
            const res = await axios.post('/api/reputation/generate-reply', {
                reviewContent: review.content,
                rating: review.rating,
                author: review.author
            });
            setGeneratedReply(res.data.reply);
        } catch (e) {
            toast.error("AI Failed");
        }
        setIsGenerating(false);
    };

    const getSentimentColor = (score) => {
        if (score > 0.5) return '#dcfce7'; // Green
        if (score < -0.5) return '#fee2e2'; // Red
        return '#f1f5f9'; // Grey
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', margin: 0 }}>Reputation Management</h1>
                    <p style={{ color: '#64748b', marginTop: '8px' }}>Monitor and analyze public reviews from across the web.</p>
                </div>
            </div>

            {/* SOURCES CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {sources.map(src => (
                    <div key={src.id} style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1em', marginBottom: '4px' }}>{src.platform}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9em' }}>{src.name}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px' }}>
                                <Star size={16} fill="#facc15" color="#facc15" />
                                <span style={{ fontWeight: 'bold' }}>{src.avg_rating}</span>
                                <span style={{ color: '#94a3b8' }}>({src.review_count})</span>
                            </div>
                        </div>
                        <button
                            disabled={syncing}
                            onClick={() => handleSync(src.id)}
                            style={{ padding: '10px', borderRadius: '50%', border: '1px solid #cbd5e1', background: 'transparent', cursor: 'pointer' }}
                            title="Sync Now"
                        >
                            <RefreshCw size={20} className={syncing ? 'spin' : ''} />
                        </button>
                    </div>
                ))}
            </div>

            {/* BENCHMARKS WIDGET */}
            <h2 style={{ marginBottom: '20px' }}>Competitive Landscape</h2>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', marginBottom: '40px' }}>
                {benchmarks.map((b, i) => (
                    <div key={i} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontWeight: b.name === 'Your Business' ? 'bold' : 'normal' }}>{b.name}</span>
                            <span style={{ fontWeight: 'bold' }}>{b.score} <span style={{ fontSize: '0.8em', color: b.trend > 0 ? 'green' : 'red' }}>({b.trend > 0 ? '+' : ''}{b.trend})</span></span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${(b.score / 5) * 100}%`, height: '100%', background: b.name === 'Your Business' ? '#3b82f6' : '#cbd5e1' }}></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* REVIEWS STREAM */}
            <h2 style={{ marginBottom: '20px' }}>Review Stream (AI Analyzed)</h2>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                {reviews.map((rev, i) => (
                    <div key={i} style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '20px' }}>

                        {/* Sentiment Indicator */}
                        <div style={{
                            width: '4px', borderRadius: '2px',
                            background: rev.sentiment === 'Positive' ? '#22c55e' : (rev.sentiment === 'Negative' ? '#ef4444' : '#94a3b8')
                        }}></div>

                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{rev.author}</span>
                                    <span style={{ fontSize: '0.85em', color: '#64748b' }}>via {rev.source}</span>
                                    <div style={{ display: 'flex' }}>
                                        {[...Array(5)].map((_, si) => (
                                            <Star key={si} size={12} fill={si < rev.rating ? "#facc15" : "#e2e8f0"} color="none" />
                                        ))}
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.85em', color: '#94a3b8' }}>{rev.date}</span>
                            </div>

                            <p style={{ margin: '0 0 12px 0', color: '#334155', lineHeight: '1.5' }}>{rev.content}</p>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {/* AI Tags */}
                                {rev.tags && rev.tags.map(t => (
                                    <span key={t} style={{ fontSize: '0.75em', padding: '2px 8px', background: '#f1f5f9', borderRadius: '12px', color: '#475569', fontWeight: '500' }}>#{t}</span>
                                ))}

                                {/* AI Sentiment Badge */}
                                <span style={{
                                    fontSize: '0.75em', padding: '2px 8px', borderRadius: '12px', fontWeight: '600',
                                    background: getSentimentColor(rev.sentiment_score),
                                    color: rev.sentiment === 'Positive' ? '#14532d' : (rev.sentiment === 'Negative' ? '#7f1d1d' : '#334155')
                                }}>
                                    {rev.sentiment === 'Positive' && <ThumbsUp size={12} style={{ marginRight: '4px', verticalAlign: 'text-top' }} />}
                                    {rev.sentiment === 'Negative' && <ThumbsDown size={12} style={{ marginRight: '4px', verticalAlign: 'text-top' }} />}
                                    AI: {rev.sentiment}
                                </span>
                            </div>

                            {/* SMART REPLY ACTION */}
                            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f8fafc' }}>
                                {replyingTo === rev.id ? (
                                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#6366f1' }}>✨ AI Draft</span>
                                            <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8em', color: '#94a3b8' }}>Cancel</button>
                                        </div>
                                        {isGenerating ? <div style={{ color: '#64748b', fontSize: '0.9em' }}>Thinking...</div> : (
                                            <>
                                                <textarea
                                                    value={generatedReply}
                                                    onChange={e => setGeneratedReply(e.target.value)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '10px', minHeight: '80px' }}
                                                />
                                                <button onClick={() => { toast.success("Reply Posted!"); setReplyingTo(null); }} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    Post Reply
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleGenerateReply(rev)}
                                        style={{ background: 'transparent', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85em', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <MessageCircle size={14} /> Reply with AI
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
