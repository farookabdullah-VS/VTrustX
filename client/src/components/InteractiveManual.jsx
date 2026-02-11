import React, { useState } from 'react';
import {
    BookOpen, Search, Star, Rocket, Palette, BarChart3,
    Bot, Code, ChevronRight, Play, Copy, CheckCircle2,
    Shield, Layers, Zap, Smartphone, ArrowRight,
    Map, Users, Ticket, Share2, Globe, Database,
    Lock, Settings, Layout, MessageSquare, Headphones,
    ListChecks, GitBranch, Languages, FileJson, MousePointer2
} from 'lucide-react';

const SECTIONS = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: <Rocket size={20} />,
        color: '#3b82f6',
        content: [
            {
                title: 'Welcome to RayixCX',
                text: 'RayixCX is an end-to-end Enterprise Experience Management (XM) platform. It allows organizations to listen to customers, analyze feedback, and close the loop through automated ticketing and workflows.'
            },
            {
                title: 'System Access',
                text: 'Environment: development\nLocal URL: http://localhost:5173\nProduction: https://rayixcx.web.app',
                code: 'npm run dev // Launching the dev environment'
            }
        ]
    },
    {
        id: 'surveys',
        title: 'Surveys & Feedback',
        icon: <BookOpen size={20} />,
        color: '#10b981',
        content: [
            {
                title: 'The Question Palette',
                text: 'RayiX supports 20+ specialized field types for deep data collection:\n• Standard: Single line, Long text, Dropdowns, Checkboxes.\n• Advanced: Matrix (Single/Multi-select), Ranking, Image Picker.\n• Dynamic: Dynamic Panels and Dynamic Matrices allow users to add/remove rows on the fly.\n• Interactive: Signature pads, File Uploads, and Expression-based fields.'
            },
            {
                title: 'Survey Structure & Flow',
                text: 'Organize your survey for maximum completion rates:\n• Navigation: Choose between "All questions on one page" or "One question per page" (Card view).\n• Progress Tracking: Enable progress bars (Top/Bottom) or page numbering.\n• Auto-Advance: Automatically move to the next page when a question is answered.'
            },
            {
                title: 'Campaign Distribution',
                text: 'Distribute surveys via Web, Email, SMS (via Integrations), or through the Frontline Mobile App for offline collection.'
            }
        ]
    },
    {
        id: 'logic',
        title: 'Advanced Logic & Rules',
        icon: <GitBranch size={20} />,
        color: '#f97316',
        content: [
            {
                title: 'Conditional Visibility',
                text: 'Create dynamic forms that react to the user. Show or hide questions, panels, or entire pages based on previous answers (e.g., "Show Question B ONLY IF Question A is Yes").'
            },
            {
                title: 'Skip Logic & Branching',
                text: 'Use the Logic Tab to define navigation rules. Skip directly to the "Thank You" page or a specific section based on scores or demographic data.'
            },
            {
                title: 'Validation & Masking',
                text: 'Ensure data quality at the source:\n• Input Masks: Enforce phone formats (e.g., +1 (999) 999-9999) or custom patterns.\n• Custom Validators: Use Regex or expression-based logic to validate emails, IDs, or numeric ranges.'
            },
            {
                title: 'Calculated Values & Triggers',
                text: 'Perform real-time calculations. Display a "Total Score" to the respondent or trigger backend actions (like sending an email) when specific logic matches.',
                premium: true
            }
        ]
    },
    {
        id: 'localization',
        title: 'Multi-Language Surveys',
        icon: <Languages size={20} />,
        color: '#0ea5e9',
        content: [
            {
                title: 'The Translation Hub',
                text: 'RayiX allows a single survey to exist in multiple languages (English, Arabic, Spanish, etc.). Users can switch languages via a dropdown, and the UI (buttons, progress bars) updates automatically.'
            },
            {
                title: 'RTL/LTR Support',
                text: 'Full support for bidirectional layouts. When a user selects Arabic, the survey automatically reverses the layout for a seamless native experience.'
            }
        ]
    },
    {
        id: 'analytics',
        title: 'Analytics & Studio',
        icon: <BarChart3 size={20} />,
        color: '#f43f5e',
        content: [
            {
                title: 'Analytics Studio',
                text: 'The core engine for data visualization. Use the Studio to create custom charts, drag-and-drop widgets, and complex dashboards that can be shared publicly via tokens.',
                interactive: 'studio-tip'
            },
            {
                title: 'Text IQ (AI Insights)',
                text: 'Automatically categorize thousands of open-ended comments using NLP. Identify sentiment (Positive/Negative/Neutral) and extract recurring themes instantly.'
            },
            {
                title: 'Dynamic Dashboards',
                text: 'Dashboards that live-update as new survey responses arrive. Support for filtering by date, demographic, and sentiment.'
            }
        ]
    },
    {
        id: 'engagement',
        title: 'Ticketing & Loops',
        icon: <Ticket size={20} />,
        color: '#8b5cf6',
        content: [
            {
                title: 'Closed-Loop Feedback',
                text: 'Automatically create a support ticket whenever a customer leaves a negative score (e.g., NPS < 6). This ensures the "Inner Loop" is closed.'
            },
            {
                title: 'SLA Management',
                text: 'Assign response and resolution deadlines to tickets. Track team performance through the Engagement Dashboard.'
            },
            {
                title: 'Action Planning',
                text: 'Move from "Observation" to "Action". Create strategic tasks based on insights and track their impact on future scores.'
            }
        ]
    },
    {
        id: 'journey',
        title: 'Journey & Personas',
        icon: <Map size={20} />,
        color: '#d946ef',
        content: [
            {
                title: 'Journey Mapping (CJM)',
                text: 'Visualize the customer lifecycle. Map stages, touchpoints, and emotional highs/lows and link them directly to real survey data.'
            },
            {
                title: 'Persona Engine',
                text: 'Create data-driven customer archetypes. Use the AI Persona generator to build complete profiles including goals, frustrations, and buying patterns.',
                premium: true
            }
        ]
    },
    {
        id: 'ai-agents',
        title: 'Voice & Video Agents',
        icon: <Bot size={20} />,
        color: '#14b8a6',
        content: [
            {
                title: 'AI Voice Surveyor',
                text: 'Replace static forms with a conversational AI agent. The agent can interview respondents over the phone or browser, asking follow-up questions based on their answers.'
            },
            {
                title: 'Video Agent Interface',
                text: 'Face-to-face AI interactions. Collect visual and emotional cues alongside verbal feedback for a more empathetic experience.'
            }
        ]
    },
    {
        id: 'themes',
        title: 'Custom Branding',
        icon: <Palette size={20} />,
        color: '#f43f5e',
        content: [
            {
                title: 'Tenant Themes',
                text: 'Apply global branding across the entire platform. Every survey, shared report, and dashboard will automatically inherit your company colors, logos, and fonts.'
            },
            {
                title: 'Advanced CSS Control',
                text: 'Fine-tune button radius, gradients, and typography for a pixel-perfect match with your brand guidelines.'
            }
        ]
    },
    {
        id: 'admin',
        title: 'Governance & JSON',
        icon: <FileJson size={20} />,
        color: '#475569',
        content: [
            {
                title: 'JSON Schema Control',
                text: 'Every survey in RayiX is stored as a portable JSON schema. Advanced users can edit this schema directly to implement complex behaviors not available in the visual builder.'
            },
            {
                title: 'Role-Based Access (RBAC)',
                text: 'Define granular permissions. Create roles for "Survey Designers", "Data Analysts", and "Ticketing Agents" to restrict data access as needed.'
            }
        ]
    },
    {
        id: 'sdk',
        title: 'Integrations & SDK',
        icon: <Code size={20} />,
        color: '#1e293b',
        content: [
            {
                title: 'Javascript SDK',
                text: 'Embed RayixCX anywhere. Initialize with a simple script tag.',
                code: '<script src="https://rayixcx.web.app/rayix-sdk.js"></script>'
            }
        ]
    }
];

