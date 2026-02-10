import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { getForms } from '../../services/formService'; // Ensure this path is correct
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
    MessageSquare, X, Send, Sparkles, Loader2, Minimize2, Maximize2,
    User, Bot, AlertCircle, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';

export function SurveyAnalystChat({ surveyId, surveyTitle, triggerComponent }) {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Global Mode State
    const [availableSurveys, setAvailableSurveys] = useState([]);
    const [isLoadingSurveys, setIsLoadingSurveys] = useState(false);

    // Active Context State (Either from props or selection)
    const [activeSurvey, setActiveSurvey] = useState(null);

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    // Initialize Active Survey from Props
    useEffect(() => {
        if (surveyId) {
            setActiveSurvey({ id: surveyId, title: surveyTitle });
        }
    }, [surveyId, surveyTitle]);

    // Fetch Surveys in Global Mode if needed
    useEffect(() => {
        if (isOpen && !surveyId && !activeSurvey) {
            loadSurveys();
        }
    }, [isOpen, surveyId, activeSurvey]);

    const loadSurveys = async () => {
        setIsLoadingSurveys(true);
        try {
            const forms = await getForms();
            // Filter only valid forms
            const validForms = forms.filter(f => f.title && f.id).map(f => ({
                id: f.id,
                title: f.title
            }));
            setAvailableSurveys(validForms);
        } catch (err) {
            console.error("Failed to load surveys", err);
        } finally {
            setIsLoadingSurveys(false);
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading, activeSurvey]);

    // Initial Greeting when context changes
    useEffect(() => {
        if (activeSurvey) {
            // Only add greeting if empty
            if (messages.length === 0) {
                const isArabic = i18n.language.startsWith('ar');
                const greeting = isArabic
                    ? `مرحباً! أنا محلل البيانات الذكي. لقد قمت بتحميل بيانات الاستبيان "${activeSurvey.title}". كيف يمكنني مساعدتك؟`
                    : `Hello! I'm your AI Analyst. I've loaded the context for "${activeSurvey.title}". How can I help you today?`;

                setMessages([{ role: 'assistant', content: greeting }]);
            }
        } else if (!surveyId) {
            // Global Mode Greeting
            // We handle this in the UI rendering (Show List)
        }
    }, [activeSurvey, surveyId, i18n.language]);

    const renderMessage = (content) => {
        // Simple Markdown-ish parser for AI reports
        const lines = content.split('\n');
        return lines.map((line, i) => {
            if (line.trim().startsWith('###')) {
                return <h4 key={i} className="text-blue-600 font-bold mt-4 mb-2 border-b border-blue-100 pb-1">{line.replace('###', '').trim()}</h4>;
            }
            if (line.trim().startsWith('##')) {
                return <h3 key={i} className="text-slate-900 font-extrabold mt-6 mb-3 text-lg">{line.replace('##', '').trim()}</h3>;
            }
            const parts = line.split(/(\*\*.*?\*\*)/g);
            const renderedLine = parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={j} className="text-slate-900 font-bold">{part.slice(2, -2)}</strong>;
                }
                return part;
            });

            if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                    <div key={i} className="flex gap-2 ml-2 mt-1 mb-1">
                        <span className="text-blue-500 font-bold">•</span>
                        <div className="flex-1">{renderedLine.slice(1)}</div>
                    </div>
                );
            }

            return <p key={i} className={i > 0 ? 'mt-2 leading-relaxed' : 'leading-relaxed'}>{renderedLine}</p>;
        });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !activeSurvey) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await axios.post('/api/agent-chat/analyze', {
                surveyId: activeSurvey.id,
                message: input,
                language: i18n.language // Pass language for AI instruction
            });

            setMessages(prev => [...prev, { role: 'assistant', content: res.data.text }]);
        } catch (err) {
            console.error(err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I encountered an error while analyzing the data. Please ensure the survey has responses and try again.",
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectSurvey = (survey) => {
        setActiveSurvey(survey);
        setMessages([]); // Clear previous messages
    };

    const handleBackToList = () => {
        setActiveSurvey(null);
        setMessages([]);
        loadSurveys(); // Refresh list
    };

    // Use Portal to render the Chat Window (and default button if no custom trigger)
    const portalContent = (
        <>
            {/* Default Floating Button (Only if no custom trigger) */}
            {!triggerComponent && !isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-[9999] group border-4 border-white hover:border-blue-50"
                    style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.5)'
                    }}
                    title="Talk to AI Analyst"
                >
                    <MessageSquare className="w-8 h-8 group-hover:rotate-12 transition-transform fill-white/20" strokeWidth={2.5} />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center animate-bounce border-2 border-white shadow-sm">
                        AI
                    </div>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed transition-all duration-300 z-[9999] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white flex flex-col font-sans ${isMinimized
                    ? 'bottom-6 right-6 w-80 h-16'
                    : 'bottom-6 right-6 w-[450px] h-[600px] max-h-[80vh] max-w-[90vw]'
                    }`}>
                    {/* Header */}
                    <div className="p-4 flex items-center justify-between text-white shrink-0 shadow-md relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>

                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>

                        <div className="flex items-center gap-3 relative z-10">
                            {!surveyId && activeSurvey && (
                                <button onClick={handleBackToList} className="hover:bg-white/10 p-1.5 rounded-full text-white/90 transition-colors -ml-1">
                                    <ChevronLeft size={20} />
                                </button>
                            )}
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-inner border border-white/10">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold leading-none mb-1 text-white tracking-wide">
                                    {activeSurvey ? 'Survey Analyst' : 'AI Assistant'}
                                </h3>
                                <p className="text-[10px] text-blue-200 font-medium truncate max-w-[180px]">
                                    {activeSurvey ? (activeSurvey.title.length > 25 ? activeSurvey.title.substring(0, 25) + '...' : activeSurvey.title) : 'Select a survey to analyze'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 relative z-10">
                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-red-500/80 rounded-lg transition-colors text-white/80 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {!isMinimized && (
                        <>
                            {/* View: Survey Selection List (Global Mode Only) */}
                            {!activeSurvey && (
                                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
                                    <div className="text-center mb-6 mt-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Sparkles className="w-8 h-8 text-blue-600" />
                                        </div>
                                        <h3 className="text-slate-800 font-bold text-lg">AI Intelligence</h3>
                                        <p className="text-slate-500 text-sm px-8">Where would you like to start? Select a survey to generate insights.</p>
                                    </div>

                                    {isLoadingSurveys ? (
                                        <div className="flex justify-center py-10">
                                            <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pb-4">
                                            {availableSurveys.map(survey => (
                                                <button
                                                    key={survey.id}
                                                    onClick={() => handleSelectSurvey(survey)}
                                                    className="w-full text-left p-4 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition-all shadow-sm hover:shadow-md group relative overflow-hidden"
                                                >
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    <div className="flex justify-between items-center">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 transition-colors shadow-inner">
                                                                <FileText size={20} />
                                                            </div>
                                                            <span className="font-semibold text-slate-700 group-hover:text-blue-800 text-sm line-clamp-1">{survey.title}</span>
                                                        </div>
                                                        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </button>
                                            ))}
                                            {availableSurveys.length === 0 && (
                                                <div className="text-center py-10 text-slate-400 bg-slate-100 rounded-xl border border-dashed border-slate-300">
                                                    No active surveys found.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View: Chat Interface */}
                            {activeSurvey && (
                                <>
                                    <div
                                        ref={scrollRef}
                                        className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-6 scroll-smooth"
                                    >
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center shadow-md border-2 border-white ${msg.role === 'user'
                                                        ? 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500'
                                                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                                        }`}>
                                                        {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                                                    </div>
                                                    <div className={`p-4 rounded-2xl text-[13px] shadow-sm ${msg.role === 'user'
                                                        ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-500/20'
                                                        : msg.isError
                                                            ? 'bg-red-50 border border-red-200 text-red-700 rounded-tl-none'
                                                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
                                                        }`}>
                                                        <div className="max-w-none">
                                                            {renderMessage(msg.content)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && (
                                            <div className="flex justify-start animate-fade-in-up">
                                                <div className="flex gap-3 max-w-[90%]">
                                                    <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                                                        <Sparkles size={16} />
                                                    </div>
                                                    <div className="flex gap-2 items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm rounded-tl-none">
                                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Analyzing data...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Input Area */}
                                    <form
                                        onSubmit={handleSend}
                                        className="p-4 bg-white border-t border-slate-200 flex gap-3 shrink-0 relative z-20 shadow-[0_-5px_20px_-10px_rgba(0,0,0,0.05)]"
                                    >
                                        <input
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder={i18n.language.startsWith('ar') ? "Ask about insights..." : "Ask about trends, summaries, or specific questions..."}
                                            className="flex-1 bg-slate-50 border-slate-200 rounded-xl px-4 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                                            disabled={isLoading}
                                            dir={i18n.language.startsWith('ar') ? 'rtl' : 'ltr'}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isLoading}
                                            className={`p-3.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center aspect-square ${!input.trim() || isLoading
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/30 hover:-translate-y-1'
                                                }`}
                                        >
                                            <Send size={20} className={i18n.language.startsWith('ar') ? 'rotate-180' : ''} />
                                        </button>
                                    </form>
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    );

    return (
        <>
            {triggerComponent && (
                <div onClick={() => setIsOpen(true)} className="inline-flex cursor-pointer">
                    {triggerComponent}
                </div>
            )}
            {createPortal(portalContent, document.body)}
        </>
    );
}
