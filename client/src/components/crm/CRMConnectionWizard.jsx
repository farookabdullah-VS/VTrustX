/**
 * CRM Connection Setup Wizard
 *
 * Multi-step wizard for setting up new CRM connections
 * Steps:
 * 1. Select Platform
 * 2. Authentication (OAuth or API Key)
 * 3. Field Mapping Configuration
 * 4. Test & Finalize
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    AlertCircle,
    Loader,
    Key,
    Link2,
    Settings,
    Check
} from 'lucide-react';
import axios from '../../axiosConfig';
import './CRMConnectionWizard.css';

const CRMConnectionWizard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [currentStep, setCurrentStep] = useState(1);
    const [platforms, setPlatforms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Form data
    const [formData, setFormData] = useState({
        platform: searchParams.get('platform') || '',
        connectionName: '',
        authType: 'oauth2', // or 'api_key'
        credentials: {
            apiKey: '',
            accessToken: '',
            refreshToken: '',
            instanceUrl: '',
            clientId: '',
            clientSecret: '',
            apiDomain: ''
        },
        settings: {
            autoSync: false,
            syncInterval: 60,
            pushResponses: true,
            bidirectionalSync: false
        },
        fieldMappings: []
    });

    useEffect(() => {
        fetchPlatforms();
    }, []);

    const fetchPlatforms = async () => {
        try {
            const response = await axios.get('/api/crm-connections/platforms');
            setPlatforms(response.data.data);
        } catch (error) {
            console.error('Failed to fetch platforms:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCredentialChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            credentials: {
                ...prev.credentials,
                [field]: value
            }
        }));
    };

    const handleSettingChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            settings: {
                ...prev.settings,
                [field]: value
            }
        }));
    };

    const handleOAuthConnect = async () => {
        try {
            const redirectUri = `${window.location.origin}/crm-connections/oauth-callback`;

            const response = await axios.get(
                `/api/crm-connections/oauth/${formData.platform}/url`,
                { params: { redirectUri } }
            );

            const { authUrl, state } = response.data.data;

            // Store state for validation
            sessionStorage.setItem('oauth_state', state);
            sessionStorage.setItem('oauth_platform', formData.platform);
            sessionStorage.setItem('oauth_connection_name', formData.connectionName);

            // Redirect to OAuth provider
            window.location.href = authUrl;
        } catch (error) {
            console.error('Failed to initiate OAuth:', error);
            alert('Failed to initiate OAuth connection');
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setTestResult(null);

        try {
            // Create temporary connection for testing
            const response = await axios.post('/api/crm-connections', {
                platform: formData.platform,
                connectionName: formData.connectionName + ' (Test)',
                credentials: formData.credentials,
                settings: formData.settings
            });

            const connectionId = response.data.data.id;

            // Test the connection
            const testResponse = await axios.post(
                `/api/crm-connections/${connectionId}/test`
            );

            if (testResponse.data.data.success) {
                setTestResult({
                    success: true,
                    message: 'Connection successful!',
                    connectionId
                });
            } else {
                // Delete failed test connection
                await axios.delete(`/api/crm-connections/${connectionId}`);

                setTestResult({
                    success: false,
                    message: testResponse.data.data.message || 'Connection failed'
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error.response?.data?.error || 'Connection test failed'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleFinalize = async () => {
        setLoading(true);

        try {
            if (testResult?.connectionId) {
                // Update test connection to final
                await axios.put(`/api/crm-connections/${testResult.connectionId}`, {
                    connectionName: formData.connectionName
                });

                navigate(`/crm-connections`);
            } else {
                // Create new connection
                const response = await axios.post('/api/crm-connections', {
                    platform: formData.platform,
                    connectionName: formData.connectionName,
                    credentials: formData.credentials,
                    settings: formData.settings
                });

                navigate(`/crm-connections`);
            }
        } catch (error) {
            console.error('Failed to finalize connection:', error);
            alert('Failed to create connection');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.platform && formData.connectionName;
            case 2:
                if (formData.authType === 'api_key') {
                    return formData.credentials.apiKey;
                }
                return true; // OAuth handles its own flow
            case 3:
                return true; // Settings are optional
            case 4:
                return testResult?.success;
            default:
                return false;
        }
    };

    const selectedPlatform = platforms.find(p => p.id === formData.platform);

    return (
        <div className="crm-wizard">
            {/* Header */}
            <div className="wizard-header">
                <h1>Connect Your CRM</h1>
                <p>Follow the steps below to integrate your CRM platform</p>
            </div>

            {/* Progress Steps */}
            <div className="wizard-progress">
                {[
                    { num: 1, label: 'Platform' },
                    { num: 2, label: 'Authentication' },
                    { num: 3, label: 'Settings' },
                    { num: 4, label: 'Test' }
                ].map((step) => (
                    <div
                        key={step.num}
                        className={`progress-step ${currentStep >= step.num ? 'active' : ''} ${
                            currentStep > step.num ? 'completed' : ''
                        }`}
                    >
                        <div className="step-number">
                            {currentStep > step.num ? <Check size={16} /> : step.num}
                        </div>
                        <div className="step-label">{step.label}</div>
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="wizard-content">
                {/* Step 1: Select Platform */}
                {currentStep === 1 && (
                    <div className="wizard-step">
                        <h2>Select CRM Platform</h2>
                        <p className="step-description">Choose your CRM platform to get started</p>

                        <div className="platform-selection">
                            {platforms.map((platform) => (
                                <div
                                    key={platform.id}
                                    className={`platform-option ${
                                        formData.platform === platform.id ? 'selected' : ''
                                    }`}
                                    onClick={() => handleInputChange('platform', platform.id)}
                                >
                                    <div className="platform-icon-large">
                                        {platform.id === 'salesforce' && '☁️'}
                                        {platform.id === 'hubspot' && '🟠'}
                                        {platform.id === 'zoho' && '🔶'}
                                    </div>
                                    <h3>{platform.name}</h3>
                                    <p>{platform.description}</p>
                                    {formData.platform === platform.id && (
                                        <div className="selected-badge">
                                            <CheckCircle size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="form-group">
                            <label>Connection Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Primary Salesforce Account"
                                value={formData.connectionName}
                                onChange={(e) => handleInputChange('connectionName', e.target.value)}
                            />
                            <small>Give this connection a memorable name</small>
                        </div>
                    </div>
                )}

                {/* Step 2: Authentication */}
                {currentStep === 2 && (
                    <div className="wizard-step">
                        <h2>Authenticate with {selectedPlatform?.name}</h2>
                        <p className="step-description">
                            Connect your account to sync data
                        </p>

                        {selectedPlatform?.authType === 'oauth2' ? (
                            <div className="auth-oauth">
                                <div className="oauth-info">
                                    <Key size={48} color="#3B82F6" />
                                    <h3>OAuth 2.0 Authentication</h3>
                                    <p>
                                        Click the button below to securely authorize VTrustX to access
                                        your {selectedPlatform.name} account.
                                    </p>
                                    <ul>
                                        <li>✓ Secure OAuth 2.0 protocol</li>
                                        <li>✓ No password storage</li>
                                        <li>✓ Revocable access</li>
                                    </ul>
                                </div>

                                <button
                                    className="btn-oauth-connect"
                                    onClick={handleOAuthConnect}
                                >
                                    <Link2 size={20} />
                                    Connect to {selectedPlatform.name}
                                </button>
                            </div>
                        ) : (
                            <div className="auth-api-key">
                                <div className="form-group">
                                    <label>API Key</label>
                                    <input
                                        type="password"
                                        placeholder="Enter your API key"
                                        value={formData.credentials.apiKey}
                                        onChange={(e) =>
                                            handleCredentialChange('apiKey', e.target.value)
                                        }
                                    />
                                    <small>
                                        Find your API key in your {selectedPlatform?.name} account settings
                                    </small>
                                </div>

                                {formData.platform === 'salesforce' && (
                                    <>
                                        <div className="form-group">
                                            <label>Instance URL</label>
                                            <input
                                                type="text"
                                                placeholder="https://your-instance.salesforce.com"
                                                value={formData.credentials.instanceUrl}
                                                onChange={(e) =>
                                                    handleCredentialChange('instanceUrl', e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Client ID</label>
                                            <input
                                                type="text"
                                                value={formData.credentials.clientId}
                                                onChange={(e) =>
                                                    handleCredentialChange('clientId', e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Client Secret</label>
                                            <input
                                                type="password"
                                                value={formData.credentials.clientSecret}
                                                onChange={(e) =>
                                                    handleCredentialChange('clientSecret', e.target.value)
                                                }
                                            />
                                        </div>
                                    </>
                                )}

                                {formData.platform === 'zoho' && (
                                    <div className="form-group">
                                        <label>API Domain</label>
                                        <select
                                            value={formData.credentials.apiDomain}
                                            onChange={(e) =>
                                                handleCredentialChange('apiDomain', e.target.value)
                                            }
                                        >
                                            <option value="https://www.zohoapis.com">US (.com)</option>
                                            <option value="https://www.zohoapis.eu">EU (.eu)</option>
                                            <option value="https://www.zohoapis.in">India (.in)</option>
                                            <option value="https://www.zohoapis.com.au">Australia (.com.au)</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Settings */}
                {currentStep === 3 && (
                    <div className="wizard-step">
                        <h2>Configure Settings</h2>
                        <p className="step-description">
                            Customize how VTrustX interacts with your CRM
                        </p>

                        <div className="settings-grid">
                            <div className="setting-item">
                                <div className="setting-header">
                                    <label>Auto-Sync Contacts</label>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.autoSync}
                                        onChange={(e) =>
                                            handleSettingChange('autoSync', e.target.checked)
                                        }
                                    />
                                </div>
                                <p>Automatically sync contacts on a schedule</p>
                            </div>

                            {formData.settings.autoSync && (
                                <div className="setting-item">
                                    <label>Sync Interval (minutes)</label>
                                    <input
                                        type="number"
                                        min="15"
                                        max="1440"
                                        value={formData.settings.syncInterval}
                                        onChange={(e) =>
                                            handleSettingChange('syncInterval', parseInt(e.target.value))
                                        }
                                    />
                                </div>
                            )}

                            <div className="setting-item">
                                <div className="setting-header">
                                    <label>Push Survey Responses</label>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.pushResponses}
                                        onChange={(e) =>
                                            handleSettingChange('pushResponses', e.target.checked)
                                        }
                                    />
                                </div>
                                <p>Automatically push survey responses to CRM</p>
                            </div>

                            <div className="setting-item">
                                <div className="setting-header">
                                    <label>Bidirectional Sync</label>
                                    <input
                                        type="checkbox"
                                        checked={formData.settings.bidirectionalSync}
                                        onChange={(e) =>
                                            handleSettingChange('bidirectionalSync', e.target.checked)
                                        }
                                    />
                                </div>
                                <p>Sync changes in both directions</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Test */}
                {currentStep === 4 && (
                    <div className="wizard-step">
                        <h2>Test Connection</h2>
                        <p className="step-description">
                            Verify that your connection is working correctly
                        </p>

                        <div className="test-section">
                            {!testResult && (
                                <div className="test-prompt">
                                    <Settings size={48} color="#6B7280" />
                                    <p>Click the button below to test your connection</p>
                                    <button
                                        className="btn-test"
                                        onClick={handleTestConnection}
                                        disabled={testing}
                                    >
                                        {testing ? (
                                            <>
                                                <Loader size={20} className="spinner" />
                                                Testing...
                                            </>
                                        ) : (
                                            <>Test Connection</>
                                        )}
                                    </button>
                                </div>
                            )}

                            {testResult && (
                                <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                                    {testResult.success ? (
                                        <>
                                            <CheckCircle size={48} />
                                            <h3>Connection Successful!</h3>
                                            <p>{testResult.message}</p>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle size={48} />
                                            <h3>Connection Failed</h3>
                                            <p>{testResult.message}</p>
                                            <button
                                                className="btn-retry"
                                                onClick={handleTestConnection}
                                            >
                                                Retry Test
                                            </button>
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
                    onClick={prevStep}
                    disabled={currentStep === 1}
                >
                    <ArrowLeft size={20} />
                    Previous
                </button>

                {currentStep < 4 ? (
                    <button
                        className="btn-primary"
                        onClick={nextStep}
                        disabled={!canProceed()}
                    >
                        Next
                        <ArrowRight size={20} />
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleFinalize}
                        disabled={!canProceed() || loading}
                    >
                        {loading ? (
                            <>
                                <Loader size={20} className="spinner" />
                                Finalizing...
                            </>
                        ) : (
                            <>
                                Complete Setup
                                <CheckCircle size={20} />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default CRMConnectionWizard;
