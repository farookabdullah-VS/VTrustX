/**
 * Telegram Bot Configuration Component
 *
 * Allows users to:
 * - Configure Telegram bot credentials
 * - Test bot connection
 * - Set webhook URL
 * - Configure welcome messages
 * - Send test messages
 */

import React, { useState, useEffect } from 'react';
import axios from '../../axiosConfig';
import { Send, Bot, Check, AlertCircle, ExternalLink, Settings } from 'lucide-react';
import './TelegramConfig.css';

const TelegramConfig = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [formData, setFormData] = useState({
        botToken: '',
        webhookUrl: '',
        allowGroups: false,
        allowChannels: false,
        welcomeMessage: ''
    });

    // Test chat data
    const [testChat, setTestChat] = useState({
        chatId: '',
        message: 'Hello! This is a test message from VTrustX.'
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/telegram/config');

            if (response.data.success) {
                setConfig(response.data.data);
                setFormData({
                    botToken: '',
                    webhookUrl: response.data.data.webhook_url || '',
                    allowGroups: response.data.data.allow_groups || false,
                    allowChannels: response.data.data.allow_channels || false,
                    welcomeMessage: response.data.data.welcome_message || ''
                });
            }
        } catch (error) {
            if (error.response?.status !== 404) {
                console.error('Failed to fetch Telegram config:', error);
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

            const response = await axios.post('/api/telegram/test', {
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
                webhookUrl: formData.webhookUrl,
                allowGroups: formData.allowGroups,
                allowChannels: formData.allowChannels,
                welcomeMessage: formData.welcomeMessage
            };

            const response = await axios.post('/api/telegram/config', payload);

            if (response.data.success) {
                alert('Configuration saved successfully!');
                fetchConfig();
                setFormData(prev => ({ ...prev, botToken: '' }));
            }
        } catch (error) {
            alert('Failed to save configuration: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleSendTestMessage = async () => {
        if (!testChat.chatId) {
            alert('Please enter a chat ID');
            return;
        }

        try {
            const response = await axios.post('/api/telegram/send', {
                chatId: testChat.chatId,
                text: testChat.message
            });

            if (response.data.success) {
                alert('Test message sent successfully!');
                setTestChat(prev => ({ ...prev, chatId: '', message: 'Hello! This is a test message from VTrustX.' }));
            } else {
                alert('Failed to send message: ' + response.data.error);
            }
        } catch (error) {
            alert('Failed to send message: ' + (error.response?.data?.error || error.message));
        }
    };

    if (loading) {
        return (
            <div className="telegram-config">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading configuration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="telegram-config">
            {/* Header */}
            <div className="telegram-header">
                <div className="header-left">
                    <Bot size={32} className="telegram-icon" />
                    <div>
                        <h1>Telegram Bot Configuration</h1>
                        <p>Connect your Telegram bot to send survey invitations</p>
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
                    <li>Open Telegram and search for <strong>@BotFather</strong></li>
                    <li>Send <code>/newbot</code> command</li>
                    <li>Follow the prompts to create your bot</li>
                    <li>Copy the bot token provided by BotFather</li>
                    <li>Paste the token below and save</li>
                </ol>
                <a
                    href="https://core.telegram.org/bots/tutorial"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="external-link"
                >
                    <ExternalLink size={16} />
                    View Telegram Bot Documentation
                </a>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSaveConfig} className="config-form">
                <div className="form-section">
                    <h3><Settings size={20} /> Bot Credentials</h3>

                    <div className="form-group">
                        <label htmlFor="botToken">
                            Bot Token
                            {config && <span className="optional">(leave empty to keep existing)</span>}
                        </label>
                        <div className="input-with-button">
                            <input
                                type="password"
                                id="botToken"
                                name="botToken"
                                value={formData.botToken}
                                onChange={handleInputChange}
                                placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
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
                        {config && config.bot_username && (
                            <small className="help-text">
                                Current bot: <strong>@{config.bot_username}</strong>
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
                                        <p>Username: @{testResult.bot.username}</p>
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
                        <label htmlFor="webhookUrl">Webhook URL (optional)</label>
                        <input
                            type="url"
                            id="webhookUrl"
                            name="webhookUrl"
                            value={formData.webhookUrl}
                            onChange={handleInputChange}
                            placeholder="https://yourdomain.com/api/telegram/webhook/your-tenant-id"
                        />
                        <small className="help-text">
                            Set a webhook to receive delivery updates and user interactions
                        </small>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Bot Settings</h3>

                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                name="allowGroups"
                                checked={formData.allowGroups}
                                onChange={handleInputChange}
                            />
                            <span>Allow bot to be added to groups</span>
                        </label>

                        <label>
                            <input
                                type="checkbox"
                                name="allowChannels"
                                checked={formData.allowChannels}
                                onChange={handleInputChange}
                            />
                            <span>Allow bot to be added to channels</span>
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
                            This message will be sent when users start a conversation with your bot
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
                        <label htmlFor="chatId">Chat ID</label>
                        <input
                            type="text"
                            id="chatId"
                            value={testChat.chatId}
                            onChange={(e) => setTestChat(prev => ({ ...prev, chatId: e.target.value }))}
                            placeholder="123456789 or @username"
                        />
                        <small className="help-text">
                            Get your chat ID by sending a message to your bot and checking updates
                        </small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="testMessage">Message</label>
                        <textarea
                            id="testMessage"
                            value={testChat.message}
                            onChange={(e) => setTestChat(prev => ({ ...prev, message: e.target.value }))}
                            rows={3}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSendTestMessage}
                        disabled={!testChat.chatId}
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

export default TelegramConfig;
