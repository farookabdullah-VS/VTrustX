import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Smile, Briefcase, ShoppingBag, Globe, BarChart2, Star, Users, Zap, Search } from 'lucide-react';

export function XMLanding({ onSelectDomain, onNavigate }) {
    const { t } = useTranslation();

    // 5 Domains of XM
    const domains = [
        {
            id: 'CX',
            title: 'Customer Experience',
            subtitle: 'Understand & improve every touchpoint.',
            icon: <Smile size={48} />,
            color: '#0ea5e9', // Sky Blue
            features: ['NPS & CSAT Tracking', 'Journey Optimization', 'Churn Prediction'],
            bgGradient: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
        },
        {
            id: 'EX',
            title: 'Employee Experience',
            subtitle: 'Engage your workforce & retain talent.',
            icon: <Briefcase size={48} />,
            color: '#8b5cf6', // Violet
            features: ['Engagement Pulse', '360 Reviews', 'Onboarding Feedback'],
            bgGradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
        },
        {
            id: 'PX',
            title: 'Product Experience',
            subtitle: 'Build products people love.',
            icon: <ShoppingBag size={48} />,
            color: '#f59e0b', // Amber
            features: ['Product Satisfaction', 'Feature Adoption', 'UX Testing'],
            bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
        },
        {
            id: 'BX',
            title: 'Brand Experience',
            subtitle: 'Grow your brand equity & awareness.',
            icon: <Star size={48} />,
            color: '#ec4899', // Pink
            features: ['Brand Sentiment', 'Competitor Analysis', 'Ad Effectiveness'],
            bgGradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
        },
        {
            id: 'MR',
            title: 'Market Research',
            subtitle: 'Uncover deeper market insights.',
            icon: <Search size={48} />,
            color: '#10b981', // Emerald
            features: ['Market Trends', 'Panel Surveys', 'Concept Testing'],
            bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(255, 255, 255, 0) 100%)'
        }
    ];

    const [hovered, setHovered] = useState(null);

    return (
        <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text-color)', marginBottom: '10px', letterSpacing: '-1px' }}>
                    Experience Management (XM)
                </h1>
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                    Select a domain to manage, analyze, and improve experiences.
                </p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '30px',
                padding: '10px'
            }}>
                {domains.map(domain => (
                    <div
                        key={domain.id}
                        onClick={() => onSelectDomain(domain.id)}
                        onMouseEnter={() => setHovered(domain.id)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '30px',
                            border: '1px solid var(--input-border)',
                            cursor: 'pointer',
                            position: 'relative',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: hovered === domain.id ? 'translateY(-5px)' : 'none',
                            boxShadow: hovered === domain.id ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            backgroundImage: domain.bgGradient
                        }}
                    >
                        <div style={{
                            width: '80px', height: '80px',
                            borderRadius: '20px',
                            background: domain.color,
                            color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: '20px',
                            boxShadow: `0 10px 15px -3px ${domain.color}40`
                        }}>
                            {domain.icon}
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-color)', marginBottom: '8px' }}>
                            {domain.title}
                        </h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
                            {domain.subtitle}
                        </p>

                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '20px' }}>
                            {domain.features.map((feature, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: domain.color, fontWeight: '500', fontSize: '0.9rem' }}>
                                    <Zap size={14} fill={domain.color} /> {feature}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => onNavigate('dashboard')}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '1rem', textDecoration: 'underline'
                    }}
                >
                    Or proceed to general dashboard
                </button>
            </div>
        </div>
    );
}
