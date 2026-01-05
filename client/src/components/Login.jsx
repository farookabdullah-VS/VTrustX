import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export function Login({ onLogin }) {
    const { t, i18n } = useTranslation();
    // Force English if translation isn't loaded yet
    const title = t('login.title') || "Welcome Back";

    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const userStr = params.get('user');
        const errorType = params.get('error');

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                onLogin({ user, token });
                // Clean URL and go to root
                window.history.replaceState({}, document.title, '/');
            } catch (e) {
                console.error("Failed to parse user from URL", e);
                setError('Login data invalid');
            }
        } else if (errorType) {
            setError('Authentication failed. Please try again.');
        }
    }, [onLogin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';

        try {
            const res = await axios.post(endpoint, { username, password });

            if (isRegistering) {
                alert("Registered! Please login.");
                setIsRegistering(false);
            } else {
                onLogin(res.data);
            }
        } catch (err) {
            console.error("Login Err Details:", err);
            const msg = err.response?.data?.error || `Error: ${err.message} (${err.response?.status || 'No Response'})`;
            setError(msg);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999
        }}>
            <style>{`
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 30px white inset !important;
                    -webkit-text-fill-color: black !important;
                    caret-color: black !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
            <div style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', padding: '40px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(6, 78, 59, 0.25)', width: '400px', border: '1px solid #d1fae5' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src="/vtrustx_logo.jpg" alt="VTrustX" style={{ width: '150px', height: 'auto', display: 'block', margin: '0 auto 15px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.8em', color: '#064e3b', letterSpacing: '-0.5px', fontWeight: '700' }}>VTrustX</h2>
                    <p style={{ margin: '5px 0 0 0', color: '#059669', fontSize: '0.9em', fontWeight: '500' }}>{t('login.subtitle')}</p>
                </div>

                <h3 style={{ marginTop: 0, textAlign: 'center', color: '#374151', marginBottom: '30px', fontWeight: '500', fontSize: '1.2em' }}>
                    {isRegistering ? 'Create Account' : title}
                </h3>

                {error && <div style={{ color: '#b91c1c', marginBottom: '20px', fontSize: '0.9em', textAlign: 'center', background: '#fef2f2', padding: '12px', borderRadius: '8px', border: '1px solid #fee2e2' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#065f46', fontWeight: '600', marginLeft: '2px' }}>{t('login.username')}</label>
                        <input
                            required
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid #d1fae5',
                                background: '#ecfdf5',
                                color: '#064e3b',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1fae5'; e.target.style.background = '#ecfdf5'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: '#065f46', fontWeight: '600', marginLeft: '2px' }}>{t('login.password')}</label>
                        <input
                            required
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid #d1fae5',
                                background: '#ecfdf5',
                                color: '#064e3b',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#059669'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#d1fae5'; e.target.style.background = '#ecfdf5'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '16px', background: 'linear-gradient(to right, #059669, #047857)', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.3)' }}>
                        {isRegistering ? 'Sign Up' : t('login.button')}
                    </button>
                    {/* Hover effect handled by CSS if needed */}
                </form>

                {!isRegistering && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0', color: '#9ca3af' }}>
                            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                            <span style={{ padding: '0 10px', fontSize: '0.85em', fontWeight: '500' }}>OR CONTINUE WITH</span>
                            <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }}></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                type="button"
                                onClick={() => window.location.href = '/api/auth/google'}
                                style={{
                                    width: '100%', padding: '14px', background: 'white', color: '#374151',
                                    border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer',
                                    fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                                onMouseOut={(e) => e.target.style.background = 'white'}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Google
                            </button>

                            <button
                                onClick={() => window.location.href = '/api/auth/microsoft'}
                                style={{
                                    width: '100%', padding: '14px', background: 'white', color: '#374151',
                                    border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer',
                                    fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                                onMouseOut={(e) => e.target.style.background = 'white'}
                            >
                                <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#f25022" d="M1 1h9v9H1z" />
                                    <path fill="#00a4ef" d="M1 11h9v9H1z" />
                                    <path fill="#7fba00" d="M11 1h9v9H11z" />
                                    <path fill="#ffb900" d="M11 11h9v9H11z" />
                                </svg>
                                Microsoft
                            </button>
                        </div>
                    </>
                )}

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.95em', color: '#6b7280' }}>
                    {isRegistering ? "Already have an account? " : "Don't have an account? "}
                    <span
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ color: '#059669', cursor: 'pointer', textDecoration: 'none', fontWeight: '700' }}
                    >
                        {isRegistering ? t('login.button') : 'Register Now'}
                    </span>
                </div>
            </div>
        </div>
    );
}
