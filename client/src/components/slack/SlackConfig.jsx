/**
 * Slack Bot Configuration Component
 *
 * Allows users to:
 * - Configure Slack bot credentials (OAuth token)
 * - Test bot connection
 * - Set event subscription URL
 * - Configure welcome messages
 * - Send test messages
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { Send, Settings, Check, AlertCircle, ExternalLink } from 'lucide-react';
import './SlackConfig.css';

const SlackConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [formData, setFormData] = useState({
        botToken: '',
        appId: '',
        signingSecret: '',
        webhookUrl: '',
        allowChannels: true,
        allowPrivateChannels: false,
        welcomeMessage: ''
    });

    // Test message data
    const [testMessage, setTestMessage] = useState({
        channel: '',
        text: 'Hello! This is a test message from VTrustX.'
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/slack/config');

            if (response.data.success) {
                setConfig(response.data.data);
                setFormData({
                    botToken: '',
                    appId: response.data.data.app_id || '',
                    signingSecret: '',
                    webhookUrl: response.data.data.webhook_url || '',
                    allowChannels: response.data.data.allow_channels !== false,
                    allowPrivateChannels: response.data.data.allow_private_channels || false,
                    welcomeMessage: response.data.data.welcome_message || ''
                });
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Failed to fetch Slack config:', error);
            }
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

    const handleTestBot = async () => {
        if (!formData.botToken) {
            setTestResult({ success: false, error: 'Please enter a bot token' });
            return;
        }

        try {
            setTesting(true);
            setTestResult(null);

            const response = await axios.post('/api/slack/test', {
                botToken: formData.botToken
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

    const handleSaveConfig = async (e) => {
        e.preventDefault();

        if (!formData.botToken && !config) {
            alert('Please enter a bot token');
            return;
        }

        try {
            setSaving(true);

            const payload = {
                botToken: formData.botToken || config?.bot_token,
                appId: formData.appId,
                signingSecret: formData.signingSecret,
                webhookUrl: formData.webhookUrl,
                allowChannels: formData.allowChannels,
                allowPrivateChannels: formData.allowPrivateChannels,
                welcomeMessage: formData.welcomeMessage
            };

            const response = await axios.post('/api/slack/config', payload);

            if (response.data.success) {
                alert('Configuration saved successfully!');
                fetchConfig();
                setFormData(prev => ({ ...prev, botToken: '', signingSecret: '' }));
            }
        } catch (error) {
            alert('Failed to save configuration: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestMessage = async () => {
        if (!testMessage.channel) {
            alert('Please enter a channel or user ID');
            return;
        }

        try {
            const response = await axios.post('/api/slack/send', {
                channel: testMessage.channel,
                text: testMessage.text
            });

            if (response.data.success) {
                alert('Test message sent successfully!');
                setTestMessage(prev => ({ ...prev, channel: '', text: 'Hello! This is a test message from VTrustX.' }));
            } else {
                alert('Failed to send message: ' + response.data.error);
            }
        } catch (error) {
            alert('Failed to send message: ' + (error.response?.data?.error || error.message));
        }
    };

    if (loading) {
        return (
            <div className="slack-config">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="slack-config">
            {/* Header */}
            <div className="slack-header">
                <div className="header-left">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M6.813 20.188a3.188 3.188 0 1 1 0 6.375 3.188 3.188 0 0 1 0-6.375zm9.563 0h3.187v3.188a3.188 3.188 0 0 1-6.375 0v-3.188a3.188 3.188 0 0 1 3.188-3.188z" fill="#E01E5A"/>
                        <path d="M20.188 6.813a3.188 3.188 0 1 1 6.375 0 3.188 3.188 0 0 1-6.375 0zm0 9.563v3.187h-3.188a3.188 3.188 0 0 1 0-6.375h3.188a3.188 3.188 0 0 1 3.188 3.188z" fill="#36C5F0"/>
                        <path d="M26.563 20.188a3.188 3.188 0 1 1 0-6.375 3.188 3.188 0 0 1 0 6.375zm-9.563 0h-3.188v-3.188a3.188 3.188 0 0 1 6.375 0v3.188a3.188 3.188 0 0 1-3.187 3.188z" fill="#2EB67D"/>
                        <path d="M6.813 11.813a3.188 3.188 0 1 1 0-6.376 3.188 3.188 0 0 1 0 6.376zm0 0v3.187h3.187a3.188 3.188 0 0 1 0 6.375H6.813A3.188 3.188 0 0 1 3.625 18v-6.188a3.188 3.188 0 0 1 3.188-3.187z" fill="#ECB22E"/>
                    </svg>
                    <div>
                        <h1>Slack Bot Configuration</h1>
                        <p>Connect your Slack workspace to send survey invitations</p>
                    </div>
                </div>
                {config && (
                    <div className="status-badge active">
                        <Check size={16} />
                        Connected
                    </div>
                )}
            </div>

            {/* Setup Instructions */}
            <div className="info-card">
                <h3>Setup Instructions</h3>
                <ol>
                    <li>Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer">api.slack.com/apps</a></li>
                    <li>Create a new app or select an existing one</li>
                    <li>Navigate to <strong>OAuth & Permissions</strong></li>
                    <li>Add these bot token scopes: <code>chat:write</code>, <code>users:read</code>, <code>channels:read</code></li>
                    <li>Install the app to your workspace</li>
                    <li>Copy the <strong>Bot User OAuth Token</strong> (starts with xoxb-)</li>
                    <li>Paste the token below and save</li>
                </ol>
                <a
                    href="https://api.slack.com/start/building"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                >
                    <ExternalLink size={16} />
                    View Slack API Documentation
                </a>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSaveConfig} className="config-form">
                <div className="form-section">
                    <h3><Settings size={20} /> Bot Credentials</h3>

                    <div className="form-group">
                        <label htmlFor="botToken">
                            Bot User OAuth Token
                            {config && <span className="optional">(leave empty to keep existing)</span>}
                        </label>
                        <div className="input-with-button">
                            <input
                                type="password"
                                id="botToken"
                                name="botToken"
                                value={formData.botToken}
                                onChange={handleInputChange}
                                placeholder="xoxb-..."
                            />
                            <button
                                type="button"
                                onClick={handleTestBot}
                                disabled={!formData.botToken || testing}
                                className="btn-test"
                            >
                                {testing ? 'Testing...' : 'Test'}
                            </button>
                        </div>
                        {config && config.workspace_name && (
                            <small className="help-text">
                                Current workspace: <strong>{config.workspace_name}</strong>
                            </small>
                        )}
                    </div>

                    {testResult && (
                        <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                            {testResult.success ? (
                                <>
                                    <Check size={20} />
                                    <div>
                                        <strong>Bot verified!</strong>
                                        <p>Workspace: {testResult.workspace.name}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={20} />
                                    <div>
                                        <strong>Verification failed</strong>
                                        <p>{testResult.error}</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="appId">App ID (optional)</label>
                        <input
                            type="text"
                            id="appId"
                            name="appId"
                            value={formData.appId}
                            onChange={handleInputChange}
                            placeholder="A01234567"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signingSecret">Signing Secret (optional)</label>
                        <input
                            type="password"
                            id="signingSecret"
                            name="signingSecret"
                            value={formData.signingSecret}
                            onChange={handleInputChange}
                            placeholder="For verifying requests from Slack"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="webhookUrl">Event Subscription URL (optional)</label>
                        <input
                            type="url"
                            id="webhookUrl"
                            name="webhookUrl"
                            value={formData.webhookUrl}
                            onChange={handleInputChange}
                            placeholder="https://yourdomain.com/api/slack/events"
                            readOnly
                        />
                        <small className="help-text">
                            Use this URL in your Slack app's Event Subscriptions settings
                        </small>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Bot Settings</h3>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="allowChannels"
                                checked={formData.allowChannels}
                                onChange={handleInputChange}
                            />
                            <span>Allow bot to post in public channels</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="allowPrivateChannels"
                                checked={formData.allowPrivateChannels}
                                onChange={handleInputChange}
                            />
                            <span>Allow bot to post in private channels</span>
                        </label>
                    </div>

                    <div className="form-group">
                        <label htmlFor="welcomeMessage">Welcome Message (optional)</label>
                        <textarea
                            id="welcomeMessage"
                            name="welcomeMessage"
                            value={formData.welcomeMessage}
                            onChange={handleInputChange}
                            rows={4}
                            placeholder="Welcome! Thank you for connecting with us..."
                        />
                        <small className="help-text">
                            This message will be sent when users first interact with your bot
                        </small>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="submit"
                        disabled={saving || (!formData.botToken && !config)}
                        className="btn-primary"
                    >
                        {saving ? 'Saving...' : config ? 'Update Configuration' : 'Save Configuration'}
                    </button>
                </div>
            </form>

            {/* Test Message Section */}
            {config && (
                <div className="test-message-section">
                    <h3><Send size={20} /> Send Test Message</h3>
                    <p>Send a test message to verify your bot is working correctly</p>

                    <div className="form-group">
                        <label htmlFor="channel">Channel or User ID</label>
                        <input
                            type="text"
                            id="channel"
                            value={testMessage.channel}
                            onChange={(e) => setTestMessage(prev => ({ ...prev, channel: e.target.value }))}
                            placeholder="C01234567 (channel) or U01234567 (user)"
                        />
                        <small className="help-text">
                            Channel IDs start with C, User IDs start with U
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="testText">Message</label>
                        <textarea
                            id="testText"
                            value={testMessage.text}
                            onChange={(e) => setTestMessage(prev => ({ ...prev, text: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={!testMessage.channel}
                        className="btn-primary"
                    >
                        <Send size={16} />
                        Send Test Message
                    </button>
                </div>
            )}
        </div>
    );
};

export default SlackConfig;
