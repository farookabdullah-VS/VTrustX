import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, FileText, Zap, ShoppingCart, RefreshCw, Monitor, Plus } from 'lucide-react';

const BUILT_IN_TEMPLATES = [
    {
        id: 'tpl_onboarding',
        title: 'Customer Onboarding',
        description: 'Awareness > Sign-Up > Activation > First Value > Retention',
        icon: Zap,
        category: 'onboarding',
        data: {
            project_name: 'Customer Onboarding Journey',
            stages: [
                { id: 'st_1', name: 'Awareness', style: { bg_color: '#eff6ff', text_color: '#1e40af' } },
                { id: 'st_2', name: 'Sign-Up', style: { bg_color: '#f0fdf4', text_color: '#166534' } },
                { id: 'st_3', name: 'Activation', style: { bg_color: '#fefce8', text_color: '#854d0e' } },
                { id: 'st_4', name: 'First Value', style: { bg_color: '#fdf4ff', text_color: '#86198f' } },
                { id: 'st_5', name: 'Retention', style: { bg_color: '#f0f9ff', text_color: '#0c4a6e' } }
            ],
            sections: [
                { id: 'sec_1', type: 'text', title: 'User Goals', cells: {
                    st_1: { value: 'Discover solution' }, st_2: { value: 'Create account' },
                    st_3: { value: 'Complete setup' }, st_4: { value: 'Achieve first success' }, st_5: { value: 'Integrate into workflow' }
                }},
                { id: 'sec_2', type: 'touchpoints', title: 'Touchpoints', cells: {
                    st_1: { items: [{ label: 'Website', color: '#3b82f6' }, { label: 'Social Ads', color: '#8b5cf6' }] },
                    st_2: { items: [{ label: 'Sign-up Form', color: '#10b981' }] },
                    st_3: { items: [{ label: 'Onboarding Wizard', color: '#f59e0b' }] },
                    st_4: { items: [{ label: 'Dashboard', color: '#ec4899' }] },
                    st_5: { items: [{ label: 'Email', color: '#6366f1' }, { label: 'In-app', color: '#14b8a6' }] }
                }},
                { id: 'sec_3', type: 'sentiment_graph', title: 'Customer Emotion', cells: {
                    st_1: { value: 1 }, st_2: { value: 2 }, st_3: { value: -1 }, st_4: { value: 4 }, st_5: { value: 3 }
                }},
                { id: 'sec_4', type: 'text', title: 'Pain Points', cells: {
                    st_1: { value: 'Too many options' }, st_3: { value: 'Complex setup process' }
                }}
            ]
        }
    },
    {
        id: 'tpl_support',
        title: 'Support Journey',
        description: 'Issue > Contact Support > Resolution > Follow-Up',
        icon: FileText,
        category: 'support',
        data: {
            project_name: 'Support Journey',
            stages: [
                { id: 'st_1', name: 'Issue Occurs', style: { bg_color: '#fef2f2', text_color: '#991b1b' } },
                { id: 'st_2', name: 'Contact Support', style: { bg_color: '#eff6ff', text_color: '#1e40af' } },
                { id: 'st_3', name: 'Resolution', style: { bg_color: '#f0fdf4', text_color: '#166534' } },
                { id: 'st_4', name: 'Follow-Up', style: { bg_color: '#fefce8', text_color: '#854d0e' } }
            ],
            sections: [
                { id: 'sec_1', type: 'text', title: 'Customer Actions', cells: {
                    st_1: { value: 'Identify problem' }, st_2: { value: 'Submit ticket / call' },
                    st_3: { value: 'Work with agent' }, st_4: { value: 'Rate experience' }
                }},
                { id: 'sec_2', type: 'sentiment_graph', title: 'Emotion', cells: {
                    st_1: { value: -4 }, st_2: { value: -2 }, st_3: { value: 2 }, st_4: { value: 3 }
                }},
                { id: 'sec_3', type: 'touchpoints', title: 'Channels', cells: {
                    st_2: { items: [{ label: 'Phone', color: '#10b981' }, { label: 'Chat', color: '#3b82f6' }, { label: 'Email', color: '#6366f1' }] }
                }}
            ]
        }
    },
    {
        id: 'tpl_purchase',
        title: 'Purchase Journey',
        description: 'Need Recognition > Research > Evaluation > Purchase > Post-Purchase',
        icon: ShoppingCart,
        category: 'sales',
        data: {
            project_name: 'Purchase Journey',
            stages: [
                { id: 'st_1', name: 'Need Recognition', style: { bg_color: '#fdf4ff', text_color: '#86198f' } },
                { id: 'st_2', name: 'Research', style: { bg_color: '#eff6ff', text_color: '#1e40af' } },
                { id: 'st_3', name: 'Evaluation', style: { bg_color: '#fefce8', text_color: '#854d0e' } },
                { id: 'st_4', name: 'Purchase', style: { bg_color: '#f0fdf4', text_color: '#166534' } },
                { id: 'st_5', name: 'Post-Purchase', style: { bg_color: '#f0f9ff', text_color: '#0c4a6e' } }
            ],
            sections: [
                { id: 'sec_1', type: 'text', title: 'User Goals', cells: {
                    st_1: { value: 'Identify need' }, st_2: { value: 'Find options' },
                    st_3: { value: 'Compare alternatives' }, st_4: { value: 'Complete purchase' }, st_5: { value: 'Get value from product' }
                }},
                { id: 'sec_2', type: 'sentiment_graph', title: 'Customer Emotion', cells: {
                    st_1: { value: 0 }, st_2: { value: 1 }, st_3: { value: -1 }, st_4: { value: 4 }, st_5: { value: 3 }
                }},
                { id: 'sec_3', type: 'touchpoints', title: 'Touchpoints', cells: {
                    st_1: { items: [{ label: 'Word of mouth', color: '#8b5cf6' }] },
                    st_2: { items: [{ label: 'Google', color: '#3b82f6' }, { label: 'Reviews', color: '#10b981' }] },
                    st_4: { items: [{ label: 'Website', color: '#f59e0b' }, { label: 'Store', color: '#ec4899' }] }
                }}
            ]
        }
    },
    {
        id: 'tpl_renewal',
        title: 'Renewal Journey',
        description: 'Usage Review > Communication > Negotiation > Decision',
        icon: RefreshCw,
        category: 'retention',
        data: {
            project_name: 'Renewal Journey',
            stages: [
                { id: 'st_1', name: 'Usage Review', style: { bg_color: '#eff6ff', text_color: '#1e40af' } },
                { id: 'st_2', name: 'Communication', style: { bg_color: '#fefce8', text_color: '#854d0e' } },
                { id: 'st_3', name: 'Negotiation', style: { bg_color: '#fdf4ff', text_color: '#86198f' } },
                { id: 'st_4', name: 'Decision', style: { bg_color: '#f0fdf4', text_color: '#166534' } }
            ],
            sections: [
                { id: 'sec_1', type: 'text', title: 'Customer Actions', cells: {
                    st_1: { value: 'Evaluate ROI' }, st_2: { value: 'Receive renewal notice' },
                    st_3: { value: 'Discuss terms' }, st_4: { value: 'Renew or churn' }
                }},
                { id: 'sec_2', type: 'sentiment_graph', title: 'Emotion', cells: {
                    st_1: { value: 1 }, st_2: { value: 0 }, st_3: { value: -1 }, st_4: { value: 3 }
                }}
            ]
        }
    },
    {
        id: 'tpl_digital',
        title: 'Digital Experience',
        description: 'Discovery > Registration > First Use > Regular Use > Advocacy',
        icon: Monitor,
        category: 'digital',
        data: {
            project_name: 'Digital Experience Journey',
            stages: [
                { id: 'st_1', name: 'Discovery', style: { bg_color: '#f0f9ff', text_color: '#0c4a6e' } },
                { id: 'st_2', name: 'Registration', style: { bg_color: '#eff6ff', text_color: '#1e40af' } },
                { id: 'st_3', name: 'First Use', style: { bg_color: '#fefce8', text_color: '#854d0e' } },
                { id: 'st_4', name: 'Regular Use', style: { bg_color: '#f0fdf4', text_color: '#166534' } },
                { id: 'st_5', name: 'Advocacy', style: { bg_color: '#fdf4ff', text_color: '#86198f' } }
            ],
            sections: [
                { id: 'sec_1', type: 'text', title: 'User Actions', cells: {
                    st_1: { value: 'Search, browse' }, st_2: { value: 'Create profile' },
                    st_3: { value: 'Explore features' }, st_4: { value: 'Daily usage' }, st_5: { value: 'Refer others' }
                }},
                { id: 'sec_2', type: 'sentiment_graph', title: 'Experience', cells: {
                    st_1: { value: 2 }, st_2: { value: 0 }, st_3: { value: 3 }, st_4: { value: 4 }, st_5: { value: 5 }
                }},
                { id: 'sec_3', type: 'touchpoints', title: 'Touchpoints', cells: {
                    st_1: { items: [{ label: 'SEO', color: '#3b82f6' }, { label: 'Social', color: '#8b5cf6' }] },
                    st_2: { items: [{ label: 'App', color: '#10b981' }] },
                    st_5: { items: [{ label: 'Referral', color: '#f59e0b' }, { label: 'Reviews', color: '#ec4899' }] }
                }}
            ]
        }
    }
];

