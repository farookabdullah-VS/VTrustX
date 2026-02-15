import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../axiosConfig';
import {
    Shield, Plus, Edit2, Trash2, Power, Users, BarChart3,
    AlertTriangle, Check, RefreshCw, Key
} from 'lucide-react';
import './SSOProvidersList.css';

function SSOProvidersList() {
    const navigate = useNavigate();
    const [providers, setProviders] = useState([]);
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [providersRes, statsRes] = await Promise.all([
                axios.get('/api/sso/providers'),
                axios.get('/api/sso/stats')
            ]);
            setProviders(providersRes.data.providers || []);
            setStats(statsRes.data.stats || []);
        } catch (err) {
            console.error('Failed to fetch SSO data:', err);
            setError('Failed to load SSO providers');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleEnabled = async (provider) => {
        try {
            await axios.put(`/api/sso/providers/${provider.id}`, {
                enabled: !provider.enabled
            });
            await fetchData();
        } catch (err) {
            console.error('Failed to toggle provider:', err);
            alert('Failed to update provider status');
        }
    };

    const handleDelete = async (providerId) => {
        if (!window.confirm('Are you sure you want to delete this SSO provider? Users will no longer be able to login with this provider.')) {
            return;
        }

        try {
            await axios.delete(`/api/sso/providers/${providerId}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to delete provider:', err);
            alert('Failed to delete provider');
        }
    };

    const getProviderIcon = (type) => {
        switch (type) {
            case 'saml':
                return <Shield size={24} />;
            case 'oauth2':
            case 'oidc':
                return <Key size={24} />;
            default:
                return <Shield size={24} />;
        }
    };

    const getProviderBadge = (type) => {
        const colors = {
            saml: { bg: '#DBEAFE', color: '#1E40AF' },
            oauth2: { bg: '#FCE7F3', color: '#9F1239' },
            oidc: { bg: '#FEF3C7', color: '#92400E' }
        };
        return colors[type] || colors.saml;
    };

    if (loading) {
        return (
            <div className="sso-providers-list">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading SSO providers...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="sso-providers-list">
            <div className="list-header">
                <div className="header-left">
                    <Shield size={24} />
                    <div>
                        <h1>Single Sign-On (SSO)</h1>
                        <p>Configure identity providers for seamless authentication</p>
                    </div>
                </div>
                <div className="header-right">
                    <button className="btn-refresh" onClick={fetchData}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button className="btn-add" onClick={() => navigate('/sso-providers/new')}>
                        <Plus size={16} />
                        Add Provider
                    </button>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Statistics Cards */}
            {stats.length > 0 && (
                <div className="stats-grid">
                    {stats.map((stat, index) => (
                        <div key={index} className="stat-card">
                            <div className="stat-icon">
                                {getProviderIcon(stat.provider_type)}
                            </div>
                            <div className="stat-content">
                                <div className="stat-label">{stat.provider_name}</div>
                                <div className="stat-value">{parseInt(stat.total_users).toLocaleString()}</div>
                                <div className="stat-detail">
                                    {stat.recent_logins} logins (30 days)
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info Banner */}
            {providers.length === 0 && (
                <div className="info-banner">
                    <Shield size={48} />
                    <div>
                        <h3>No SSO Providers Configured</h3>
                        <p>
                            Single Sign-On allows your users to authenticate using enterprise identity providers
                            like Okta, Azure AD, Google Workspace, or any SAML/OAuth2 compatible provider.
                        </p>
                        <button className="btn-primary" onClick={() => navigate('/sso-providers/new')}>
                            <Plus size={16} />
                            Configure Your First Provider
                        </button>
                    </div>
                </div>
            )}

            {/* Providers List */}
            {providers.length > 0 && (
                <div className="providers-list">
                    {providers.map(provider => {
                        const badgeStyle = getProviderBadge(provider.provider_type);
                        const providerStat = stats.find(s => s.provider_name === provider.name);

                        return (
                            <div key={provider.id} className={`provider-card ${!provider.enabled ? 'disabled' : ''}`}>
                                <div className="provider-main">
                                    <div className="provider-icon">
                                        {getProviderIcon(provider.provider_type)}
                                    </div>
                                    <div className="provider-content">
                                        <div className="provider-header">
                                            <h3>{provider.name}</h3>
                                            <div className="provider-badges">
                                                <span
                                                    className="type-badge"
                                                    style={{ background: badgeStyle.bg, color: badgeStyle.color }}
                                                >
                                                    {provider.provider_type.toUpperCase()}
                                                </span>
                                                {provider.enabled ? (
                                                    <span className="status-badge enabled">
                                                        <Check size={12} />
                                                        Enabled
                                                    </span>
                                                ) : (
                                                    <span className="status-badge disabled">
                                                        Disabled
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="provider-details">
                                            <div className="detail-item">
                                                <Users size={14} />
                                                <span>{providerStat ? parseInt(providerStat.total_users) : 0} users</span>
                                            </div>
                                            <div className="detail-item">
                                                <BarChart3 size={14} />
                                                <span>{providerStat ? providerStat.recent_logins : 0} logins (30d)</span>
                                            </div>
                                            {provider.jit_provisioning && (
                                                <div className="detail-item">
                                                    <Check size={14} />
                                                    <span>JIT Provisioning</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="provider-meta">
                                            <span className="meta-text">
                                                Created {new Date(provider.created_at).toLocaleDateString()}
                                            </span>
                                            {provider.default_role && (
                                                <span className="meta-text">
                                                    Default Role: {provider.default_role}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="provider-actions">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleToggleEnabled(provider)}
                                            title={provider.enabled ? 'Disable' : 'Enable'}
                                        >
                                            <Power size={16} />
                                        </button>
                                        <button
                                            className="btn-icon"
                                            onClick={() => navigate(`/sso-providers/${provider.id}/edit`)}
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => handleDelete(provider.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Support Notice */}
            <div className="support-notice">
                <h3>Supported Identity Providers</h3>
                <div className="providers-grid">
                    <div className="provider-badge">Okta</div>
                    <div className="provider-badge">Azure AD / Microsoft Entra ID</div>
                    <div className="provider-badge">Google Workspace</div>
                    <div className="provider-badge">OneLogin</div>
                    <div className="provider-badge">Auth0</div>
                    <div className="provider-badge">PingIdentity</div>
                    <div className="provider-badge">AWS IAM Identity Center</div>
                    <div className="provider-badge">Any SAML 2.0 Provider</div>
                    <div className="provider-badge">Any OIDC Provider</div>
                </div>
            </div>
        </div>
    );
}

export default SSOProvidersList;
