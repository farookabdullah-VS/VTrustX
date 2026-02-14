import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../../axiosConfig';
import {
    Shield, Key, ArrowRight, ArrowLeft, Check, AlertTriangle,
    Settings, Users, FileText, TestTube
} from 'lucide-react';
import './SSOProviderWizard.css';

const STEPS = [
    { id: 1, title: 'Provider Type', icon: <Shield size={16} /> },
    { id: 2, title: 'Configuration', icon: <Settings size={16} /> },
    { id: 3, title: 'User Provisioning', icon: <Users size={16} /> },
    { id: 4, title: 'Review & Test', icon: <FileText size={16} /> }
];

function SSOProviderWizard() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = Boolean(id);

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [testResult, setTestResult] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        provider_type: 'saml',
        enabled: true,

        // SAML fields
        saml_entity_id: '',
        saml_sso_url: '',
        saml_slo_url: '',
        saml_certificate: '',
        saml_want_assertions_signed: true,

        // OAuth2 fields
        oauth_client_id: '',
        oauth_client_secret: '',
        oauth_authorization_url: '',
        oauth_token_url: '',
        oauth_userinfo_url: '',
        oauth_scopes: ['openid', 'email', 'profile'],

        // User provisioning
        jit_provisioning: true,
        email_claim: 'email',
        name_claim: 'name',
        role_claim: '',
        role_mapping: {},
        default_role: 'user',

        // Security
        session_duration_minutes: 480
    });

    useEffect(() => {
        if (isEditing) {
            fetchProvider();
        }
    }, [id]);

    const fetchProvider = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/sso/providers/${id}`);
            const provider = response.data;

            setFormData({
                name: provider.name || '',
                provider_type: provider.provider_type || 'saml',
                enabled: provider.enabled !== false,

                saml_entity_id: provider.saml_entity_id || '',
                saml_sso_url: provider.saml_sso_url || '',
                saml_slo_url: provider.saml_slo_url || '',
                saml_certificate: provider.saml_certificate || '',
                saml_want_assertions_signed: provider.saml_want_assertions_signed !== false,

                oauth_client_id: provider.oauth_client_id || '',
                oauth_client_secret: '', // Never sent from server
                oauth_authorization_url: provider.oauth_authorization_url || '',
                oauth_token_url: provider.oauth_token_url || '',
                oauth_userinfo_url: provider.oauth_userinfo_url || '',
                oauth_scopes: provider.oauth_scopes || ['openid', 'email', 'profile'],

                jit_provisioning: provider.jit_provisioning !== false,
                email_claim: provider.email_claim || 'email',
                name_claim: provider.name_claim || 'name',
                role_claim: provider.role_claim || '',
                role_mapping: provider.role_mapping || {},
                default_role: provider.default_role || 'user',

                session_duration_minutes: provider.session_duration_minutes || 480
            });
        } catch (err) {
            console.error('Failed to fetch provider:', err);
            setError('Failed to load provider configuration');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const handleNext = () => {
        // Validate current step
        if (currentStep === 1 && !formData.name) {
            setError('Provider name is required');
            return;
        }

        if (currentStep === 2) {
            if (formData.provider_type === 'saml') {
                if (!formData.saml_entity_id || !formData.saml_sso_url) {
                    setError('SAML Entity ID and SSO URL are required');
                    return;
                }
            } else {
                if (!formData.oauth_client_id || !formData.oauth_authorization_url || !formData.oauth_token_url) {
                    setError('OAuth Client ID, Authorization URL, and Token URL are required');
                    return;
                }
            }
        }

        setError(null);
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        setError(null);
    };

    const handleTest = async () => {
        try {
            setTestResult(null);
            const testData = {
                provider_type: formData.provider_type,
                ...(formData.provider_type === 'saml' ? {
                    saml_entity_id: formData.saml_entity_id,
                    saml_sso_url: formData.saml_sso_url
                } : {
                    oauth_client_id: formData.oauth_client_id,
                    oauth_authorization_url: formData.oauth_authorization_url,
                    oauth_token_url: formData.oauth_token_url
                })
            };

            const response = await axios.post('/api/sso/test-connection', testData);
            setTestResult(response.data);
        } catch (err) {
            setTestResult({
                valid: false,
                errors: [err.response?.data?.error || 'Connection test failed']
            });
        }
    };

    const handleSubmit = async () => {
        try {
            setSaving(true);
            setError(null);

            const submitData = { ...formData };

            // Remove OAuth secret if empty (for edits)
            if (!submitData.oauth_client_secret) {
                delete submitData.oauth_client_secret;
            }

            if (isEditing) {
                await axios.put(`/api/sso/providers/${id}`, submitData);
            } else {
                await axios.post('/api/sso/providers', submitData);
            }

            navigate('/sso-providers');
        } catch (err) {
            console.error('Failed to save provider:', err);
            setError(err.response?.data?.error || 'Failed to save provider configuration');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="sso-provider-wizard">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading provider...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="sso-provider-wizard">
            <div className="wizard-header">
                <h1>{isEditing ? 'Edit SSO Provider' : 'Add SSO Provider'}</h1>
                <p>Configure enterprise identity provider integration</p>
            </div>

            {/* Steps Progress */}
            <div className="steps-progress">
                {STEPS.map((step, index) => (
                    <div
                        key={step.id}
                        className={`step-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
                    >
                        <div className="step-circle">
                            {currentStep > step.id ? <Check size={16} /> : step.icon}
                        </div>
                        <div className="step-label">{step.title}</div>
                        {index < STEPS.length - 1 && <div className="step-line"></div>}
                    </div>
                ))}
            </div>

            {error && (
                <div className="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            <div className="wizard-content">
                {/* Step 1: Provider Type */}
                {currentStep === 1 && (
                    <div className="step-panel">
                        <h2>Provider Information</h2>
                        <p>Basic information about your SSO provider</p>

                        <div className="form-group">
                            <label>Provider Name *</label>
                            <input
                                type="text"
                                placeholder="e.g., Company Okta, Azure AD, Google Workspace"
                                value={formData.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                            />
                            <span className="field-help">A friendly name to identify this provider</span>
                        </div>

                        <div className="form-group">
                            <label>Protocol Type *</label>
                            <div className="type-cards">
                                <div
                                    className={`type-card ${formData.provider_type === 'saml' ? 'selected' : ''}`}
                                    onClick={() => handleChange('provider_type', 'saml')}
                                >
                                    <Shield size={32} />
                                    <h3>SAML 2.0</h3>
                                    <p>Enterprise standard for SSO. Supported by most identity providers.</p>
                                    <div className="type-badge">Recommended</div>
                                </div>
                                <div
                                    className={`type-card ${formData.provider_type === 'oidc' ? 'selected' : ''}`}
                                    onClick={() => handleChange('provider_type', 'oidc')}
                                >
                                    <Key size={32} />
                                    <h3>OAuth2 / OIDC</h3>
                                    <p>Modern authentication protocol. Used by Google, Auth0, and others.</p>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={(e) => handleChange('enabled', e.target.checked)}
                                />
                                <span>Enable this provider immediately</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Step 2: Configuration */}
                {currentStep === 2 && (
                    <div className="step-panel">
                        <h2>{formData.provider_type === 'saml' ? 'SAML Configuration' : 'OAuth2/OIDC Configuration'}</h2>
                        <p>Enter the configuration details from your identity provider</p>

                        {formData.provider_type === 'saml' ? (
                            <>
                                <div className="form-group">
                                    <label>Entity ID / Issuer *</label>
                                    <input
                                        type="text"
                                        placeholder="https://idp.example.com/saml/metadata"
                                        value={formData.saml_entity_id}
                                        onChange={(e) => handleChange('saml_entity_id', e.target.value)}
                                    />
                                    <span className="field-help">The unique identifier for your IdP</span>
                                </div>

                                <div className="form-group">
                                    <label>Single Sign-On URL *</label>
                                    <input
                                        type="url"
                                        placeholder="https://idp.example.com/saml/sso"
                                        value={formData.saml_sso_url}
                                        onChange={(e) => handleChange('saml_sso_url', e.target.value)}
                                    />
                                    <span className="field-help">The SAML SSO endpoint URL</span>
                                </div>

                                <div className="form-group">
                                    <label>Single Logout URL (Optional)</label>
                                    <input
                                        type="url"
                                        placeholder="https://idp.example.com/saml/slo"
                                        value={formData.saml_slo_url}
                                        onChange={(e) => handleChange('saml_slo_url', e.target.value)}
                                    />
                                    <span className="field-help">The SAML SLO endpoint for logout</span>
                                </div>

                                <div className="form-group">
                                    <label>X.509 Certificate *</label>
                                    <textarea
                                        rows="6"
                                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                                        value={formData.saml_certificate}
                                        onChange={(e) => handleChange('saml_certificate', e.target.value)}
                                    />
                                    <span className="field-help">The public certificate for verifying SAML assertions</span>
                                </div>

                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={formData.saml_want_assertions_signed}
                                            onChange={(e) => handleChange('saml_want_assertions_signed', e.target.checked)}
                                        />
                                        <span>Require signed assertions (recommended)</span>
                                    </label>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label>Client ID *</label>
                                    <input
                                        type="text"
                                        placeholder="your-client-id"
                                        value={formData.oauth_client_id}
                                        onChange={(e) => handleChange('oauth_client_id', e.target.value)}
                                    />
                                    <span className="field-help">The OAuth2 client identifier</span>
                                </div>

                                <div className="form-group">
                                    <label>Client Secret {isEditing ? '(leave blank to keep existing)' : '*'}</label>
                                    <input
                                        type="password"
                                        placeholder={isEditing ? 'Enter new secret to update' : 'your-client-secret'}
                                        value={formData.oauth_client_secret}
                                        onChange={(e) => handleChange('oauth_client_secret', e.target.value)}
                                    />
                                    <span className="field-help">The OAuth2 client secret (encrypted at rest)</span>
                                </div>

                                <div className="form-group">
                                    <label>Authorization URL *</label>
                                    <input
                                        type="url"
                                        placeholder="https://accounts.example.com/oauth/authorize"
                                        value={formData.oauth_authorization_url}
                                        onChange={(e) => handleChange('oauth_authorization_url', e.target.value)}
                                    />
                                    <span className="field-help">The OAuth2 authorization endpoint</span>
                                </div>

                                <div className="form-group">
                                    <label>Token URL *</label>
                                    <input
                                        type="url"
                                        placeholder="https://accounts.example.com/oauth/token"
                                        value={formData.oauth_token_url}
                                        onChange={(e) => handleChange('oauth_token_url', e.target.value)}
                                    />
                                    <span className="field-help">The OAuth2 token endpoint</span>
                                </div>

                                <div className="form-group">
                                    <label>UserInfo URL (OIDC)</label>
                                    <input
                                        type="url"
                                        placeholder="https://accounts.example.com/oauth/userinfo"
                                        value={formData.oauth_userinfo_url}
                                        onChange={(e) => handleChange('oauth_userinfo_url', e.target.value)}
                                    />
                                    <span className="field-help">The OIDC userinfo endpoint</span>
                                </div>

                                <div className="form-group">
                                    <label>Scopes</label>
                                    <input
                                        type="text"
                                        placeholder="openid email profile"
                                        value={formData.oauth_scopes.join(' ')}
                                        onChange={(e) => handleChange('oauth_scopes', e.target.value.split(' ').filter(Boolean))}
                                    />
                                    <span className="field-help">Space-separated OAuth2 scopes to request</span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Step 3: User Provisioning */}
                {currentStep === 3 && (
                    <div className="step-panel">
                        <h2>User Provisioning</h2>
                        <p>Configure how users are created and mapped from your IdP</p>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.jit_provisioning}
                                    onChange={(e) => handleChange('jit_provisioning', e.target.checked)}
                                />
                                <span>Enable Just-in-Time (JIT) Provisioning</span>
                            </label>
                            <span className="field-help">Automatically create users on first login</span>
                        </div>

                        <div className="form-group">
                            <label>Email Claim/Attribute</label>
                            <input
                                type="text"
                                placeholder="email"
                                value={formData.email_claim}
                                onChange={(e) => handleChange('email_claim', e.target.value)}
                            />
                            <span className="field-help">The claim/attribute name containing user email</span>
                        </div>

                        <div className="form-group">
                            <label>Name Claim/Attribute</label>
                            <input
                                type="text"
                                placeholder="name"
                                value={formData.name_claim}
                                onChange={(e) => handleChange('name_claim', e.target.value)}
                            />
                            <span className="field-help">The claim/attribute name containing user's full name</span>
                        </div>

                        <div className="form-group">
                            <label>Default Role</label>
                            <select
                                value={formData.default_role}
                                onChange={(e) => handleChange('default_role', e.target.value)}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                                <option value="tenant_admin">Tenant Admin</option>
                            </select>
                            <span className="field-help">Default role for JIT provisioned users</span>
                        </div>

                        <div className="form-group">
                            <label>Session Duration (minutes)</label>
                            <input
                                type="number"
                                min="30"
                                max="43200"
                                value={formData.session_duration_minutes}
                                onChange={(e) => handleChange('session_duration_minutes', parseInt(e.target.value))}
                            />
                            <span className="field-help">How long SSO sessions remain active (default: 480 minutes / 8 hours)</span>
                        </div>
                    </div>
                )}

                {/* Step 4: Review & Test */}
                {currentStep === 4 && (
                    <div className="step-panel">
                        <h2>Review & Test</h2>
                        <p>Review your configuration and test the connection</p>

                        <div className="review-section">
                            <h3>Provider Information</h3>
                            <div className="review-grid">
                                <div className="review-item">
                                    <strong>Name:</strong>
                                    <span>{formData.name}</span>
                                </div>
                                <div className="review-item">
                                    <strong>Type:</strong>
                                    <span>{formData.provider_type.toUpperCase()}</span>
                                </div>
                                <div className="review-item">
                                    <strong>Status:</strong>
                                    <span>{formData.enabled ? 'Enabled' : 'Disabled'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="review-section">
                            <h3>Configuration</h3>
                            <div className="review-grid">
                                {formData.provider_type === 'saml' ? (
                                    <>
                                        <div className="review-item">
                                            <strong>Entity ID:</strong>
                                            <span className="text-truncate">{formData.saml_entity_id}</span>
                                        </div>
                                        <div className="review-item">
                                            <strong>SSO URL:</strong>
                                            <span className="text-truncate">{formData.saml_sso_url}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="review-item">
                                            <strong>Client ID:</strong>
                                            <span className="text-truncate">{formData.oauth_client_id}</span>
                                        </div>
                                        <div className="review-item">
                                            <strong>Authorization URL:</strong>
                                            <span className="text-truncate">{formData.oauth_authorization_url}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="review-section">
                            <h3>User Provisioning</h3>
                            <div className="review-grid">
                                <div className="review-item">
                                    <strong>JIT Provisioning:</strong>
                                    <span>{formData.jit_provisioning ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                <div className="review-item">
                                    <strong>Default Role:</strong>
                                    <span>{formData.default_role}</span>
                                </div>
                            </div>
                        </div>

                        <div className="test-section">
                            <button className="btn-test" onClick={handleTest}>
                                <TestTube size={16} />
                                Test Connection
                            </button>

                            {testResult && (
                                <div className={`test-result ${testResult.valid ? 'success' : 'error'}`}>
                                    {testResult.valid ? (
                                        <>
                                            <Check size={20} />
                                            <div>
                                                <strong>Configuration Valid</strong>
                                                <p>{testResult.message}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle size={20} />
                                            <div>
                                                <strong>Configuration Issues</strong>
                                                <ul>
                                                    {testResult.errors.map((err, i) => (
                                                        <li key={i}>{err}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="wizard-navigation">
                <button
                    className="btn-secondary"
                    onClick={() => navigate('/sso-providers')}
                >
                    Cancel
                </button>
                <div className="nav-right">
                    {currentStep > 1 && (
                        <button className="btn-secondary" onClick={handleBack}>
                            <ArrowLeft size={16} />
                            Back
                        </button>
                    )}
                    {currentStep < STEPS.length ? (
                        <button className="btn-primary" onClick={handleNext}>
                            Next
                            <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            className="btn-primary"
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (isEditing ? 'Update Provider' : 'Create Provider')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SSOProviderWizard;
