import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Signup } from './Signup';
import { Login } from './Login';
import { useToast } from './common/Toast';

export function LandingPage({ onLogin }) {
    const toast = useToast();
    const { t, i18n } = useTranslation();
    const [view, setView] = useState('home'); // home, login, signup
    const [plans, setPlans] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    useEffect(() => {
        axios.get('/api/plans').then(res => {
            const planData = res.data.plans || res.data;
            setPlans(Array.isArray(planData) ? planData : []);
        }).catch(err => {
            console.error("Failed to load plans:", err);
            setPlans([]);
        });
    }, []);

    const scrollToPricing = () => {
        document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
    };

    if (view === 'login') {
        return <Login onLogin={onLogin} onBack={() => setView('home')} />;
    }

    if (view === 'signup') {
        return (
            <Signup
                onSignupSuccess={async (email, password) => {
                    // Auto login attempt or redirect to login
                    try {
                        const res = await axios.post('/api/auth/login', { username: email, password });
                        onLogin(res.data);
                    } catch (e) {
                        toast.info("Registration successful! Please login.");
                        setView('login');
                    }
                }}
                onBack={() => setView('home')}
                initialPlanId={selectedPlanId}
            />
        );
    }

    return (
        <div style={{ fontFamily: "'Outfit', sans-serif", color: 'var(--text-color)', background: 'var(--deep-bg)' }}>
            {/* Header */}
            <header role="banner" style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--sidebar-border)', zIndex: 1000,
                height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ maxWidth: '1280px', width: '100%', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/rayix_v2.jpg" alt="RayiX" style={{ height: '120px' }} />
                        <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#0f172a', letterSpacing: '-0.5px' }}>RayiX</span>
                    </div>

                    {/* Desktop Nav */}
                    <nav aria-label="Main navigation" style={{ display: 'flex', gap: '30px', alignItems: 'center' }} className="desktop-nav">
                        <a href="#features" style={{ textDecoration: 'none', color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>{t('landing.nav.features')}</a>
                        <a href="#pricing" style={{ textDecoration: 'none', color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>{t('landing.nav.pricing')}</a>
                        <a href="#resources" style={{ textDecoration: 'none', color: '#475569', fontWeight: '500', fontSize: '0.95rem' }}>{t('landing.nav.resources')}</a>
                    </nav>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en'); } }}
                            style={{ cursor: 'pointer', padding: '8px', borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                            aria-label={i18n.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}
                        >
                            <Globe size={20} color="#334155" />
                        </div>
                        <button
                            onClick={() => setView('login')}
                            style={{
                                padding: '8px 20px', background: 'transparent', border: 'none',
                                color: '#334155', fontWeight: '600', cursor: 'pointer', fontSize: '0.95rem'
                            }}
                        >
                            {t('landing.nav.login')}
                        </button>
                        <button
                            onClick={() => setView('signup')}
                            style={{
                                padding: '10px 24px', background: 'var(--primary-color)', border: 'none',
                                color: '#ffffff', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                            }}
                        >
                            {t('landing.nav.get_started')}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section style={{
                paddingTop: '180px', paddingBottom: '120px',
                background: 'radial-gradient(ellipse at top, rgba(44, 155, 173, 0.08), transparent 50%)',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
                    <h1 style={{
                        fontSize: '3.75rem', fontWeight: '800', lineHeight: '1.1', color: '#0f172a', marginBottom: '24px',
                        letterSpacing: '-1px'
                    }}>
                        {t('landing.hero.title')} <br />
                        <span style={{ color: 'var(--primary-color)' }}>{t('landing.hero.title_highlight')}</span>
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#64748b', marginBottom: '40px', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 40px auto' }}>
                        {t('landing.hero.subtitle')}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                        <button
                            onClick={() => setView('signup')}
                            style={{
                                padding: '16px 32px', background: 'var(--primary-color)', border: 'none',
                                color: '#ffffff', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem',
                                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                            }}
                        >
                            {t('landing.hero.start_free')}
                        </button>
                        <button
                            onClick={scrollToPricing}
                            style={{
                                padding: '16px 32px', background: '#ffffff', border: '1px solid #e2e8f0',
                                color: '#334155', fontWeight: '600', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem',
                                boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)'
                            }}
                        >
                            {t('landing.hero.view_pricing')}
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Preview */}
            <section id="features" style={{ padding: '100px 24px', background: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '16px', letterSpacing: '-0.5px' }}>{t('landing.features.title')}</h2>
                        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>{t('landing.features.subtitle')}</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px' }}>
                        {/* Feature 1 */}
                        <div style={{ padding: '40px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ width: '48px', height: '48px', background: 'var(--primary-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#ffffff', fontWeight: 'bold' }}>CJ</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>{t('landing.feature.cjm')}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>{t('landing.feature.cjm_desc')}</p>
                        </div>
                        {/* Feature 2 */}
                        <div style={{ padding: '40px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ width: '48px', height: '48px', background: 'var(--primary-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#ffffff', fontWeight: 'bold' }}>P</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>{t('landing.feature.personas')}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>{t('landing.feature.personas_desc')}</p>
                        </div>
                        {/* Feature 3 */}
                        <div style={{ padding: '40px', borderRadius: '20px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            <div style={{ width: '48px', height: '48px', background: 'var(--primary-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', color: '#ffffff', fontWeight: 'bold' }}>S</div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#1e293b' }}>{t('landing.feature.surveys')}</h3>
                            <p style={{ color: '#64748b', lineHeight: '1.6' }}>{t('landing.feature.surveys_desc')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" style={{ padding: '100px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '16px', color: '#0f172a' }}>{t('landing.pricing.title')}</h2>
                        <p style={{ fontSize: '1.2rem', color: '#64748b' }}>{t('landing.pricing.subtitle')}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        {Array.isArray(plans) && plans.length > 0 ? plans.map(plan => (
                            <div key={plan.id} style={{
                                background: '#ffffff', color: '#1e293b', borderRadius: '20px', padding: '40px',
                                display: 'flex', flexDirection: 'column',
                                border: plan.name === 'Professional' ? '2px solid var(--primary-color)' : '1px solid #e2e8f0',
                                position: 'relative',
                                boxShadow: plan.name === 'Professional' ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                            }}>
                                {plan.name === 'Professional' && (
                                    <div style={{
                                        position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                                        background: 'var(--primary-color)', color: '#ffffff', padding: '6px 16px', borderRadius: '20px', fontWeight: '600', fontSize: '0.85rem'
                                    }}>
                                        {t('landing.card.most_popular')}
                                    </div>
                                )}
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>{plan.name}</h3>
                                <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '10px', color: '#0f172a' }}>
                                    ${plan.price_monthly}<span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>/mo</span>
                                </div>
                                <p style={{ color: '#64748b', marginBottom: '30px' }}>{plan.description}</p>

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '30px', flex: 1 }}>
                                    {plan.features?.map((f, i) => (
                                        <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '15px', color: '#334155', alignItems: 'center' }}>
                                            <Check size={16} color="var(--primary-color)" /> {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => { setSelectedPlanId(plan.id); setView('signup'); }}
                                    style={{
                                        width: '100%', padding: '16px', borderRadius: '10px', border: 'none', fontWeight: '600', cursor: 'pointer',
                                        background: plan.name === 'Professional' ? 'var(--primary-color)' : '#f1f5f9',
                                        color: plan.name === 'Professional' ? '#ffffff' : '#334155',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {plan.price_monthly === 0 ? t('landing.hero.start_free') : t('landing.card.subscribe')}
                                </button>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', color: '#64748b', width: '100%', gridColumn: '1/-1' }}>
                                Loading plans or no plans available...
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer role="contentinfo" style={{ padding: '80px 24px', background: '#0f172a', color: '#94a3b8' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                        <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.5px' }}>RayiX</span>
                    </div>
                    <p>&copy; {t('landing.footer.rights')}</p>
                </div>
            </footer>
        </div>
    );
}
