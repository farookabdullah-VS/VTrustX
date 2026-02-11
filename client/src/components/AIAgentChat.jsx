import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
    MessageSquare, X, Send, Sparkles, Minimize2, Maximize2,
    User, Bot, ChevronRight, FileText, BarChart3, Zap,
    TrendingUp, Users, ClipboardList, RefreshCw, ArrowLeft
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Inline sub-components
// ---------------------------------------------------------------------------

/** Three-dot typing indicator with staggered animation */
function TypingIndicator({ isArabic }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                    <span
                        key={i}
                        style={{
                            width: 7, height: 7,
                            borderRadius: '50%',
                            background: 'var(--primary-color)',
                            opacity: 0.6,
                            animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                    />
                ))}
            </div>
            <span style={{
                fontSize: 11,
                color: 'var(--text-muted, var(--label-color))',
                fontWeight: 600,
                letterSpacing: 0.3,
            }}>
                {isArabic ? 'جاري التحليل...' : 'Analyzing...'}
            </span>
        </div>
    );
}

/** Skeleton shimmer cards for loading states */
function SkeletonLoader({ count = 3 }) {
    return Array.from({ length: count }).map((_, i) => (
        <div
            key={i}
            style={{
                height: 56,
                borderRadius: 'calc(var(--border-radius, 24px) / 2)',
                background: 'var(--input-bg, #f0f2f5)',
                marginBottom: 10,
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
                animation: `skeletonShimmer 1.5s ease-in-out ${i * 0.15}s infinite`,
            }} />
        </div>
    ));
}

/** Themed empty state with icon, title, subtitle */
function EmptyState({ icon: Icon, title, subtitle }) {
    return (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
                width: 56, height: 56,
                background: 'color-mix(in srgb, var(--primary-color) 8%, white)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
            }}>
                <Icon size={26} style={{ color: 'var(--primary-color)' }} />
            </div>
            <h3 style={{
                color: 'var(--text-color)', fontWeight: 700, fontSize: 16,
                margin: '0 0 6px',
                fontFamily: 'var(--font-family, "Outfit", "Google Sans", "Inter", system-ui, sans-serif)',
            }}>
                {title}
            </h3>
            <p style={{
                color: 'var(--text-muted, var(--label-color))', fontSize: 12, margin: 0,
            }}>
                {subtitle}
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------
const FONT = 'var(--font-family, "Outfit", "Google Sans", "Inter", system-ui, sans-serif)';
const RADIUS = 'var(--border-radius, 24px)';
const TRANSITION = 'var(--transition-fast, 0.2s cubic-bezier(0.2, 0, 0, 1))';

/** Reset applied to every <button> to neutralize index.css global button styles */
const BTN_RESET = {
    backgroundImage: 'none',
    textTransform: 'none',
    letterSpacing: 'normal',
    boxShadow: 'none',
    fontFamily: FONT,
    fontSize: 'inherit',
    fontWeight: 'inherit',
    padding: 0,
    border: 'none',
    borderRadius: 0,
};