export function InteractiveManual() {
    const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
    const [searchQuery, setSearchQuery] = useState('');
    const [copied, setCopied] = useState(null);

    const section = SECTIONS.find(s => s.id === activeSection);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <div style={{
            height: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
            fontFamily: "'Outfit', sans-serif",
            color: '#1e293b',
            borderRadius: '16px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '40px 60px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                color: 'white',
                position: 'relative',
                flexShrink: 0
            }}>
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '12px', color: '#60a5fa' }}>
                            <BookOpen size={24} />
                        </div>
                        <span style={{ fontWeight: '700', letterSpacing: '2px', fontSize: '0.8rem', opacity: 0.8 }}>COMPREHENSIVE KNOWLEDGE BASE</span>
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', letterSpacing: '-0.5px' }}>RayiX Pro Documentation</h1>
                    <p style={{ fontSize: '1.1rem', opacity: 0.7, maxWidth: '700px' }}>
                        Master every setting of the RayiX Experience Tool. From advanced Survey logic and multi-language support to enterprise data governance.
                    </p>
                </div>

                <div style={{
                    position: 'absolute', top: '-50px', right: '-50px',
                    width: '300px', height: '300px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                    zIndex: 1
                }} />
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                display: 'flex',
                gap: '0',
                overflow: 'hidden'
            }}>
                {/* Sidebar Navigation */}
                <div style={{
                    width: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '30px',
                    background: 'white',
                    borderRight: '1px solid #e2e8f0'
                }}>
                    <div style={{
                        position: 'relative',
                        marginBottom: '20px'
                    }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={16} />
                        <input
                            type="text"
                            placeholder="Find features or settings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 36px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                outline: 'none',
                                fontSize: '0.9rem',
                                background: '#f8fafc',
                                transition: 'all 0.2s'
                            }}
                        />
                    </div>

                    <div style={{ overflowY: 'auto' }}>
                        {SECTIONS.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSection(s.id)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: activeSection === s.id ? `${s.color}10` : 'transparent',
                                    color: activeSection === s.id ? s.color : '#64748b',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s',
                                    marginBottom: '4px'
                                }}
                            >
                                <span style={{
                                    color: activeSection === s.id ? s.color : '#94a3b8',
                                    display: 'flex'
                                }}>
                                    {s.icon}
                                </span>
                                {s.title}
                                {activeSection === s.id && <ChevronRight size={14} style={{ marginLeft: 'auto' }} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Pane */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '50px 80px',
                    background: 'white'
                }}>
                    <div style={{ maxWidth: '900px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '50px' }}>
                            <div style={{
                                background: `${section.color}10`,
                                color: section.color,
                                padding: '20px',
                                borderRadius: '20px'
                            }}>
                                {React.cloneElement(section.icon, { size: 32 })}
                            </div>
                            <div>
                                <h2 style={{ fontSize: '2.4rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>{section.title}</h2>
                                <div style={{ height: '4px', width: '60px', borderRadius: '2px', background: section.color, marginTop: '8px' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
                            {section.content.map((block, idx) => (
                                <div key={idx}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>{block.title}</h3>
                                        {block.premium && (
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#fef3c7',
                                                color: '#d97706',
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontWeight: '700',
                                                border: '1px solid #fcd34d'
                                            }}>ENTERPRISE</span>
                                        )}
                                    </div>

                                    <p style={{
                                        lineHeight: '1.8',
                                        color: '#475569',
                                        fontSize: '1.1rem',
                                        whiteSpace: 'pre-line',
                                        marginBottom: '24px'
                                    }}>
                                        {block.text}
                                    </p>

                                    {block.code && (
                                        <div style={{
                                            background: '#1e293b',
                                            padding: '24px',
                                            borderRadius: '16px',
                                            position: 'relative',
                                            color: '#f1f5f9',
                                            fontSize: '0.95rem',
                                            fontFamily: "'Fira Code', 'Courier New', monospace"
                                        }}>
                                            <button
                                                onClick={() => handleCopy(block.code, `${idx}-code`)}
                                                style={{
                                                    position: 'absolute', right: '16px', top: '16px',
                                                    background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
                                                    padding: '8px', color: 'white', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', transition: 'all 0.2s'
                                                }}>
                                                {copied === `${idx}-code` ? <CheckCircle2 size={16} color="#4ade80" /> : <Copy size={16} />}
                                            </button>
                                            <pre style={{ margin: 0, overflowX: 'auto' }}>{block.code}</pre>
                                        </div>
                                    )}

                                    {block.interactive === 'studio-tip' && (
                                        <div style={{
                                            padding: '24px',
                                            background: '#f0f9ff',
                                            borderRadius: '16px',
                                            border: '1px solid #bae6fd',
                                            display: 'flex',
                                            gap: '16px'
                                        }}>
                                            <Zap size={24} color="#0284c7" />
                                            <div>
                                                <div style={{ fontWeight: '700', color: '#0369a1', marginBottom: '4px' }}>Pro Tip: Public Sharing</div>
                                                <div style={{ fontSize: '0.95rem', color: '#0c4a6e' }}>
                                                    Each report in the Studio generates a unique secure token. Share this URL with stakeholders to let them view live data without requiring a login.
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
