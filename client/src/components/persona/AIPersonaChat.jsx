import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { X, Send, Loader2, MessageCircle, Sparkles, Download, RotateCcw, User, Bot } from 'lucide-react';

const STARTER_QUESTIONS = [
    "What frustrates you most about your current workflow?",
    "How do you typically discover new products or services?",
    "What would make you switch to a competitor?",
    "Describe your ideal user experience.",
    "What's your biggest challenge at work right now?",
    "How do you feel about our checkout process?",
];

export function AIPersonaChat({ isOpen, onClose, sections, personaName, personaRole, personaType }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [showStarters, setShowStarters] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    if (!isOpen) return null;

    const buildSystemContext = () => {
        let context = `You are role-playing as a persona named "${personaName || 'Unknown'}".
Role: ${personaRole || 'Unknown'}
Personality Type: ${personaType || 'Rational'}

Here is everything you know about yourself:\n\n`;

        (sections || []).forEach(s => {
            if (s.type === 'header') {
                context += `Name: ${s.data?.name || ''}\nRole: ${s.data?.role || ''}\nBio: ${s.data?.description || ''}\n\n`;
            } else if (s.type === 'list' && Array.isArray(s.data)) {
                context += `${s.title}: ${s.data.filter(i => typeof i === 'string').join(', ')}\n\n`;
            } else if (s.type === 'text' || s.type === 'quote') {
                context += `${s.title}: ${s.content || ''}\n\n`;
            } else if (s.type === 'demographic' && Array.isArray(s.data)) {
                context += `Demographics:\n${s.data.map(d => `  ${d.label}: ${d.value}`).join('\n')}\n\n`;
            } else if (s.type === 'skills' && Array.isArray(s.data)) {
                context += `Skills: ${s.data.map(sk => `${sk.label} (${sk.value}%)`).join(', ')}\n\n`;
            } else if (s.type === 'channels' && Array.isArray(s.data)) {
                context += `Channels: ${s.data.map(c => c.label).join(', ')}\n\n`;
            } else if (s.type === 'touchpoints' && Array.isArray(s.data)) {
                context += `Touchpoints: ${s.data.map(t => t.label).join(', ')}\n\n`;
            }
        });

        context += `\nIMPORTANT: Stay in character at all times. Answer as this persona would - using their vocabulary, concerns, and perspective. Be authentic and emotional. Don't break character or mention that you're an AI. Keep responses conversational and relatively brief (2-4 sentences).`;

        return context;
    };

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = { role: 'user', content: text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        setShowStarters(false);

        const systemContext = buildSystemContext();
        const conversationHistory = newMessages.map(m =>
            `${m.role === 'user' ? 'User' : personaName}: ${m.content}`
        ).join('\n\n');

        const prompt = `${systemContext}\n\nConversation so far:\n${conversationHistory}\n\n${personaName}:`;

        try {
            const res = await axios.post('/api/ai/generate', { prompt });
            const reply = res.data.text || res.data.definition || "I'm not sure how to respond to that.";
            setMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : JSON.stringify(reply) }]);
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I'm having trouble responding right now. (${e.message})` }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const exportChat = () => {
        const text = messages.map(m =>
            `${m.role === 'user' ? 'You' : personaName}: ${m.content}`
        ).join('\n\n');

        const blob = new Blob([`Chat with ${personaName}\n${'='.repeat(40)}\n\n${text}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_${(personaName || 'persona').replace(/\s+/g, '_')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const resetChat = () => {
        setMessages([]);
        setShowStarters(true);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px',
            background: 'white', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            fontFamily: "'Outfit', sans-serif", borderLeft: '1px solid #e2e8f0'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 20px', borderBottom: '1px solid #f1f5f9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: '#3b82f6', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1rem'
                    }}>
                        {(personaName || 'P')[0]}
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', color: '#1e3a5f', fontSize: '0.95rem' }}>
                            Chat with {personaName || 'Persona'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>
                            {personaRole || 'Persona'} &middot; In Character
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {messages.length > 0 && (
                        <>
                            <button onClick={exportChat} title="Export chat" style={{
                                background: 'transparent', border: '1px solid #bfdbfe',
                                cursor: 'pointer', color: '#3b82f6', padding: '6px',
                                borderRadius: '6px', display: 'flex'
                            }}>
                                <Download size={16} />
                            </button>
                            <button onClick={resetChat} title="Reset chat" style={{
                                background: 'transparent', border: '1px solid #bfdbfe',
                                cursor: 'pointer', color: '#3b82f6', padding: '6px',
                                borderRadius: '6px', display: 'flex'
                            }}>
                                <RotateCcw size={16} />
                            </button>
                        </>
                    )}
                    <button onClick={onClose} style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: '#94a3b8', padding: '4px'
                    }}>
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '20px',
                display: 'flex', flexDirection: 'column', gap: '16px'
            }}>
                {messages.length === 0 && showStarters && (
                    <div>
                        <div style={{
                            textAlign: 'center', padding: '20px 0 24px 0'
                        }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 12px auto', color: 'white', fontSize: '28px', fontWeight: 'bold'
                            }}>
                                {(personaName || 'P')[0]}
                            </div>
                            <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontWeight: '700' }}>
                                {personaName || 'Persona'}
                            </h3>
                            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                Ask me anything. I'll respond in character.
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                                Suggested Questions
                            </div>
                            {STARTER_QUESTIONS.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(q)}
                                    style={{
                                        textAlign: 'left', padding: '10px 14px', borderRadius: '10px',
                                        border: '1px solid #e2e8f0', background: 'white',
                                        color: '#475569', fontSize: '0.85rem', cursor: 'pointer',
                                        transition: 'all 0.15s', lineHeight: '1.4'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        style={{
                            display: 'flex', gap: '10px',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}
                    >
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                            background: msg.role === 'user' ? '#e2e8f0' : '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: msg.role === 'user' ? '#475569' : 'white', fontSize: '0.8rem', fontWeight: 'bold'
                        }}>
                            {msg.role === 'user' ? <User size={16} /> : (personaName || 'P')[0]}
                        </div>
                        <div style={{
                            maxWidth: '75%', padding: '10px 14px', borderRadius: '14px',
                            background: msg.role === 'user' ? '#f1f5f9' : '#eff6ff',
                            color: '#1e293b', fontSize: '0.88rem', lineHeight: '1.5',
                            borderBottomRightRadius: msg.role === 'user' ? '4px' : '14px',
                            borderBottomLeftRadius: msg.role === 'user' ? '14px' : '4px'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#3b82f6', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', color: 'white', fontSize: '0.8rem', fontWeight: 'bold'
                        }}>
                            {(personaName || 'P')[0]}
                        </div>
                        <div style={{
                            padding: '10px 16px', borderRadius: '14px', borderBottomLeftRadius: '4px',
                            background: '#eff6ff', display: 'flex', alignItems: 'center', gap: '8px',
                            color: '#3b82f6', fontSize: '0.85rem'
                        }}>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Thinking...
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{
                padding: '16px 20px', borderTop: '1px solid #f1f5f9',
                display: 'flex', gap: '10px', alignItems: 'center'
            }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Ask ${personaName || 'the persona'} a question...`}
                    disabled={loading}
                    style={{
                        flex: 1, padding: '12px 16px', borderRadius: '12px',
                        border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none',
                        fontFamily: 'inherit'
                    }}
                    onFocus={e => e.target.style.borderColor = '#3b82f6'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    style={{
                        width: '44px', height: '44px', borderRadius: '12px', border: 'none',
                        background: input.trim() && !loading ? '#3b82f6' : '#e2e8f0',
                        color: input.trim() && !loading ? 'white' : '#94a3b8',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s'
                    }}
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
}