export function TemplateGallery({ onSelect, onClose, onBlank }) {
    const [serverTemplates, setServerTemplates] = useState([]);

    useEffect(() => {
        axios.get('/api/cjm/templates/list').then(res => {
            setServerTemplates(res.data);
        }).catch(() => {});
    }, []);

    const allTemplates = [...BUILT_IN_TEMPLATES, ...serverTemplates.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || t.category || 'Custom Template',
        icon: FileText,
        category: t.category || 'custom',
        data: t.data
    }))];

    return (
        <div className="cjm-tpl-overlay" onClick={onClose}>
            <div className="cjm-tpl-modal" onClick={e => e.stopPropagation()}>
                <div className="cjm-tpl-header">
                    <h3>Choose a Template</h3>
                    <button className="cjm-tpl-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="cjm-tpl-grid">
                    <div className="cjm-tpl-card blank" onClick={onBlank}>
                        <Plus size={32} />
                        <h4>Blank Map</h4>
                        <p>Start from scratch</p>
                    </div>
                    {allTemplates.map(tpl => {
                        const Icon = tpl.icon || FileText;
                        return (
                            <div key={tpl.id} className="cjm-tpl-card" onClick={() => onSelect(tpl)}>
                                <Icon size={28} />
                                <h4>{tpl.title}</h4>
                                <p>{tpl.description}</p>
                                <div className="cjm-tpl-stages">
                                    {(tpl.data?.stages || []).length} stages, {(tpl.data?.sections || []).length} sections
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
