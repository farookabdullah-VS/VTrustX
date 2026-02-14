/**
 * Microsoft Teams Bot Configuration
 *
 * Configure Microsoft Teams Bot integration for survey distribution
 * Supports:
 * - Bot Framework authentication (App ID + App Password)
 * - Adaptive Cards for rich messages
 * - Team channels, group chats, and 1:1 conversations
 * - Test message functionality
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import './TeamsConfig.css';
import { MessageSquare, CheckCircle, XCircle, Send, ExternalLink, Settings, Shield, Users } from 'lucide-react';

const TeamsConfig = () => {
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [config, setConfig] = useState(null);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [sendingTest, setSendingTest] = useState(false);
    const [testMessageResult, setTestMessageResult] = useState(null);

    const [formData, setFormData] = useState({
        appId: '',
        appPassword: '',
        botName: '',
        serviceUrl: 'https://smba.trafficmanager.net/apis/',
        tenantFilter: '',
        allowTeams: true,
        allowChannels: true,
        allowGroupChat: true,
        welcomeMessage: ''
    });

    const [testMessage, setTestMessage] = useState({
        conversationId: '',
        message: 'Hello from VTrustX! This is a test message.'
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/teams/config');

            if (response.data.configured) {
                setConfigured(true);
                setConfig(response.data.config);
                setFormData({
                    appId: response.data.config.appId || '',
                    appPassword: '', // Never populate password from backend
                    botName: response.data.config.botName || '',
                    serviceUrl: response.data.config.serviceUrl || 'https://smba.trafficmanager.net/apis/',
                    tenantFilter: (response.data.config.tenantFilter || []).join(', '),
                    allowTeams: response.data.config.allowTeams !== false,
                    allowChannels: response.data.config.allowChannels !== false,
                    allowGroupChat: response.data.config.allowGroupChat !== false,
                    welcomeMessage: response.data.config.welcomeMessage || ''
                });
            }
        } catch (error) {
            console.error('Failed to fetch Teams config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTestCredentials = async () => {
        if (!formData.appId || !formData.appPassword) {
            setTestResult({ success: false, error: 'App ID and App Password are required' });
            return;
        }

        try {
            setTesting(true);
            setTestResult(null);

            const response = await axios.post('/api/teams/test', {
                appId: formData.appId,
                appPassword: formData.appPassword
            });

            setTestResult(response.data);
        } catch (error) {
            setTestResult({
                success: false,
                error: error.response?.data?.error || 'Test failed'
            });
        } finally {
            setTesting(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!formData.appId || !formData.appPassword) {
            alert('App ID and App Password are required');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                appId: formData.appId,
                appPassword: formData.appPassword,
                botName: formData.botName || undefined,
                serviceUrl: formData.serviceUrl || undefined,
                tenantFilter: formData.tenantFilter
                    ? formData.tenantFilter.split(',').map(t => t.trim()).filter(Boolean)
                    : undefined,
                allowTeams: formData.allowTeams,
                allowChannels: formData.allowChannels,
                allowGroupChat: formData.allowGroupChat,
                welcomeMessage: formData.welcomeMessage || undefined
            };

            const response = await axios.post('/api/teams/config', payload);

            if (response.data.success) {
                alert('Teams bot configuration saved successfully!');
                setConfigured(true);
                fetchConfig();
            }
        } catch (error) {
            alert('Failed to save configuration: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestMessage = async () => {
        if (!testMessage.conversationId) {
            setTestMessageResult({ success: false, error: 'Conversation ID is required' });
            return;
        }

        try {
            setSendingTest(true);
            setTestMessageResult(null);

            const response = await axios.post('/api/teams/send', {
                conversationId: testMessage.conversationId,
                text: testMessage.message
            });

            setTestMessageResult(response.data);
        } catch (error) {
            setTestMessageResult({
                success: false,
                error: error.response?.data?.error || 'Failed to send test message'
            });
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return (
            <div className="teams-config">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading Teams configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="teams-config">
            {/* Header */}
            <div className="teams-header">
                <div className="header-left">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="48" rx="8" fill="#5059C9"/>
                        <path d="M16 14H12V34H16V14Z" fill="white"/>
                        <path d="M24 14H20V34H24V14Z" fill="white"/>
                        <path d="M32 14H28V34H32V14Z" fill="white"/>
                        <path d="M40 14H36V34H40V14Z" fill="white"/>
                        <rect x="12" y="22" width="28" height="4" fill="white"/>
                    </svg>
                    <div>
                        <h1>Microsoft Teams Bot</h1>
                        <p>Configure your Teams bot to send survey invitations via Microsoft Teams</p>
                    </div>
                </div>
                {configured && config?.isActive && (
                    <div className="status-badge active">
                        <CheckCircle size={16} />
                        <span>Active</span>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="info-card">
                <h3>Setup Instructions</h3>
                <ol>
                    <li>
                        Go to{' '}
                        <a
                            href="https://dev.botframework.com/bots/new"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                        >
                            Bot Framework Portal
                            <ExternalLink size={14} />
                        </a>
                    </li>
                    <li>Create a new bot registration (or use existing one)</li>
                    <li>Copy the <code>Microsoft App ID</code> and generate a <code>Client Secret</code></li>
                    <li>Under Channels, add <strong>Microsoft Teams</strong> channel</li>
                    <li>Set the messaging endpoint to: <code>https://yourdomain.com/api/teams/messaging</code></li>
                    <li>Paste your App ID and App Password below and click <strong>Save Configuration</strong></li>
                    <li>Add contacts with <code>teams_user_id</code> or <code>teams_channel_id</code> in the Contacts module</li>
                </ol>
                <a
                    href="https://docs.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                >
                    View Full Documentation
                    <ExternalLink size={14} />
                </a>
            </div>

            {/* Configuration Form */}
            <div className="config-form">
                <div className="form-section">
                    <h3>
                        <Shield size={20} />
                        Authentication
                    </h3>

                    <div className="form-group">
                        <label htmlFor="appId">
                            Microsoft App ID <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <div className="input-with-button">
                            <input
                                type="text"
                                id="appId"
                                name="appId"
                                value={formData.appId}
                                onChange={handleInputChange}
                                placeholder="00000000-0000-0000-0000-000000000000"
                            />
                            <button
                                className="btn-test"
                                onClick={handleTestCredentials}
                                disabled={testing || !formData.appId || !formData.appPassword}
                            >
                                {testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        <span className="help-text">
                            Your bot's Azure AD application ID (GUID format)
                        </span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="appPassword">
                            App Password (Client Secret) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="password"
                            id="appPassword"
                            name="appPassword"
                            value={formData.appPassword}
                            onChange={handleInputChange}
                            placeholder={configured ? '••••••••••••••••' : 'Enter app password'}
                        />
                        <span className="help-text">
                            Your bot's client secret (never shared, stored encrypted)
                        </span>
                    </div>

                    {testResult && (
                        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                            {testResult.success ? (
                                <CheckCircle size={20} />
                            ) : (
                                <XCircle size={20} />
                            )}
                            <div>
                                <strong>{testResult.success ? 'Success!' : 'Test Failed'}</strong>
                                <p>{testResult.message || testResult.error}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h3>
                        <Settings size={20} />
                        Bot Settings
                    </h3>

                    <div className="form-group">
                        <label htmlFor="botName">
                            Bot Name <span className="optional">(optional)</span>
                        </label>
                        <input
                            type="text"
                            id="botName"
                            name="botName"
                            value={formData.botName}
                            onChange={handleInputChange}
                            placeholder="VTrustX Survey Bot"
                        />
                        <span className="help-text">Display name for your bot</span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="serviceUrl">
                            Service URL <span className="optional">(optional)</span>
                        </label>
                        <input
                            type="url"
                            id="serviceUrl"
                            name="serviceUrl"
                            value={formData.serviceUrl}
                            onChange={handleInputChange}
                            placeholder="https://smba.trafficmanager.net/apis/"
                        />
                        <span className="help-text">
                            Bot Framework service URL (usually default is fine)
                        </span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="tenantFilter">
                            Azure AD Tenant Filter <span className="optional">(optional)</span>
                        </label>
                        <input
                            type="text"
                            id="tenantFilter"
                            name="tenantFilter"
                            value={formData.tenantFilter}
                            onChange={handleInputChange}
                            placeholder="tenant-id-1, tenant-id-2"
                        />
                        <span className="help-text">
                            Comma-separated list of allowed Azure AD tenant IDs (leave empty to allow all)
                        </span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="welcomeMessage">
                            Welcome Message <span className="optional">(optional)</span>
                        </label>
                        <textarea
                            id="welcomeMessage"
                            name="welcomeMessage"
                            value={formData.welcomeMessage}
                            onChange={handleInputChange}
                            placeholder="Welcome! I'm here to help you with surveys."
                            rows={3}
                        />
                        <span className="help-text">
                            Message sent when bot is first added to a team or chat
                        </span>
                    </div>
                </div>

                <div className="form-section">
                    <h3>
                        <Users size={20} />
                        Permissions
                    </h3>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="allowTeams"
                                checked={formData.allowTeams}
                                onChange={handleInputChange}
                            />
                            Allow posting in Teams
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="allowChannels"
                                checked={formData.allowChannels}
                                onChange={handleInputChange}
                            />
                            Allow posting in Channels
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                name="allowGroupChat"
                                checked={formData.allowGroupChat}
                                onChange={handleInputChange}
                            />
                            Allow 1:1 and group chats
                        </label>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        className="btn-primary"
                        onClick={handleSaveConfig}
                        disabled={saving || !formData.appId || !formData.appPassword}
                    >
                        {saving ? 'Saving...' : configured ? 'Update Configuration' : 'Save Configuration'}
                    </button>
                </div>
            </div>

            {/* Test Message Section */}
            {configured && (
                <div className="test-message-section">
                    <h3>
                        <Send size={20} />
                        Send Test Message
                    </h3>
                    <p>Send a test message to verify your bot is working correctly</p>

                    <div className="form-group">
                        <label htmlFor="conversationId">
                            Conversation ID <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            type="text"
                            id="conversationId"
                            value={testMessage.conversationId}
                            onChange={(e) =>
                                setTestMessage((prev) => ({ ...prev, conversationId: e.target.value }))
                            }
                            placeholder="19:xxxxx@thread.tacv2"
                        />
                        <span className="help-text">
                            Teams conversation ID or user ID (Azure AD UPN)
                        </span>
                    </div>

                    <div className="form-group">
                        <label htmlFor="testMessageText">Message</label>
                        <textarea
                            id="testMessageText"
                            value={testMessage.message}
                            onChange={(e) =>
                                setTestMessage((prev) => ({ ...prev, message: e.target.value }))
                            }
                            rows={3}
                        />
                    </div>

                    <button
                        className="btn-primary"
                        onClick={handleSendTestMessage}
                        disabled={sendingTest || !testMessage.conversationId}
                    >
                        <Send size={16} />
                        {sendingTest ? 'Sending...' : 'Send Test Message'}
                    </button>

                    {testMessageResult && (
                        <div className={`test-result ${testMessageResult.success ? 'success' : 'error'}`}>
                            {testMessageResult.success ? (
                                <CheckCircle size={20} />
                            ) : (
                                <XCircle size={20} />
                            )}
                            <div>
                                <strong>
                                    {testMessageResult.success ? 'Message Sent!' : 'Send Failed'}
                                </strong>
                                {testMessageResult.success && testMessageResult.activityId && (
                                    <p>Activity ID: {testMessageResult.activityId}</p>
                                )}
                                {testMessageResult.error && <p>{testMessageResult.error}</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamsConfig;
