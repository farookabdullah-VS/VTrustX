import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Signup } from './Signup';
import { Login } from './Login';

export function LandingPage({ onLogin }) {
    const [view, setView] = useState('home'); // home, login, signup
    const [plans, setPlans] = useState([]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);

    useEffect(() => {
        axios.get('/api/plans').then(res => setPlans(res.data)).catch(console.error);
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
                        alert("Registration successful! Please login.");
                        setView('login');
                    }
                }}
                onBack={() => setView('home')}
                initialPlanId={selectedPlanId}
            />
        );
    }

    return (
        <div style={{ fontFamily: "'Outfit', sans-serif", color: '#1f2937', background: '#ffffff' }}>
            {/* Header */}
            <header style={{
                position: 'fixed', top: 0, left: 0, right: 0,
                background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid #e5e7eb', zIndex: 1000,
                height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ maxWidth: '1280px', width: '100%', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/vtrustx_logo.jpg" alt="VTrustX" style={{ height: '40px' }} />
                        <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#064e3b', letterSpacing: '-0.5px' }}>VTrustX</span>
                    </div>

                    {/* Desktop Nav */}
                    <nav style={{ display: 'flex', gap: '30px', alignItems: 'center' }} className="desktop-nav">
                        <a href="#features" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: '500' }}>Features</a>
                        <a href="#pricing" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: '500' }}>Pricing</a>
                        <a href="#resources" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: '500' }}>Resources</a>
                    </nav>

                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button
                            onClick={() => setView('login')}
                            style={{
                                padding: '8px 20px', background: 'transparent', border: 'none',
                                color: '#064e3b', fontWeight: '600', cursor: 'pointer', fontSize: '1rem'
                            }}
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => setView('signup')}
                            style={{
                                padding: '10px 24px', background: '#064e3b', border: 'none',
                                color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '1rem',
                                boxShadow: '0 4px 6px -1px rgba(6, 78, 59, 0.1)'
                            }}
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section style={{
                paddingTop: '160px', paddingBottom: '100px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 24px' }}>
                    <h1 style={{
                        fontSize: '3.5rem', fontWeight: '800', lineHeight: '1.2', color: '#064e3b', marginBottom: '20px',
                        background: 'linear-gradient(to right, #064e3b, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' // Metallic Green Text
                    }}>
                        Customer Experience Management Reimagined.
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '40px', lineHeight: '1.6' }}>
                        Build professional customer journey maps, personas, and impact maps.
                        Collaborate with your team in real-time and export to high-quality documents.
                    </p>
                    <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                        <button
                            onClick={() => setView('signup')}
                            style={{
                                padding: '16px 32px', background: '#064e3b', border: 'none',
                                color: 'white', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem',
                                boxShadow: '0 10px 15px -3px rgba(6, 78, 59, 0.2)'
                            }}
                        >
                            Start for Free
                        </button>
                        <button
                            onClick={scrollToPricing}
                            style={{
                                padding: '16px 32px', background: 'white', border: '1px solid #d1d5db',
                                color: '#374151', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem'
                            }}
                        >
                            View Pricing
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Preview (Mock) */}
            <section id="features" style={{ padding: '80px 24px', background: 'white' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827', marginBottom: '10px' }}>Everything you need.</h2>
                        <p style={{ fontSize: '1.1rem', color: '#6b7280' }}>Powerful tools to map, track, and improve customer experience.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
                        {/* Feature 1 */}
                        <div style={{ padding: '30px', borderRadius: '16px', background: '#f9fafb' }}>
                            <div style={{ width: '50px', height: '50px', background: '#dcfce7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#166534', fontWeight: 'bold' }}>CJ</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '10px' }}>Customer Journey Mapping</h3>
                            <p style={{ color: '#6b7280' }}>Visualize the path your customers take.</p>
                        </div>
                        {/* Feature 2 */}
                        <div style={{ padding: '30px', borderRadius: '16px', background: '#f9fafb' }}>
                            <div style={{ width: '50px', height: '50px', background: '#dcfce7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#166534', fontWeight: 'bold' }}>P</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '10px' }}>Personas</h3>
                            <p style={{ color: '#6b7280' }}>Create deep user profiles to understand your audience.</p>
                        </div>
                        {/* Feature 3 */}
                        <div style={{ padding: '30px', borderRadius: '16px', background: '#f9fafb' }}>
                            <div style={{ width: '50px', height: '50px', background: '#dcfce7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', color: '#166534', fontWeight: 'bold' }}>S</div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '10px' }}>Surveys & Feedback</h3>
                            <p style={{ color: '#6b7280' }}>Collect feedback directly integrated with your maps.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" style={{ padding: '100px 24px', background: '#064e3b', color: 'white' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px', color: 'white' }}>Simple, transparent pricing</h2>
                        <p style={{ fontSize: '1.1rem', color: '#a7f3d0' }}>Choose the plan that's right for your team.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                        {plans.map(plan => (
                            <div key={plan.id} style={{
                                background: 'white', color: '#1f2937', borderRadius: '20px', padding: '40px',
                                display: 'flex', flexDirection: 'column',
                                border: plan.name === 'Professional' ? '4px solid #34d399' : 'none',
                                position: 'relative'
                            }}>
                                {plan.name === 'Professional' && (
                                    <div style={{
                                        position: 'absolute', top: -15, left: '50%', transform: 'translateX(-50%)',
                                        background: '#34d399', color: '#064e3b', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.8rem'
                                    }}>
                                        MOST POPULAR
                                    </div>
                                )}
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>{plan.name}</h3>
                                <div style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '10px', color: '#064e3b' }}>
                                    ${plan.price_monthly}<span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#6b7280' }}>/mo</span>
                                </div>
                                <p style={{ color: '#6b7280', marginBottom: '30px' }}>{plan.description}</p>

                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: '30px', flex: 1 }}>
                                    {plan.features?.map((f, i) => (
                                        <li key={i} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                                            <span style={{ color: '#059669', fontWeight: 'bold' }}>✓</span> {f}
                                        </li>
                                    ))}
                                </ul>

                                <button
                                    onClick={() => { setSelectedPlanId(plan.id); setView('signup'); }}
                                    style={{
                                        width: '100%', padding: '15px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
                                        background: plan.name === 'Professional' ? '#064e3b' : '#f3f4f6',
                                        color: plan.name === 'Professional' ? 'white' : '#1f2937'
                                    }}
                                >
                                    {plan.price_monthly === 0 ? 'Start for Free' : 'Subscribe Now'}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 24px', background: '#022c22', color: '#a7f3d0' }}>
                <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
                    <p>&copy; 2026 VTrustX. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
