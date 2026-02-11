/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { login, register } from '../services/authService';
import { useToast } from './common/Toast';

export function Login({ onLogin }) {
    const toast = useToast();
    const { t, i18n } = useTranslation();
    // Force English if translation isn't loaded yet
    const title = t('login.title') || "Welcome Back";

    const [isRegistering, setIsRegistering] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const oauthSuccess = params.get('oauth');
        const errorType = params.get('error');

        if (oauthSuccess === 'success') {
            // OAuth token is delivered via httpOnly cookie.
            // Fetch current user from a /me endpoint to complete login.
            fetch('/api/auth/me', {
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(r => r.ok ? r.json() : Promise.reject(new Error('OAuth session invalid')))
                .then(data => {
                    onLogin(data);
                    window.history.replaceState({}, document.title, '/');
                })
                .catch(e => {
                    console.error("OAuth login failed", e);
                    setError(t('login.error.auth_failed'));
                    window.history.replaceState({}, document.title, '/login');
                });
        } else if (errorType) {
            setError(t('login.error.auth_failed'));
            window.history.replaceState({}, document.title, '/login');
        }
    }, [onLogin, t]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isRegistering) {
                await register({ username, password });
                toast.success("Registered! Please login.");
                setIsRegistering(false);
            } else {
                const data = await login(username, password);
                onLogin(data);
            }
        } catch (err) {
            console.error("Login Err Details:", err);
            // Show specific error from server or network error message
            const msg = err.response?.data?.error || `Authentication failed: ${err.message}`;
            setError(msg);
        }
    };

    // State for Component

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#f8fafc',
            backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)',
            backgroundSize: '32px 32px',
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
                    -webkit-box-shadow: 0 0 0 30px var(--input-bg) inset !important;
                    -webkit-text-fill-color: var(--input-text) !important;
                    caret-color: var(--input-text) !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>
            <div style={{ background: '#ffffff', padding: '48px', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', width: '400px', border: '1px solid #e2e8f0' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <img src="/rayix_v2.jpg" alt="RayiX" style={{ width: '150px', height: 'auto', display: 'block', margin: '0 auto 15px' }} />
                    <h2 style={{ margin: 0, fontSize: '1.8em', color: 'var(--primary-color)', letterSpacing: '-0.5px', fontWeight: '700' }}>RayiX</h2>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9em', fontWeight: '500' }}>{t('login.subtitle')}</p>
                </div>

                <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text-color)', marginBottom: '30px', fontWeight: '500', fontSize: '1.2em' }}>
                    {isRegistering ? t('auth.create_account') : title}
                </h3>

                {error && <div role="alert" aria-live="assertive" style={{ color: 'var(--status-error)', marginBottom: '20px', fontSize: '0.9em', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--status-error)' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--label-color)', fontWeight: '600', marginLeft: '2px' }}>{t('login.username')}</label>
                        <input
                            required
                            aria-required="true"
                            aria-label={t('login.username')}
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--input-border)',
                                background: 'var(--input-bg)',
                                color: 'var(--input-text)',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.background = 'var(--input-bg)'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.background = 'var(--input-bg)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <div style={{ marginBottom: '30px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9em', color: 'var(--label-color)', fontWeight: '600', marginLeft: '2px' }}>{t('login.password')}</label>
                        <input
                            required
                            aria-required="true"
                            aria-label={t('login.password')}
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                border: '1px solid var(--input-border)',
                                background: 'var(--input-bg)',
                                color: 'var(--input-text)',
                                fontSize: '15px',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'all 0.2s',
                            }}
                            onFocus={(e) => { e.target.style.borderColor = 'var(--primary-color)'; e.target.style.background = 'var(--input-bg)'; e.target.style.boxShadow = '0 0 0 4px rgba(5, 150, 105, 0.1)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'var(--input-border)'; e.target.style.background = 'var(--input-bg)'; e.target.style.boxShadow = 'none'; }}
                        />
                    </div>
                    <button type="submit" style={{ width: '100%', padding: '16px', background: 'var(--primary-gradient)', color: 'var(--button-text)', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        {isRegistering ? t('auth.register_now') : t('login.button')}
                    </button>
                    {/* Hover effect handled by CSS if needed */}
                </form>

                {!isRegistering && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '25px 0', color: 'var(--text-muted)' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--input-border)' }}></div>
                            <span style={{ padding: '0 10px', fontSize: '0.85em', fontWeight: '500' }}>{t('auth.or_continue')}</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--input-border)' }}></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                type="button"
                                aria-label="Sign in with Google"
                                onClick={() => window.location.href = '/api/auth/google'}
                                style={{
                                    width: '100%', padding: '14px', background: 'var(--input-bg)', color: 'var(--text-color)',
                                    border: '1px solid var(--input-border)', borderRadius: '12px', cursor: 'pointer',
                                    fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'var(--sidebar-hover-bg)'}
                                onMouseOut={(e) => e.target.style.background = 'var(--input-bg)'}
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
                                type="button"
                                aria-label="Sign in with Microsoft"
                                onClick={() => window.location.href = '/api/auth/microsoft'}
                                style={{
                                    width: '100%', padding: '14px', background: 'var(--input-bg)', color: 'var(--text-color)',
                                    border: '1px solid var(--input-border)', borderRadius: '12px', cursor: 'pointer',
                                    fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.target.style.background = 'var(--sidebar-hover-bg)'}
                                onMouseOut={(e) => e.target.style.background = 'var(--input-bg)'}
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

                <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.95em', color: 'var(--text-muted)' }}>
                    {isRegistering ? t('auth.already_have_account') : t('auth.no_account')}
                    <span
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ color: 'var(--primary-color)', cursor: 'pointer', textDecoration: 'none', fontWeight: '700' }}
                    >
                        {isRegistering ? t('login.button') : t('auth.register_now')}
                    </span>
                </div>
            </div>
        </div>
    );
}
