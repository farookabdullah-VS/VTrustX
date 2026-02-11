import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    MessageSquare, X, Send, Sparkles, Loader2, Minimize2, Maximize2,
    User, Bot, ChevronRight, FileText, BarChart3, Zap,
    TrendingUp, Users, Map, ClipboardList, RefreshCw, ArrowLeft
} from 'lucide-react';

export function AIAgentChat({ user }) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState('agent'); // agent | surveys | actions
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Survey mode state
    const [availableSurveys, setAvailableSurveys] = useState([]);
    const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState(null);

    // Actions mode state
    const [actionCards, setActionCards] = useState({});
    const [loadingCards, setLoadingCards] = useState({});

    // Platform stats (cached from agent responses)
    const [platformStats, setPlatformStats] = useState(null);

    const isArabic = i18n.language.startsWith('ar');

    const starterSuggestions = isArabic ? [
        { text: 'ما هو معدل NPS الحالي؟', icon: TrendingUp },
        { text: 'أعطني ملخص تنفيذي لجميع البيانات', icon: ClipboardList },
        { text: 'ما هي نقاط الألم الرئيسية للعملاء؟', icon: Zap },
        { text: 'كم عدد الاستجابات هذا الأسبوع؟', icon: BarChart3 },
    ] : [
        { text: "What's my current NPS score?", icon: TrendingUp },
        { text: 'Give me an executive summary of all survey data', icon: ClipboardList },
        { text: 'What are the top customer pain points?', icon: Zap },
        { text: 'How many responses did we get this week?', icon: BarChart3 },
    ];

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Initial greeting when opening agent tab
    useEffect(() => {
        if (isOpen && activeTab === 'agent' && messages.length === 0) {
            const name = user?.user?.username || 'there';
            const greeting = isArabic
                ? `مرحبا ${name}! أنا مساعد VTrustX الذكي. يمكنني مساعدتك في تحليل بيانات الاستبيانات، مقاييس CSAT/NPS، رؤى العملاء وأكثر. كيف أستطيع مساعدتك؟`
                : `Hello ${name}! I'm your VTrustX AI Agent. I can help you with survey analytics, CSAT/NPS metrics, customer insights, journey maps, and more. How can I assist you today?`;
            setMessages([{ role: 'assistant', content: greeting }]);
        }
    }, [isOpen, activeTab]);

    // Load surveys when switching to surveys tab
    useEffect(() => {
        if (isOpen && activeTab === 'surveys' && availableSurveys.length === 0) {
            loadSurveys();
        }
    }, [isOpen, activeTab]);

    const loadSurveys = async () => {
        setIsLoadingSurveys(true);
        try {
            const res = await axios.get('/api/agent-chat/forms');
            setAvailableSurveys(res.data.filter(f => f.title && f.id));
        } catch (err) {
            console.error('Failed to load surveys', err);
        } finally {
            setIsLoadingSurveys(false);
        }
    };

    // Markdown renderer (reuse pattern from SurveyAnalystChat)
    const renderMessage = (content) => {
        const lines = content.split('\n');
        return lines.map((line, i) => {
            if (line.trim().startsWith('###')) {
                return <h4 key={i} style={{ color: '#2563eb', fontWeight: 700, marginTop: 16, marginBottom: 8, borderBottom: '1px solid #dbeafe', paddingBottom: 4, fontSize: 14 }}>{line.replace(/^###\s*/, '').trim()}</h4>;
            }
            if (line.trim().startsWith('##')) {
                return <h3 key={i} style={{ color: '#0f172a', fontWeight: 800, marginTop: 20, marginBottom: 10, fontSize: 15 }}>{line.replace(/^##\s*/, '').trim()}</h3>;
            }
            const parts = line.split(/(\*\*.*?\*\*)/g);
            const renderedLine = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} style={{ color: '#0f172a', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginLeft: 8, marginTop: 4, marginBottom: 4 }}>
                        <span style={{ color: '#2563eb', fontWeight: 700 }}>&#8226;</span>
                        <div style={{ flex: 1 }}>{renderedLine}</div>
                    </div>
                );
            }

            if (line.trim().match(/^\d+\.\s/)) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginLeft: 8, marginTop: 4, marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>{renderedLine}</div>
                    </div>
                );
            }

            return <p key={i} style={{ marginTop: i > 0 ? 8 : 0, lineHeight: 1.6 }}>{renderedLine}</p>;
        });
    };

    // Send message to platform agent
    const handleSendAgent = async (text) => {
        const msg = text || input.trim();
        if (!msg || isLoading) return;

        const userMsg = { role: 'user', content: msg };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/agent-chat/platform-agent', {
                message: msg,
                language: i18n.language
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
            if (res.data.data) {
                setPlatformStats(res.data.data);
            }
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isArabic
                    ? 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
                    : 'I encountered an error processing your request. Please try again.',
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Send message to survey analyst
    const handleSendSurvey = async () => {
        if (!input.trim() || isLoading || !activeSurvey) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/agent-chat/analyze', {
                surveyId: activeSurvey.id,
                message: currentInput,
                language: i18n.language
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I encountered an error while analyzing the survey data. Please try again.',
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeTab === 'agent') {
            handleSendAgent();
        } else if (activeTab === 'surveys' && activeSurvey) {
            handleSendSurvey();
        }
    };

    const handleSelectSurvey = (survey) => {
        setActiveSurvey(survey);
        const greeting = isArabic
            ? `تم تحميل بيانات "${survey.title}". اسألني عن الاتجاهات أو الإحصاءات أو التحليل.`
            : `I've loaded the data for "${survey.title}". Ask me about trends, statistics, or analysis.`;
        setMessages([{ role: 'assistant', content: greeting }]);
    };

    const handleBackToSurveyList = () => {
        setActiveSurvey(null);
        setMessages([]);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab !== 'surveys') {
            setActiveSurvey(null);
        }
        if (tab === 'agent') {
            setMessages([]);
        } else if (tab === 'surveys') {
            setMessages([]);
        }
    };

    // Fetch action card data
    const fetchActionCard = async (cardType) => {
        setLoadingCards(prev => ({ ...prev, [cardType]: true }));
        try {
            if (cardType === 'nps') {
                const res = await axios.post('/api/agent-chat/platform-agent', {
                    message: 'What is the current NPS score? Give a brief 2-3 sentence summary with the number.',
                    language: i18n.language
                });
                setActionCards(prev => ({ ...prev, nps: res.data }));
            } else if (cardType === 'csat') {
                const res = await axios.post('/api/agent-chat/platform-agent', {
                    message: 'What is the current CSAT average? Give a brief 2-3 sentence summary.',
                    language: i18n.language
                });
                setActionCards(prev => ({ ...prev, csat: res.data }));
            } else if (cardType === 'responses') {
                const res = await axios.post('/api/agent-chat/platform-agent', {
                    message: 'How many total survey responses and how many this week? Give a brief 2-3 sentence summary.',
                    language: i18n.language
                });
                setActionCards(prev => ({ ...prev, responses: res.data }));
            } else if (cardType === 'executive') {
                const res = await axios.post('/api/agent-chat/platform-agent', {
                    message: 'Give me a brief executive summary of the platform performance in 4-5 bullet points.',
                    language: i18n.language
                });
                setActionCards(prev => ({ ...prev, executive: res.data }));
            }
        } catch (err) {
            console.error('Action card error:', err);
        } finally {
            setLoadingCards(prev => ({ ...prev, [cardType]: false }));
        }
    };

    // --- Styles ---
    const styles = {
        floatingBtn: {
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: 'white',
            border: '3px solid white',
            boxShadow: '0 10px 30px -5px rgba(99, 102, 241, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: 'transform 0.2s, box-shadow 0.2s',
        },
        aiBadge: {
            position: 'absolute',
            top: -4,
            right: -4,
            width: 22,
            height: 22,
            background: '#ef4444',
            color: 'white',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            animation: 'bounce 2s infinite',
        },
        chatWindow: (minimized) => ({
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: minimized ? 320 : 440,
            height: minimized ? 60 : 620,
            maxHeight: '85vh',
            maxWidth: '92vw',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e2e8f0',
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }),
        header: {
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: 'white',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
            position: 'relative',
            overflow: 'hidden',
        },
        headerGlow: {
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            background: 'rgba(139, 92, 246, 0.15)',
            borderRadius: '50%',
            filter: 'blur(20px)',
        },
        tabs: {
            display: 'flex',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
        },
        tab: (active) => ({
            flex: 1,
            padding: '10px 8px',
            fontSize: 12,
            fontWeight: active ? 700 : 500,
            color: active ? '#4f46e5' : '#64748b',
            background: active ? 'white' : 'transparent',
            border: 'none',
            borderBottom: active ? '2px solid #4f46e5' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
        }),
        msgArea: {
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: '#fafbfd',
        },
        msgBubble: (isUser, isError) => ({
            padding: '12px 16px',
            borderRadius: 16,
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: '88%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            ...(isUser ? {
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: 'white',
                borderBottomRightRadius: 4,
            } : isError ? {
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderBottomLeftRadius: 4,
            } : {
                background: 'white',
                border: '1px solid #e5e7eb',
                color: '#374151',
                borderBottomLeftRadius: 4,
            }),
        }),
        avatar: (isUser) => ({
            width: 30,
            height: 30,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            ...(isUser ? {
                background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
                color: '#475569',
            } : {
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white',
            }),
        }),
        inputArea: {
            padding: '12px 16px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
        },
        input: {
            flex: 1,
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 13,
            outline: 'none',
            transition: 'all 0.2s',
        },
        sendBtn: (disabled) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            ...(disabled ? {
                background: '#f1f5f9',
                color: '#94a3b8',
            } : {
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            }),
        }),
        starterBtn: {
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '10px 14px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            color: '#374151',
            textAlign: 'left',
            transition: 'all 0.2s',
            marginBottom: 8,
        },
        surveyCard: {
            width: '100%',
            textAlign: 'left',
            padding: '14px 16px',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        actionCard: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
        },
    };

    const portalContent = (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={styles.floatingBtn}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    title="VTrustX AI Agent"
                >
                    <Bot size={28} strokeWidth={2.2} />
                    <div style={styles.aiBadge}>AI</div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div style={styles.chatWindow(isMinimized)}>
                    {/* Header */}
                    <div style={styles.header}>
                        <div style={styles.headerGlow}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                            {activeTab === 'surveys' && activeSurvey && (
                                <button
                                    onClick={handleBackToSurveyList}
                                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: 6, borderRadius: 8, cursor: 'pointer', color: 'white', display: 'flex', marginLeft: -4 }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                            )}
                            <div style={{
                                width: 38, height: 38,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                borderRadius: 12,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                            }}>
                                <Bot size={22} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>
                                    {activeTab === 'surveys' && activeSurvey ? 'Survey Analyst' : 'VTrustX AI Agent'}
                                </div>
                                <div style={{ fontSize: 10, color: '#c7d2fe', fontWeight: 500 }}>
                                    {activeTab === 'surveys' && activeSurvey
                                        ? (activeSurvey.title.length > 30 ? activeSurvey.title.substring(0, 30) + '...' : activeSurvey.title)
                                        : (isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI Intelligence')
                                    }
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: 7, borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            >
                                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', padding: 7, borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.8)', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.6)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Tab Bar */}
                            <div style={styles.tabs}>
                                <button style={styles.tab(activeTab === 'agent')} onClick={() => handleTabChange('agent')}>
                                    <Sparkles size={14} /> {isArabic ? 'المساعد' : 'Agent'}
                                </button>
                                <button style={styles.tab(activeTab === 'surveys')} onClick={() => handleTabChange('surveys')}>
                                    <FileText size={14} /> {isArabic ? 'الاستبيانات' : 'Surveys'}
                                </button>
                                <button style={styles.tab(activeTab === 'actions')} onClick={() => handleTabChange('actions')}>
                                    <Zap size={14} /> {isArabic ? 'إجراءات' : 'Actions'}
                                </button>
                            </div>

                            {/* ===== AGENT TAB ===== */}
                            {activeTab === 'agent' && (
                                <>
                                    <div ref={scrollRef} style={styles.msgArea}>
                                        {messages.map((msg, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                                                <div style={{ display: 'flex', gap: 10, maxWidth: '90%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                                    <div style={styles.avatar(msg.role === 'user')}>
                                                        {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                                    </div>
                                                    <div style={styles.msgBubble(msg.role === 'user', msg.isError)}>
                                                        {renderMessage(msg.content)}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                                                <div style={{ display: 'flex', gap: 10, maxWidth: '90%' }}>
                                                    <div style={styles.avatar(false)}><Sparkles size={14} /></div>
                                                    <div style={{ ...styles.msgBubble(false, false), display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
                                                        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                            {isArabic ? 'جاري التحليل...' : 'Analyzing...'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Starter suggestions (only if just greeting) */}
                                        {messages.length <= 1 && !isLoading && (
                                            <div style={{ marginTop: 12 }}>
                                                <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                    {isArabic ? 'جرب السؤال' : 'Try asking'}
                                                </p>
                                                {starterSuggestions.map((s, i) => {
                                                    const Icon = s.icon;
                                                    return (
                                                        <button
                                                            key={i}
                                                            style={styles.starterBtn}
                                                            onClick={() => handleSendAgent(s.text)}
                                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.background = '#eef2ff'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = 'white'; }}
                                                        >
                                                            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                <Icon size={14} color="#4f46e5" />
                                                            </div>
                                                            <span>{s.text}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Input */}
                                    <form onSubmit={handleSubmit} style={styles.inputArea}>
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={isArabic ? 'اسأل عن بياناتك...' : 'Ask about your data...'}
                                            style={styles.input}
                                            disabled={isLoading}
                                            dir={isArabic ? 'rtl' : 'ltr'}
                                            onFocus={(e) => { e.target.style.borderColor = '#a5b4fc'; e.target.style.background = 'white'; }}
                                            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f1f5f9'; }}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            style={styles.sendBtn(!input.trim() || isLoading)}
                                        >
                                            <Send size={18} style={isArabic ? { transform: 'rotate(180deg)' } : {}} />
                                        </button>
                                    </form>
                                </>
                            )}

                            {/* ===== SURVEYS TAB ===== */}
                            {activeTab === 'surveys' && (
                                <>
                                    {!activeSurvey ? (
                                        <div style={{ ...styles.msgArea, padding: 20 }}>
                                            <div style={{ textAlign: 'center', marginBottom: 24, marginTop: 16 }}>
                                                <div style={{ width: 56, height: 56, background: '#eef2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                                    <FileText size={26} color="#4f46e5" />
                                                </div>
                                                <h3 style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
                                                    {isArabic ? 'تحليل الاستبيانات' : 'Survey Analysis'}
                                                </h3>
                                                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                                                    {isArabic ? 'اختر استبياناً للتحليل العميق' : 'Select a survey for deep analysis'}
                                                </p>
                                            </div>

                                            {isLoadingSurveys ? (
                                                <div style={{ textAlign: 'center', padding: 40 }}>
                                                    <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
                                                </div>
                                            ) : (
                                                <>
                                                    {availableSurveys.map(survey => (
                                                        <button
                                                            key={survey.id}
                                                            style={styles.surveyCard}
                                                            onClick={() => handleSelectSurvey(survey)}
                                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.08)'; }}
                                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none'; }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{ width: 36, height: 36, background: '#f1f5f9', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <FileText size={18} color="#64748b" />
                                                                </div>
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{survey.title}</span>
                                                            </div>
                                                            <ChevronRight size={16} color="#94a3b8" />
                                                        </button>
                                                    ))}
                                                    {availableSurveys.length === 0 && (
                                                        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                                                            {isArabic ? 'لا توجد استبيانات' : 'No surveys found'}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Chat with selected survey */}
                                            <div ref={scrollRef} style={styles.msgArea}>
                                                {messages.map((msg, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
                                                        <div style={{ display: 'flex', gap: 10, maxWidth: '90%', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                                                            <div style={styles.avatar(msg.role === 'user')}>
                                                                {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                                                            </div>
                                                            <div style={styles.msgBubble(msg.role === 'user', msg.isError)}>
                                                                {renderMessage(msg.content)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {isLoading && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                                                        <div style={{ display: 'flex', gap: 10, maxWidth: '90%' }}>
                                                            <div style={styles.avatar(false)}><Sparkles size={14} /></div>
                                                            <div style={{ ...styles.msgBubble(false, false), display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite', color: '#4f46e5' }} />
                                                                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                                                    {isArabic ? 'جاري التحليل...' : 'Analyzing survey...'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <form onSubmit={handleSubmit} style={styles.inputArea}>
                                                <input
                                                    type="text"
                                                    value={input}
                                                    onChange={(e) => setInput(e.target.value)}
                                                    placeholder={isArabic ? 'اسأل عن هذا الاستبيان...' : 'Ask about this survey...'}
                                                    style={styles.input}
                                                    disabled={isLoading}
                                                    dir={isArabic ? 'rtl' : 'ltr'}
                                                    onFocus={(e) => { e.target.style.borderColor = '#a5b4fc'; e.target.style.background = 'white'; }}
                                                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f1f5f9'; }}
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!input.trim() || isLoading}
                                                    style={styles.sendBtn(!input.trim() || isLoading)}
                                                >
                                                    <Send size={18} style={isArabic ? { transform: 'rotate(180deg)' } : {}} />
                                                </button>
                                            </form>
                                        </>
                                    )}
                                </>
                            )}

                            {/* ===== ACTIONS TAB ===== */}
                            {activeTab === 'actions' && (
                                <div style={{ ...styles.msgArea, padding: 20 }}>
                                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                        {isArabic ? 'رؤى سريعة' : 'Quick Insights'}
                                    </p>

                                    {/* NPS Card */}
                                    <div
                                        style={styles.actionCard}
                                        onClick={() => !actionCards.nps && !loadingCards.nps && fetchActionCard('nps')}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: actionCards.nps ? 10 : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <TrendingUp size={18} color="#059669" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{isArabic ? 'معدل NPS' : 'NPS Score'}</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{isArabic ? 'اضغط للتحميل' : 'Click to load'}</div>
                                                </div>
                                            </div>
                                            {loadingCards.nps && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#059669' }} />}
                                            {actionCards.nps && <RefreshCw size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActionCards(p => ({ ...p, nps: null })); fetchActionCard('nps'); }} />}
                                        </div>
                                        {actionCards.nps && (
                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                                {renderMessage(actionCards.nps.text)}
                                            </div>
                                        )}
                                    </div>

                                    {/* CSAT Card */}
                                    <div
                                        style={styles.actionCard}
                                        onClick={() => !actionCards.csat && !loadingCards.csat && fetchActionCard('csat')}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: actionCards.csat ? 10 : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <BarChart3 size={18} color="#2563eb" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{isArabic ? 'معدل CSAT' : 'CSAT Average'}</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{isArabic ? 'اضغط للتحميل' : 'Click to load'}</div>
                                                </div>
                                            </div>
                                            {loadingCards.csat && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#2563eb' }} />}
                                            {actionCards.csat && <RefreshCw size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActionCards(p => ({ ...p, csat: null })); fetchActionCard('csat'); }} />}
                                        </div>
                                        {actionCards.csat && (
                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                                {renderMessage(actionCards.csat.text)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Response Count Card */}
                                    <div
                                        style={styles.actionCard}
                                        onClick={() => !actionCards.responses && !loadingCards.responses && fetchActionCard('responses')}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: actionCards.responses ? 10 : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Users size={18} color="#a855f7" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{isArabic ? 'عدد الاستجابات' : 'Response Count'}</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{isArabic ? 'اضغط للتحميل' : 'Click to load'}</div>
                                                </div>
                                            </div>
                                            {loadingCards.responses && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#a855f7' }} />}
                                            {actionCards.responses && <RefreshCw size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActionCards(p => ({ ...p, responses: null })); fetchActionCard('responses'); }} />}
                                        </div>
                                        {actionCards.responses && (
                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                                {renderMessage(actionCards.responses.text)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Executive Summary Card */}
                                    <div
                                        style={styles.actionCard}
                                        onClick={() => !actionCards.executive && !loadingCards.executive && fetchActionCard('executive')}
                                        onMouseOver={(e) => { e.currentTarget.style.borderColor = '#a5b4fc'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: actionCards.executive ? 10 : 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <ClipboardList size={18} color="#ea580c" />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{isArabic ? 'ملخص تنفيذي' : 'Executive Summary'}</div>
                                                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{isArabic ? 'اضغط للتحميل' : 'Click to load'}</div>
                                                </div>
                                            </div>
                                            {loadingCards.executive && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#ea580c' }} />}
                                            {actionCards.executive && <RefreshCw size={14} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActionCards(p => ({ ...p, executive: null })); fetchActionCard('executive'); }} />}
                                        </div>
                                        {actionCards.executive && (
                                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                                                {renderMessage(actionCards.executive.text)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* CSS Keyframes */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
            `}</style>
        </>
    );

    return createPortal(portalContent, document.body);
}