// ---------------------------------------------------------------------------
// Keyframes (injected once via <style>)
// ---------------------------------------------------------------------------
const KEYFRAMES = `
@keyframes chatSlideIn {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes messageSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes typingDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes skeletonShimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes aiBadgePulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color) 40%, transparent); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
@keyframes floatingBtnPulse {
  0%, 100% { box-shadow: 0 6px 24px -4px color-mix(in srgb, var(--primary-color) 45%, transparent); }
  50%      { box-shadow: 0 10px 32px -4px color-mix(in srgb, var(--primary-color) 60%, transparent); }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function AIAgentChat({ user }) {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState('agent');
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    // Survey mode
    const [availableSurveys, setAvailableSurveys] = useState([]);
    const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);
    const [activeSurvey, setActiveSurvey] = useState(null);

    // Actions mode
    const [actionCards, setActionCards] = useState({});
    const [loadingCards, setLoadingCards] = useState({});

    // Platform stats (cached)
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

    // ---- Side effects ----

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    // Auto-focus input when opening
    useEffect(() => {
        if (isOpen && !isMinimized && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 120);
        }
    }, [isOpen, isMinimized, activeTab, activeSurvey]);

    // Escape key closes chat
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') setIsOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen]);

    // Greeting on open
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

    // ---- Data loading ----

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

    // ---- Markdown renderer (theme-aware) ----

    const renderMessage = (content) => {
        const lines = content.split('\n');
        return lines.map((line, i) => {
            if (line.trim().startsWith('###')) {
                return (
                    <h4 key={i} style={{
                        color: 'var(--primary-color)', fontWeight: 700,
                        marginTop: 16, marginBottom: 8,
                        borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                        paddingBottom: 4, fontSize: 14,
                    }}>
                        {line.replace(/^###\s*/, '').trim()}
                    </h4>
                );
            }
            if (line.trim().startsWith('##')) {
                return (
                    <h3 key={i} style={{
                        color: 'var(--text-color)', fontWeight: 800,
                        marginTop: 20, marginBottom: 10, fontSize: 15,
                    }}>
                        {line.replace(/^##\s*/, '').trim()}
                    </h3>
                );
            }

            const parts = line.split(/(\*\*.*?\*\*)/g);
            const renderedLine = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} style={{ color: 'var(--text-color)', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginInlineStart: 8, marginTop: 4, marginBottom: 4 }}>
                        <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>&#8226;</span>
                        <div style={{ flex: 1 }}>{renderedLine}</div>
                    </div>
                );
            }

            if (line.trim().match(/^\d+\.\s/)) {
                return (
                    <div key={i} style={{ display: 'flex', gap: 8, marginInlineStart: 8, marginTop: 4, marginBottom: 4 }}>
                        <div style={{ flex: 1 }}>{renderedLine}</div>
                    </div>
                );
            }

            return <p key={i} style={{ marginTop: i > 0 ? 8 : 0, lineHeight: 1.6 }}>{renderedLine}</p>;
        });
    };

    // ---- Message handlers ----

    const handleSendAgent = async (text) => {
        const msg = text || input.trim();
        if (!msg || isLoading) return;

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/agent-chat/platform-agent', {
                message: msg,
                language: i18n.language,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
            if (res.data.data) setPlatformStats(res.data.data);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: isArabic
                    ? 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.'
                    : 'I encountered an error processing your request. Please try again.',
                isError: true,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendSurvey = async () => {
        if (!input.trim() || isLoading || !activeSurvey) return;

        const currentInput = input;
        setMessages(prev => [...prev, { role: 'user', content: currentInput }]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/agent-chat/analyze', {
                surveyId: activeSurvey.id,
                message: currentInput,
                language: i18n.language,
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'I encountered an error while analyzing the survey data. Please try again.',
                isError: true,
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeTab === 'agent') handleSendAgent();
        else if (activeTab === 'surveys' && activeSurvey) handleSendSurvey();
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
        if (tab !== 'surveys') setActiveSurvey(null);
        if (tab === 'agent' || tab === 'surveys') setMessages([]);
    };

    const fetchActionCard = async (cardType) => {
        setLoadingCards(prev => ({ ...prev, [cardType]: true }));
        const prompts = {
            nps: 'What is the current NPS score? Give a brief 2-3 sentence summary with the number.',
            csat: 'What is the current CSAT average? Give a brief 2-3 sentence summary.',
            responses: 'How many total survey responses and how many this week? Give a brief 2-3 sentence summary.',
            executive: 'Give me a brief executive summary of the platform performance in 4-5 bullet points.',
        };
        try {
            const res = await axios.post('/api/agent-chat/platform-agent', {
                message: prompts[cardType],
                language: i18n.language,
            });
            setActionCards(prev => ({ ...prev, [cardType]: res.data }));
        } catch (err) {
            console.error('Action card error:', err);
        } finally {
            setLoadingCards(prev => ({ ...prev, [cardType]: false }));
        }
    };

    // ---- Directional helper ----
    const sideKey = isArabic ? 'left' : 'right';
    const sideKeyOpposite = isArabic ? 'right' : 'left';

    // ---- Styles (all theme-aware) ----

    const s = {
        floatingBtn: {
            ...BTN_RESET,
            position: 'fixed',
            bottom: 24,
            [sideKey]: 24,
            width: 60, height: 60,
            borderRadius: '50%',
            background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 80%, black))`,
            color: 'white',
            border: '3px solid var(--glass-bg, white)',
            boxShadow: `0 6px 24px -4px color-mix(in srgb, var(--primary-color) 45%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 9999,
            transition: `transform ${TRANSITION}, box-shadow ${TRANSITION}`,
            animation: 'floatingBtnPulse 3s ease-in-out infinite',
        },
        aiBadge: {
            position: 'absolute',
            top: -4,
            [sideKey === 'right' ? 'right' : 'left']: -4,
            width: 22, height: 22,
            background: 'var(--primary-color)',
            color: 'white',
            fontSize: 9, fontWeight: 800,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--glass-bg, white)',
            animation: 'aiBadgePulse 2s ease-in-out infinite',
        },
        chatWindow: (minimized) => ({
            position: 'fixed',
            bottom: 24,
            [sideKey]: 24,
            width: minimized ? 320 : 440,
            height: minimized ? 60 : 620,
            maxHeight: '85vh',
            maxWidth: '92vw',
            borderRadius: `calc(${RADIUS} * 0.8)`,
            overflow: 'hidden',
            background: 'var(--glass-bg)',
            backdropFilter: `blur(var(--glass-blur, 24px))`,
            WebkitBackdropFilter: `blur(var(--glass-blur, 24px))`,
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            boxShadow: 'var(--glass-shadow, 0 25px 60px -15px rgba(0,0,0,0.2))',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)`,
            fontFamily: FONT,
            direction: isArabic ? 'rtl' : 'ltr',
            animation: 'chatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }),
        header: {
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: 'white',
            flexShrink: 0,
            background: `linear-gradient(135deg, color-mix(in srgb, var(--primary-color) 100%, black 30%), var(--primary-color))`,
            position: 'relative',
            overflow: 'hidden',
        },
        headerGlow: {
            position: 'absolute',
            top: -20,
            [sideKey]: -20,
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            filter: 'blur(20px)',
        },
        tabs: {
            ...BTN_RESET,
            display: 'flex',
            background: 'var(--deep-bg, #f8fafc)',
            borderBottom: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            flexShrink: 0,
        },
        tab: (active) => ({
            ...BTN_RESET,
            flex: 1,
            padding: '10px 8px',
            fontSize: 12,
            fontWeight: active ? 700 : 500,
            color: active ? 'var(--primary-color)' : 'var(--text-muted, var(--label-color))',
            background: active ? 'var(--glass-bg)' : 'transparent',
            borderBottom: active ? '2px solid var(--primary-color)' : '2px solid transparent',
            cursor: 'pointer',
            transition: `all ${TRANSITION}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6,
        }),
        msgArea: {
            flex: 1,
            overflowY: 'auto',
            padding: 16,
            background: 'var(--deep-bg, #f8fafc)',
        },
        msgBubble: (isUser, isError) => ({
            padding: '12px 16px',
            borderRadius: `calc(${RADIUS} * 0.65)`,
            fontSize: 13,
            lineHeight: 1.5,
            maxWidth: '88%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            animation: 'messageSlideIn 0.3s ease-out',
            ...(isUser ? {
                background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 80%, black))`,
                color: 'white',
                borderEndEndRadius: 4,
            } : isError ? {
                background: 'color-mix(in srgb, var(--status-error, #B3261E) 8%, white)',
                border: '1px solid color-mix(in srgb, var(--status-error, #B3261E) 25%, transparent)',
                color: 'var(--status-error, #B3261E)',
                borderEndStartRadius: 4,
            } : {
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                color: 'var(--text-color)',
                borderEndStartRadius: 4,
            }),
        }),
        avatar: (isUser) => ({
            width: 30, height: 30,
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            border: '2px solid var(--glass-bg, white)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            ...(isUser ? {
                background: 'var(--input-bg, #f0f2f5)',
                color: 'var(--text-muted, var(--label-color))',
            } : {
                background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                color: 'white',
            }),
        }),
        inputArea: {
            padding: '12px 16px',
            background: 'var(--glass-bg)',
            borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            display: 'flex',
            gap: 10,
            flexShrink: 0,
        },
        input: {
            flex: 1,
            background: 'var(--input-bg, #f0f2f5)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            borderRadius: `calc(${RADIUS} * 0.5)`,
            padding: '10px 14px',
            fontSize: 13,
            outline: 'none',
            transition: `all ${TRANSITION}`,
            fontFamily: FONT,
            color: 'var(--text-color)',
        },
        sendBtn: (disabled) => ({
            ...BTN_RESET,
            width: 40, height: 40,
            borderRadius: `calc(${RADIUS} * 0.5)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: `all ${TRANSITION}`,
            ...(disabled ? {
                background: 'var(--input-bg, #f0f2f5)',
                color: 'var(--text-muted, var(--label-color))',
            } : {
                background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 80%, black))`,
                color: 'white',
                boxShadow: `0 4px 12px color-mix(in srgb, var(--primary-color) 30%, transparent)`,
            }),
        }),
        starterBtn: {
            ...BTN_RESET,
            display: 'flex', alignItems: 'center',
            gap: 10, width: '100%',
            padding: '10px 14px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            borderRadius: `calc(${RADIUS} * 0.5)`,
            cursor: 'pointer',
            fontSize: 12, fontWeight: 500,
            color: 'var(--text-color)',
            textAlign: isArabic ? 'right' : 'left',
            transition: `all ${TRANSITION}`,
            marginBottom: 8,
        },
        surveyCard: {
            ...BTN_RESET,
            width: '100%',
            textAlign: isArabic ? 'right' : 'left',
            padding: '14px 16px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            borderRadius: `calc(${RADIUS} * 0.6)`,
            cursor: 'pointer',
            transition: `all ${TRANSITION}`,
            marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        },
        actionCard: {
            ...BTN_RESET,
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
            borderRadius: `calc(${RADIUS} * 0.6)`,
            padding: 16,
            marginBottom: 12,
            cursor: 'pointer',
            transition: `all ${TRANSITION}`,
            textAlign: isArabic ? 'right' : 'left',
            width: '100%',
        },
    };

    // ---- Action card configs ----
    const ACTION_CARDS = [
        {
            key: 'nps',
            icon: TrendingUp,
            label: isArabic ? 'معدل NPS' : 'NPS Score',
            iconBg: 'color-mix(in srgb, var(--status-success, #14AE5C) 8%, white)',
            iconColor: 'var(--status-success, #14AE5C)',
        },
        {
            key: 'csat',
            icon: BarChart3,
            label: isArabic ? 'معدل CSAT' : 'CSAT Average',
            iconBg: 'color-mix(in srgb, var(--primary-color) 8%, white)',
            iconColor: 'var(--primary-color)',
        },
        {
            key: 'responses',
            icon: Users,
            label: isArabic ? 'عدد الاستجابات' : 'Response Count',
            iconBg: 'color-mix(in srgb, var(--secondary-color, #FFB300) 8%, white)',
            iconColor: 'var(--secondary-color, #FFB300)',
        },
        {
            key: 'executive',
            icon: ClipboardList,
            label: isArabic ? 'ملخص تنفيذي' : 'Executive Summary',
            iconBg: 'color-mix(in srgb, var(--accent-color, var(--primary-color)) 8%, white)',
            iconColor: 'var(--accent-color, var(--primary-color))',
        },
    ];

    // ---- Shared message list renderer ----
    const renderMessages = () => (
        <>
            {messages.map((msg, idx) => (
                <div
                    key={idx}
                    style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        marginBottom: 16,
                    }}
                >
                    <div style={{
                        display: 'flex', gap: 10, maxWidth: '90%',
                        flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    }}>
                        <div style={s.avatar(msg.role === 'user')}>
                            {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                        </div>
                        <div style={s.msgBubble(msg.role === 'user', msg.isError)}>
                            {renderMessage(msg.content)}
                        </div>
                    </div>
                </div>
            ))}
            {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 10, maxWidth: '90%' }}>
                        <div style={s.avatar(false)}><Sparkles size={14} /></div>
                        <div style={{
                            ...s.msgBubble(false, false),
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                            <TypingIndicator isArabic={isArabic} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );

    // ---- Input bar renderer ----
    const renderInputBar = (placeholder) => (
        <form onSubmit={handleSubmit} style={s.inputArea}>
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholder}
                style={s.input}
                disabled={isLoading}
                dir={isArabic ? 'rtl' : 'ltr'}
                aria-label={isArabic ? 'أدخل رسالتك' : 'Enter your message'}
                onFocus={(e) => {
                    e.target.style.borderColor = 'var(--primary-color)';
                    e.target.style.background = 'var(--glass-bg)';
                    e.target.style.boxShadow = 'var(--input-focus-ring, 0 0 0 2px var(--primary-color))';
                }}
                onBlur={(e) => {
                    e.target.style.borderColor = 'var(--glass-border, rgba(0,0,0,0.08))';
                    e.target.style.background = 'var(--input-bg, #f0f2f5)';
                    e.target.style.boxShadow = 'none';
                }}
            />
            <button
                type="submit"
                disabled={!input.trim() || isLoading}
                style={s.sendBtn(!input.trim() || isLoading)}
                aria-label={isArabic ? 'إرسال' : 'Send message'}
            >
                <Send size={18} style={isArabic ? { transform: 'scaleX(-1)' } : {}} />
            </button>
        </form>
    );

    // ---- Header button style ----
    const headerBtnStyle = {
        ...BTN_RESET,
        background: 'rgba(255,255,255,0.1)',
        padding: 7,
        borderRadius: `calc(${RADIUS} * 0.35)`,
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.8)',
        transition: `all ${TRANSITION}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };

    // ---- Portal content ----
    const portalContent = (
        <>
            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={s.floatingBtn}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                    aria-label={isArabic ? 'فتح مساعد VTrustX الذكي' : 'Open VTrustX AI Agent'}
                >
                    <Bot size={28} strokeWidth={2.2} />
                    <div style={s.aiBadge}>AI</div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div
                    style={s.chatWindow(isMinimized)}
                    role="dialog"
                    aria-label={isArabic ? 'محادثة المساعد الذكي' : 'AI Agent Chat'}
                >
                    {/* Header */}
                    <div style={s.header}>
                        <div style={s.headerGlow} />
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            position: 'relative', zIndex: 1,
                        }}>
                            {activeTab === 'surveys' && activeSurvey && (
                                <button
                                    onClick={handleBackToSurveyList}
                                    style={{
                                        ...headerBtnStyle,
                                        padding: 6,
                                        ...(isArabic ? { marginRight: -4 } : { marginLeft: -4 }),
                                    }}
                                    aria-label={isArabic ? 'العودة للقائمة' : 'Back to survey list'}
                                >
                                    <ArrowLeft size={18} style={isArabic ? { transform: 'scaleX(-1)' } : {}} />
                                </button>
                            )}
                            <div style={{
                                width: 38, height: 38,
                                background: `linear-gradient(135deg, var(--primary-color), color-mix(in srgb, var(--primary-color) 70%, black))`,
                                borderRadius: `calc(${RADIUS} * 0.5)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid rgba(255,255,255,0.15)',
                                boxShadow: `0 2px 8px color-mix(in srgb, var(--primary-color) 30%, transparent)`,
                            }}>
                                <Bot size={22} color="white" />
                            </div>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3 }}>
                                    {activeTab === 'surveys' && activeSurvey
                                        ? (isArabic ? 'محلل الاستبيان' : 'Survey Analyst')
                                        : 'VTrustX AI Agent'}
                                </div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                                    {activeTab === 'surveys' && activeSurvey
                                        ? (activeSurvey.title.length > 30 ? activeSurvey.title.substring(0, 30) + '...' : activeSurvey.title)
                                        : (isArabic ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI Intelligence')}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, position: 'relative', zIndex: 1 }}>
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                style={headerBtnStyle}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                aria-label={isMinimized ? 'Maximize' : 'Minimize'}
                            >
                                {isMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={headerBtnStyle}
                                onMouseOver={(e) => { e.currentTarget.style.background = `color-mix(in srgb, var(--status-error, #B3261E) 60%, transparent)`; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                                aria-label={isArabic ? 'إغلاق' : 'Close chat'}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* Tab Bar */}
                            <div style={s.tabs} role="tablist" aria-label={isArabic ? 'تبويبات المساعد' : 'Agent tabs'}>
                                <button
                                    style={s.tab(activeTab === 'agent')}
                                    onClick={() => handleTabChange('agent')}
                                    role="tab"
                                    aria-selected={activeTab === 'agent'}
                                    aria-label={isArabic ? 'المساعد' : 'Agent'}
                                >
                                    <Sparkles size={14} /> {isArabic ? 'المساعد' : 'Agent'}
                                </button>
                                <button
                                    style={s.tab(activeTab === 'surveys')}
                                    onClick={() => handleTabChange('surveys')}
                                    role="tab"
                                    aria-selected={activeTab === 'surveys'}
                                    aria-label={isArabic ? 'الاستبيانات' : 'Surveys'}
                                >
                                    <FileText size={14} /> {isArabic ? 'الاستبيانات' : 'Surveys'}
                                </button>
                                <button
                                    style={s.tab(activeTab === 'actions')}
                                    onClick={() => handleTabChange('actions')}
                                    role="tab"
                                    aria-selected={activeTab === 'actions'}
                                    aria-label={isArabic ? 'إجراءات' : 'Actions'}
                                >
                                    <Zap size={14} /> {isArabic ? 'إجراءات' : 'Actions'}
                                </button>
                            </div>

                            {/* ===== AGENT TAB ===== */}
                            {activeTab === 'agent' && (
                                <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                    <div ref={scrollRef} style={s.msgArea} role="log" aria-live="polite">
                                        {renderMessages()}

                                        {/* Starter suggestions */}
                                        {messages.length <= 1 && !isLoading && (
                                            <div style={{ marginTop: 12 }}>
                                                <p style={{
                                                    fontSize: 11,
                                                    color: 'var(--text-muted, var(--label-color))',
                                                    fontWeight: 600,
                                                    marginBottom: 10,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: 0.5,
                                                }}>
                                                    {isArabic ? 'جرب السؤال' : 'Try asking'}
                                                </p>
                                                {starterSuggestions.map((sg, i) => {
                                                    const Icon = sg.icon;
                                                    return (
                                                        <button
                                                            key={i}
                                                            style={s.starterBtn}
                                                            onClick={() => handleSendAgent(sg.text)}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSendAgent(sg.text); }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-color) 40%, transparent)';
                                                                e.currentTarget.style.background = 'color-mix(in srgb, var(--primary-color) 6%, white)';
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.borderColor = 'var(--glass-border, rgba(0,0,0,0.08))';
                                                                e.currentTarget.style.background = 'var(--glass-bg)';
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: 30, height: 30,
                                                                borderRadius: `calc(${RADIUS} * 0.35)`,
                                                                background: 'color-mix(in srgb, var(--primary-color) 8%, white)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                flexShrink: 0,
                                                            }}>
                                                                <Icon size={14} style={{ color: 'var(--primary-color)' }} />
                                                            </div>
                                                            <span>{sg.text}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {renderInputBar(isArabic ? 'اسأل عن بياناتك...' : 'Ask about your data...')}
                                </div>
                            )}

                            {/* ===== SURVEYS TAB ===== */}
                            {activeTab === 'surveys' && (
                                <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                    {!activeSurvey ? (
                                        <div style={{ ...s.msgArea, padding: 20 }}>
                                            <EmptyState
                                                icon={FileText}
                                                title={isArabic ? 'تحليل الاستبيانات' : 'Survey Analysis'}
                                                subtitle={isArabic ? 'اختر استبياناً للتحليل العميق' : 'Select a survey for deep analysis'}
                                            />

                                            {isLoadingSurveys ? (
                                                <SkeletonLoader count={4} />
                                            ) : (
                                                <>
                                                    {availableSurveys.map(survey => (
                                                        <button
                                                            key={survey.id}
                                                            style={s.surveyCard}
                                                            onClick={() => handleSelectSurvey(survey)}
                                                            tabIndex={0}
                                                            onKeyDown={(e) => { if (e.key === 'Enter') handleSelectSurvey(survey); }}
                                                            onMouseOver={(e) => {
                                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-color) 40%, transparent)';
                                                                e.currentTarget.style.boxShadow = `0 4px 12px color-mix(in srgb, var(--primary-color) 8%, transparent)`;
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.currentTarget.style.borderColor = 'var(--glass-border, rgba(0,0,0,0.08))';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{
                                                                    width: 36, height: 36,
                                                                    background: 'var(--input-bg, #f0f2f5)',
                                                                    borderRadius: `calc(${RADIUS} * 0.4)`,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                }}>
                                                                    <FileText size={18} style={{ color: 'var(--text-muted, var(--label-color))' }} />
                                                                </div>
                                                                <span style={{
                                                                    fontSize: 13, fontWeight: 600,
                                                                    color: 'var(--text-color)',
                                                                }}>{survey.title}</span>
                                                            </div>
                                                            <ChevronRight
                                                                size={16}
                                                                style={{
                                                                    color: 'var(--text-muted, var(--label-color))',
                                                                    ...(isArabic ? { transform: 'scaleX(-1)' } : {}),
                                                                }}
                                                            />
                                                        </button>
                                                    ))}
                                                    {availableSurveys.length === 0 && !isLoadingSurveys && (
                                                        <div style={{
                                                            textAlign: 'center', padding: 40,
                                                            color: 'var(--text-muted, var(--label-color))', fontSize: 13,
                                                        }}>
                                                            {isArabic ? 'لا توجد استبيانات' : 'No surveys found'}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div ref={scrollRef} style={s.msgArea} role="log" aria-live="polite">
                                                {renderMessages()}
                                            </div>
                                            {renderInputBar(isArabic ? 'اسأل عن هذا الاستبيان...' : 'Ask about this survey...')}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ===== ACTIONS TAB ===== */}
                            {activeTab === 'actions' && (
                                <div role="tabpanel" style={{ ...s.msgArea, padding: 20 }}>
                                    <p style={{
                                        fontSize: 11,
                                        color: 'var(--text-muted, var(--label-color))',
                                        fontWeight: 600,
                                        marginBottom: 14,
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}>
                                        {isArabic ? 'رؤى سريعة' : 'Quick Insights'}
                                    </p>

                                    {ACTION_CARDS.map(({ key, icon: CardIcon, label, iconBg, iconColor }) => (
                                        <div
                                            key={key}
                                            style={s.actionCard}
                                            onClick={() => !actionCards[key] && !loadingCards[key] && fetchActionCard(key)}
                                            tabIndex={0}
                                            role="button"
                                            aria-label={label}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !actionCards[key] && !loadingCards[key]) fetchActionCard(key); }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--primary-color) 40%, transparent)';
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--glass-border, rgba(0,0,0,0.08))';
                                            }}
                                        >
                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                marginBottom: actionCards[key] ? 10 : 0,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 36, height: 36,
                                                        borderRadius: `calc(${RADIUS} * 0.4)`,
                                                        background: iconBg,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        <CardIcon size={18} style={{ color: iconColor }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-color)' }}>{label}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text-muted, var(--label-color))' }}>
                                                            {actionCards[key]
                                                                ? (isArabic ? 'تم التحميل' : 'Loaded')
                                                                : (isArabic ? 'اضغط للتحميل' : 'Click to load')}
                                                        </div>
                                                    </div>
                                                </div>
                                                {loadingCards[key] && (
                                                    <div style={{
                                                        width: 16, height: 16,
                                                        border: `2px solid color-mix(in srgb, ${iconColor} 30%, transparent)`,
                                                        borderTopColor: iconColor,
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite',
                                                    }} />
                                                )}
                                                {actionCards[key] && (
                                                    <button
                                                        style={{
                                                            ...BTN_RESET,
                                                            cursor: 'pointer',
                                                            padding: 4, borderRadius: '50%',
                                                            color: 'var(--text-muted, var(--label-color))',
                                                            display: 'flex',
                                                        }}
                                                        aria-label={isArabic ? 'تحديث' : 'Refresh'}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActionCards(p => ({ ...p, [key]: null }));
                                                            fetchActionCard(key);
                                                        }}
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {actionCards[key] && (
                                                <div style={{
                                                    fontSize: 12,
                                                    color: 'var(--text-color)',
                                                    lineHeight: 1.6,
                                                    borderTop: '1px solid var(--glass-border, rgba(0,0,0,0.08))',
                                                    paddingTop: 10,
                                                }}>
                                                    {renderMessage(actionCards[key].text)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Keyframes */}
            <style>{KEYFRAMES}</style>
        </>
    );

    return createPortal(portalContent, document.body);
}
