import React, { useState } from 'react';
import axios from '../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Key, ArrowLeft, Check, Copy, AlertCircle, Eye, EyeOff } from 'lucide-react';
import './APIKeyBuilder.css';

function APIKeyBuilder() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Configure, 2: Key Generated
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [keyGenerated, setKeyGenerated] = useState(null);
    const [keyCopied, setKeyCopied] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        environment: 'live',
        scopes: [],
        rateLimit: 1000,
        expiresAt: null
    });

    const availableScopes = [
        { name: 'forms:read', description: 'Read forms and form templates', category: 'Forms' },
        { name: 'forms:write', description: 'Create and update forms', category: 'Forms' },
        { name: 'forms:delete', description: 'Delete forms', category: 'Forms' },
        { name: 'responses:read', description: 'Read survey responses', category: 'Responses' },
        { name: 'responses:write', description: 'Create and update responses', category: 'Responses' },
        { name: 'distributions:read', description: 'Read distributions and campaigns', category: 'Distributions' },
        { name: 'distributions:write', description: 'Create and send distributions', category: 'Distributions' },
        { name: 'contacts:read', description: 'Read contact lists', category: 'Contacts' },
        { name: 'contacts:write', description: 'Create and update contacts', category: 'Contacts' },
        { name: 'webhooks:manage', description: 'Manage webhook subscriptions', category: 'Webhooks' },
        { name: 'analytics:read', description: 'Access analytics data', category: 'Analytics' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleScopeToggle = (scopeName) => {
        setFormData(prev => ({
            ...prev,
            scopes: prev.scopes.includes(scopeName)
                ? prev.scopes.filter(s => s !== scopeName)
                : [...prev.scopes, scopeName]
        }));
    };

    const handleSelectAllScopes = (category) => {
        const categoryScopes = availableScopes
            .filter(scope => scope.category === category)
            .map(scope => scope.name);

        const allSelected = categoryScopes.every(scope => formData.scopes.includes(scope));

        if (allSelected) {
            // Deselect all in category
            setFormData(prev => ({
                ...prev,
                scopes: prev.scopes.filter(s => !categoryScopes.includes(s))
            }));
        } else {
            // Select all in category
            setFormData(prev => ({
                ...prev,
                scopes: Array.from(new Set([...prev.scopes, ...categoryScopes]))
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('API key name is required');
            return;
        }

        if (formData.scopes.length === 0) {
            setError('Please select at least one scope');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            const response = await axios.post('/api/api-keys', formData);
            setKeyGenerated(response.data.api_key);
            setStep(2);
        } catch (err) {
            console.error('Failed to create API key:', err);
            setError(err.response?.data?.error || 'Failed to create API key');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyKey = () => {
        if (keyGenerated?.api_key) {
            navigator.clipboard.writeText(keyGenerated.api_key);
            setKeyCopied(true);
            setTimeout(() => setKeyCopied(false), 2000);
        }
    };

    const handleDownloadKey = () => {
        if (keyGenerated?.api_key) {
            const blob = new Blob([`VTrustX API Key\n\nKey Name: ${keyGenerated.name}\nAPI Key: ${keyGenerated.api_key}\nCreated: ${new Date().toLocaleString()}\n\n⚠️ IMPORTANT: Store this key securely. It will not be shown again!`], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `vtrustx-api-key-${keyGenerated.name.replace(/\s+/g, '-').toLowerCase()}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    const scopesByCategory = availableScopes.reduce((acc, scope) => {
        if (!acc[scope.category]) {
            acc[scope.category] = [];
        }
        acc[scope.category].push(scope);
        return acc;
    }, {});

    if (step === 2 && keyGenerated) {
        return (
            <div className="api-key-builder">
                <div className="builder-header">
                    <Key size={24} />
                    <h1>API Key Generated</h1>
                </div>

                <div className="key-generated-container">
                    <div className="warning-banner">
                        <AlertCircle size={20} />
                        <div>
                            <strong>Save this API key securely!</strong>
                            <p>This is the only time you'll be able to see this key. Store it in a safe place.</p>
                        </div>
                    </div>

                    <div className="key-display-section">
                        <label>API Key</label>
                        <div className="key-display-container">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={keyGenerated.api_key}
                                readOnly
                                className="key-input-display"
                            />
                            <button
                                className="btn-toggle-visibility"
                                onClick={() => setShowKey(!showKey)}
                                title={showKey ? 'Hide Key' : 'Show Key'}
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <button
                                className="btn-copy-key"
                                onClick={handleCopyKey}
                                title="Copy to Clipboard"
                            >
                                {keyCopied ? <Check size={18} className="copy-success" /> : <Copy size={18} />}
                                {keyCopied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className="key-details-grid">
                        <div className="detail-item">
                            <span className="detail-label">Name</span>
                            <span className="detail-value">{keyGenerated.name}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Environment</span>
                            <span className="detail-value">
                                <span className={`env-badge ${keyGenerated.api_key?.startsWith('vx_test') ? 'test' : 'live'}`}>
                                    {keyGenerated.api_key?.startsWith('vx_test') ? 'Test' : 'Live'}
                                </span>
                            </span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Rate Limit</span>
                            <span className="detail-value">{keyGenerated.rate_limit} requests/hour</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Scopes</span>
                            <span className="detail-value">{keyGenerated.scopes?.length || 0} scopes granted</span>
                        </div>
                    </div>

                    <div className="key-actions">
                        <button className="btn-download" onClick={handleDownloadKey}>
                            Download Key
                        </button>
                        <button className="btn-done" onClick={() => navigate('/api-keys')}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="api-key-builder">
            <div className="builder-header">
                <button className="btn-back" onClick={() => navigate('/api-keys')}>
                    <ArrowLeft size={18} />
                </button>
                <div className="header-content">
                    <Key size={24} />
                    <h1>Create API Key</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="builder-form">
                {error && (
                    <div className="error-banner">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="form-section">
                    <h3>Basic Information</h3>

                    <div className="form-group">
                        <label htmlFor="name">Key Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Production API Key, Development Key"
                            required
                        />
                        <p className="field-hint">A descriptive name to identify this API key</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="What will this API key be used for?"
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="environment">Environment</label>
                            <select
                                id="environment"
                                name="environment"
                                value={formData.environment}
                                onChange={handleInputChange}
                            >
                                <option value="live">Live</option>
                                <option value="test">Test</option>
                            </select>
                            <p className="field-hint">Test keys are prefixed with vx_test_</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="rateLimit">Rate Limit (req/hour)</label>
                            <input
                                type="number"
                                id="rateLimit"
                                name="rateLimit"
                                value={formData.rateLimit}
                                onChange={handleInputChange}
                                min="100"
                                max="100000"
                                step="100"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Permissions (Scopes)</h3>
                    <p className="section-description">
                        Select the permissions this API key should have. Follow the principle of least privilege.
                    </p>

                    <div className="scopes-container">
                        {Object.entries(scopesByCategory).map(([category, scopes]) => (
                            <div key={category} className="scope-category">
                                <div className="category-header">
                                    <h4>{category}</h4>
                                    <button
                                        type="button"
                                        className="btn-select-all"
                                        onClick={() => handleSelectAllScopes(category)}
                                    >
                                        {scopes.every(s => formData.scopes.includes(s.name)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="scope-checkboxes">
                                    {scopes.map((scope) => (
                                        <label key={scope.name} className="scope-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={formData.scopes.includes(scope.name)}
                                                onChange={() => handleScopeToggle(scope.name)}
                                            />
                                            <div className="scope-info">
                                                <code className="scope-name">{scope.name}</code>
                                                <p className="scope-description">{scope.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/api-keys')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-create"
                        disabled={loading || formData.scopes.length === 0}
                    >
                        {loading ? 'Creating...' : 'Create API Key'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default APIKeyBuilder;
