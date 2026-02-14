import React, { useState } from 'react';
import axios from '../../axiosConfig';
import { useNavigate } from 'react-router-dom';
import { Webhook, ArrowLeft, AlertCircle, Info } from 'lucide-react';
import './WebhookBuilder.css';

function WebhookBuilder() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        url: '',
        events: [],
        headers: {},
        retryConfig: {
            max_attempts: 3,
            backoff_multiplier: 2
        }
    });

    const availableEvents = [
        { name: 'response.received', description: 'Triggered when a new survey response is received', category: 'Responses' },
        { name: 'response.completed', description: 'Triggered when a survey response is completed', category: 'Responses' },
        { name: 'distribution.sent', description: 'Triggered when a distribution campaign is sent', category: 'Distributions' },
        { name: 'distribution.completed', description: 'Triggered when a distribution campaign completes', category: 'Distributions' },
        { name: 'workflow.triggered', description: 'Triggered when a workflow automation executes', category: 'Workflows' },
        { name: 'form.created', description: 'Triggered when a new form is created', category: 'Forms' },
        { name: 'form.updated', description: 'Triggered when a form is updated', category: 'Forms' }
    ];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleEventToggle = (eventName) => {
        setFormData(prev => ({
            ...prev,
            events: prev.events.includes(eventName)
                ? prev.events.filter(e => e !== eventName)
                : [...prev.events, eventName]
        }));
    };

    const handleSelectAllEvents = (category) => {
        const categoryEvents = availableEvents
            .filter(event => event.category === category)
            .map(event => event.name);

        const allSelected = categoryEvents.every(event => formData.events.includes(event));

        if (allSelected) {
            setFormData(prev => ({
                ...prev,
                events: prev.events.filter(e => !categoryEvents.includes(e))
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                events: Array.from(new Set([...prev.events, ...categoryEvents]))
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Webhook name is required');
            return;
        }

        if (!formData.url.trim() || (!formData.url.startsWith('http://') && !formData.url.startsWith('https://'))) {
            setError('Please provide a valid webhook URL (must start with http:// or https://)');
            return;
        }

        if (formData.events.length === 0) {
            setError('Please select at least one event');
            return;
        }

        setError(null);
        setLoading(true);

        try {
            await axios.post('/api/webhooks', formData);
            navigate('/webhooks');
        } catch (err) {
            console.error('Failed to create webhook:', err);
            setError(err.response?.data?.error || 'Failed to create webhook');
        } finally {
            setLoading(false);
        }
    };

    const eventsByCategory = availableEvents.reduce((acc, event) => {
        if (!acc[event.category]) {
            acc[event.category] = [];
        }
        acc[event.category].push(event);
        return acc;
    }, {});

    return (
        <div className="webhook-builder">
            <div className="builder-header">
                <button className="btn-back" onClick={() => navigate('/webhooks')}>
                    <ArrowLeft size={18} />
                </button>
                <div className="header-content">
                    <Webhook size={24} />
                    <h1>Create Webhook</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="builder-form">
                {error && (
                    <div className="error-banner">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}

                <div className="info-banner">
                    <Info size={20} />
                    <div>
                        <strong>What are webhooks?</strong>
                        <p>Webhooks allow you to receive real-time HTTP notifications when events occur in your VTrustX account. Your endpoint will receive POST requests with event data.</p>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Basic Information</h3>

                    <div className="form-group">
                        <label htmlFor="name">Webhook Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Production Webhook, Slack Notifications"
                            required
                        />
                        <p className="field-hint">A descriptive name to identify this webhook</p>
                    </div>

                    <div className="form-group">
                        <label htmlFor="url">Endpoint URL *</label>
                        <input
                            type="url"
                            id="url"
                            name="url"
                            value={formData.url}
                            onChange={handleInputChange}
                            placeholder="https://api.example.com/webhooks/vtrustx"
                            required
                        />
                        <p className="field-hint">The URL where webhook events will be sent (must start with https://)</p>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Events to Subscribe</h3>
                    <p className="section-description">
                        Select which events should trigger this webhook. Your endpoint will receive a POST request whenever these events occur.
                    </p>

                    <div className="events-container">
                        {Object.entries(eventsByCategory).map(([category, events]) => (
                            <div key={category} className="event-category">
                                <div className="category-header">
                                    <h4>{category}</h4>
                                    <button
                                        type="button"
                                        className="btn-select-all"
                                        onClick={() => handleSelectAllEvents(category)}
                                    >
                                        {events.every(e => formData.events.includes(e.name)) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="event-checkboxes">
                                    {events.map((event) => (
                                        <label key={event.name} className="event-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={formData.events.includes(event.name)}
                                                onChange={() => handleEventToggle(event.name)}
                                            />
                                            <div className="event-info">
                                                <code className="event-name">{event.name}</code>
                                                <p className="event-description">{event.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-section">
                    <h3>Delivery Configuration</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="max_attempts">Max Retry Attempts</label>
                            <input
                                type="number"
                                id="max_attempts"
                                value={formData.retryConfig.max_attempts}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    retryConfig: {
                                        ...prev.retryConfig,
                                        max_attempts: parseInt(e.target.value)
                                    }
                                }))}
                                min="1"
                                max="10"
                            />
                            <p className="field-hint">Number of times to retry failed deliveries (default: 3)</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="backoff_multiplier">Backoff Multiplier</label>
                            <input
                                type="number"
                                id="backoff_multiplier"
                                value={formData.retryConfig.backoff_multiplier}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    retryConfig: {
                                        ...prev.retryConfig,
                                        backoff_multiplier: parseInt(e.target.value)
                                    }
                                }))}
                                min="1"
                                max="5"
                            />
                            <p className="field-hint">Exponential backoff multiplier (default: 2)</p>
                        </div>
                    </div>

                    <div className="info-box">
                        <strong>Webhook Security</strong>
                        <p>All webhook requests include an HMAC-SHA256 signature in the <code>X-VTrustX-Signature</code> header. Use the webhook secret (provided after creation) to verify the authenticity of incoming requests.</p>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => navigate('/webhooks')}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn-create"
                        disabled={loading || formData.events.length === 0}
                    >
                        {loading ? 'Creating...' : 'Create Webhook'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default WebhookBuilder;
