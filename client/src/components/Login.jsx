/* eslint-disable */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { login, register } from '../services/authService';
import { fetchCsrfToken } from '../axiosConfig';
import { useToast } from './common/Toast';
import { useFormValidation, ValidatedInput, rules } from './common/FormValidation';
import { Logo } from './common/Logo';

export function Login({ onLogin }) {
    const toast = useToast();
    const { t, i18n } = useTranslation();
    // Force English if translation isn't loaded yet
    const title = t('login.title') || "Welcome Back";

    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [ssoProviders, setSsoProviders] = useState([]);
    const [ldapModal, setLdapModal] = useState(null);
    const [ldapCredentials, setLdapCredentials] = useState({ username: '', password: '' });
    const [ldapLoading, setLdapLoading] = useState(false);

    const form = useFormValidation({
        initialValues: { username: '', password: '' },
        validationRules: {
            username: [rules.required(t('validation.required') !== 'validation.required' ? t('validation.required') : 'Username is required')],
            password: [
                rules.required(t('validation.required') !== 'validation.required' ? t('validation.required') : 'Password is required'),
                rules.minLength(3, t('validation.min_length') !== 'validation.min_length' ? t('validation.min_length') : 'Minimum 3 characters'),
            ],
        },
        onSubmit: async (values) => {
            setError('');
            try {
                if (isRegistering) {
                    await register({ username: values.username, password: values.password });
                    toast.success("Registered! Please login.");
                    setIsRegistering(false);
                    form.reset();
                } else {
                    const data = await login(values.username, values.password);
                    await fetchCsrfToken(); // Refresh CSRF token for the new session
                    onLogin(data);
                }
            } catch (err) {
                const msg = err.response?.data?.error || `Authentication failed: ${err.message}`;
                setError(msg);
            }
        },
    });

    // Fetch enabled SSO providers
    useEffect(() => {
        fetch('/api/sso/enabled', {
            headers: { 'Content-Type': 'application/json' }
        })
            .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to fetch SSO providers')))
            .then(data => {
                if (data.providers && Array.isArray(data.providers)) {
                    setSsoProviders(data.providers);
                }
            })
            .catch(e => {
                console.error("Failed to fetch SSO providers", e);
            });
    }, []);

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
                .then(async (data) => {
                    await fetchCsrfToken(); // Refresh CSRF token for the new session
                    onLogin(data);
                    window.history.replaceState({}, document.title, '/');
                })
                .catch(e => {
                    console.error("OAuth login failed", e);
                    setError(t('login.error.auth_failed'));
                    window.history.replaceState({}, document.title, '/login');
                });
        } else if (errorType) {
            // Map error codes to user-friendly messages
            const errorMessages = {
                sso_failed: 'SSO authentication failed',
                sso_error: 'An error occurred during SSO login',
                sso_provider_disabled: 'This SSO provider is disabled',
                sso_authentication_failed: 'Authentication failed',
                sso_no_user: 'User not found or JIT provisioning is disabled',
                token_error: 'Failed to create session',
                unsupported_provider: 'Unsupported provider type'
            };
            setError(errorMessages[errorType] || t('login.error.auth_failed'));
            window.history.replaceState({}, document.title, '/login');
        }
    }, [onLogin, t]);

    // LDAP Login Handler
    const handleLdapLogin = async (providerId) => {
        try {
            setLdapLoading(true);
            setError('');

            const response = await fetch(`/api/auth/sso/${providerId}/ldap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(ldapCredentials)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'LDAP authentication failed');
            }

            const data = await response.json();

            // Refresh CSRF token for new session
            await fetchCsrfToken();

            // Close modal and login
            setLdapModal(null);
            setLdapCredentials({ username: '', password: '' });
            onLogin(data);
        } catch (err) {
            setError(err.message || 'LDAP authentication failed');
            setLdapLoading(false);
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
            background: 'var(--deep-bg, #f8fafc)',
            backgroundImage: 'var(--bg-pattern)',
            backgroundSize: 'var(--bg-pattern-size)',
            fontFamily: "'Outfit', sans-serif",
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '16px',
            boxSizing: 'border-box',
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
            <div style={{ background: 'var(--card-bg, #ffffff)', padding: 'clamp(24px, 5vw, 48px)', borderRadius: '24px', boxShadow: 'var(--glass-shadow, 0 25px 50px -12px rgba(0,0,0,0.1))', width: '100%', maxWidth: '420px', border: '1px solid var(--glass-border, #e2e8f0)', boxSizing: 'border-box' }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                        <Logo size={60} showText={false} />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '2em', color: 'var(--primary-color)', letterSpacing: '-1px', fontWeight: '800' }}>RayiX</h2>
                    <p style={{ margin: '5px 0 0 0', color: 'var(--text-muted)', fontSize: '0.95em', fontWeight: '500', letterSpacing: '0.5px' }}>{t('login.subtitle')}</p>
                </div>

                <h3 style={{ marginTop: 0, textAlign: 'center', color: 'var(--text-color)', marginBottom: '30px', fontWeight: '500', fontSize: '1.2em' }}>
                    {isRegistering ? t('auth.create_account') : title}
                </h3>

                {error && <div role="alert" aria-live="assertive" style={{ color: 'var(--status-error)', marginBottom: '20px', fontSize: '0.9em', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid var(--status-error)' }}>{error}</div>}

                <form onSubmit={form.handleSubmit}>
                    <ValidatedInput
                        name="username"
                        label={t('login.username')}
                        type="text"
                        value={form.values.username}
                        error={form.touched.username && form.errors.username}
                        onChange={form.handleChange}
                        onBlur={form.handleBlur}
                        required
                    />
                    <ValidatedInput
                        name="password"
                        label={t('login.password')}
                        type="password"
                        value={form.values.password}
                        error={form.touched.password && form.errors.password}
                        onChange={form.handleChange}
                        onBlur={form.handleBlur}
                        required
                        style={{ marginBottom: '30px' }}
                    />
                    <button type="submit" disabled={form.isSubmitting} style={{ width: '100%', padding: '16px', background: 'var(--primary-gradient)', color: 'var(--button-text)', border: 'none', borderRadius: '12px', cursor: form.isSubmitting ? 'wait' : 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', opacity: form.isSubmitting ? 0.7 : 1 }}>
                        {form.isSubmitting ? '...' : (isRegistering ? t('auth.register_now') : t('login.button'))}
                    </button>
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

                            {/* Dynamic SSO Providers */}
                            {ssoProviders.map(provider => (
                                <button
                                    key={provider.id}
                                    type="button"
                                    aria-label={`Sign in with ${provider.name}`}
                                    onClick={() => {
                                        if (provider.provider_type === 'ldap') {
                                            setLdapModal(provider);
                                        } else {
                                            window.location.href = `/api/auth/sso/${provider.id}`;
                                        }
                                    }}
                                    style={{
                                        width: '100%', padding: '14px', background: 'var(--input-bg)', color: 'var(--text-color)',
                                        border: '1px solid var(--input-border)', borderRadius: '12px', cursor: 'pointer',
                                        fontSize: '15px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'var(--sidebar-hover-bg)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                                >
                                    {/* Icon based on provider type */}
                                    {provider.provider_type === 'saml' ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : provider.provider_type === 'ldap' ? (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                                            <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 7C15 9.20914 13.2091 11 11 11C8.79086 11 7 9.20914 7 7C7 4.79086 8.79086 3 11 3C13.2091 3 15 4.79086 15 7Z" stroke="currentColor" strokeWidth="2" />
                                            <path d="M3 21V19C3 16.2386 5.23858 14 8 14H12C13.1046 14 14 14.8954 14 16M16 11L18 13L22 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                    {provider.name}
                                </button>
                            ))}
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

            {/* LDAP Login Modal */}
            {ldapModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'var(--card-bg, #ffffff)', padding: '32px', borderRadius: '16px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '90%', maxWidth: '400px'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '600', color: 'var(--text-color)' }}>
                            Sign in with {ldapModal.name}
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Enter your directory credentials
                        </p>

                        {error && (
                            <div role="alert" style={{
                                color: 'var(--status-error)', marginBottom: '16px', fontSize: '0.9em',
                                background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px',
                                border: '1px solid var(--status-error)'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-color)' }}>
                                Username
                            </label>
                            <input
                                type="text"
                                value={ldapCredentials.username}
                                onChange={(e) => setLdapCredentials({ ...ldapCredentials, username: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && handleLdapLogin(ldapModal.id)}
                                placeholder="Enter your username"
                                autoFocus
                                style={{
                                    width: '100%', padding: '12px', border: '1px solid var(--input-border)',
                                    borderRadius: '8px', fontSize: '14px', background: 'var(--input-bg)',
                                    color: 'var(--input-text)', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: 'var(--text-color)' }}>
                                Password
                            </label>
                            <input
                                type="password"
                                value={ldapCredentials.password}
                                onChange={(e) => setLdapCredentials({ ...ldapCredentials, password: e.target.value })}
                                onKeyPress={(e) => e.key === 'Enter' && handleLdapLogin(ldapModal.id)}
                                placeholder="Enter your password"
                                style={{
                                    width: '100%', padding: '12px', border: '1px solid var(--input-border)',
                                    borderRadius: '8px', fontSize: '14px', background: 'var(--input-bg)',
                                    color: 'var(--input-text)', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => {
                                    setLdapModal(null);
                                    setLdapCredentials({ username: '', password: '' });
                                    setError('');
                                }}
                                disabled={ldapLoading}
                                style={{
                                    flex: 1, padding: '12px', background: 'var(--input-bg)', color: 'var(--text-color)',
                                    border: '1px solid var(--input-border)', borderRadius: '8px', cursor: ldapLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: '600', opacity: ldapLoading ? 0.5 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleLdapLogin(ldapModal.id)}
                                disabled={ldapLoading || !ldapCredentials.username || !ldapCredentials.password}
                                style={{
                                    flex: 1, padding: '12px', background: 'var(--primary-gradient)', color: 'var(--button-text)',
                                    border: 'none', borderRadius: '8px', cursor: (ldapLoading || !ldapCredentials.username || !ldapCredentials.password) ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: '600', opacity: (ldapLoading || !ldapCredentials.username || !ldapCredentials.password) ? 0.5 : 1
                                }}
                            >
                                {ldapLoading ? 'Signing in...' : 'Sign In'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
