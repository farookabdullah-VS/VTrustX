/**
 * Drip Campaign Builder
 *
 * Multi-step wizard for creating automated campaigns
 * Step 1: Basic details (name, survey, channel)
 * Step 2: Campaign steps (initial + reminders)
 * Step 3: Settings (stop conditions, max reminders, timezone)
 * Step 4: Review & create
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../axiosConfig';
import {
    Send,
    ArrowLeft,
    ArrowRight,
    Check,
    Plus,
    Trash2,
    Clock,
    Mail,
    MessageSquare,
    Phone,
    Settings
} from 'lucide-react';
import './DripCampaignBuilder.css';

const DripCampaignBuilder = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [forms, setForms] = useState([]);

    const [campaignData, setCampaignData] = useState({
        name: '',
        description: '',
        formId: '',
        channel: 'email',
        stopOnResponse: true,
        maxReminders: 3,
        timezone: 'UTC',
        steps: [
            {
                step_number: 1,
                step_type: 'initial',
                subject: '',
                body: '',
                delay_value: 0,
                delay_unit: 'days'
            }
        ]
    });

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const response = await axios.get('/api/forms');
            setForms(response.data || []);
        } catch (error) {
            console.error('Failed to fetch forms:', error);
        }
    };

    const handleInputChange = (field, value) => {
        setCampaignData(prev => ({ ...prev, [field]: value }));
    };

    const handleStepChange = (index, field, value) => {
        const newSteps = [...campaignData.steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setCampaignData(prev => ({ ...prev, steps: newSteps }));
    };

    const addStep = () => {
        const newStep = {
            step_number: campaignData.steps.length + 1,
            step_type: 'reminder',
            subject: '',
            body: '',
            delay_value: 1,
            delay_unit: 'days'
        };
        setCampaignData(prev => ({
            ...prev,
            steps: [...prev.steps, newStep]
        }));
    };

    const removeStep = (index) => {
        if (campaignData.steps.length <= 1) return;
        const newSteps = campaignData.steps.filter((_, i) => i !== index);
        // Renumber steps
        newSteps.forEach((step, i) => {
            step.step_number = i + 1;
        });
        setCampaignData(prev => ({ ...prev, steps: newSteps }));
    };

    const validateStep1 = () => {
        if (!campaignData.name) {
            alert('Please enter a campaign name');
            return false;
        }
        if (!campaignData.formId) {
            alert('Please select a survey');
            return false;
        }
        return true;
    };

    const validateStep2 = () => {
        for (let i = 0; i < campaignData.steps.length; i++) {
            const step = campaignData.steps[i];
            if (!step.body) {
                alert(`Please enter message body for Step ${i + 1}`);
                return false;
            }
            if (campaignData.channel === 'email' && i === 0 && !step.subject) {
                alert('Please enter email subject for initial message');
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep === 2 && !validateStep2()) return;
        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            const payload = {
                name: campaignData.name,
                description: campaignData.description,
                formId: parseInt(campaignData.formId),
                channel: campaignData.channel,
                triggerType: 'manual',
                triggerConfig: {},
                stopOnResponse: campaignData.stopOnResponse,
                maxReminders: campaignData.maxReminders,
                timezone: campaignData.timezone,
                steps: campaignData.steps
            };

            const response = await axios.post('/api/drip-campaigns', payload);
            const campaignId = response.data.campaign.id;

            alert('Campaign created successfully!');
            navigate(`/drip-campaigns/${campaignId}`);
        } catch (error) {
            alert('Failed to create campaign: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getChannelIcon = (channel) => {
        switch (channel) {
            case 'email':
                return <Mail size={20} />;
            case 'sms':
                return <MessageSquare size={20} />;
            case 'whatsapp':
                return <Phone size={20} />;
            case 'telegram':
                return <Send size={20} />;
            default:
                return <Mail size={20} />;
        }
    };

    const renderStep1 = () => (
        <div className="wizard-step">
            <h2>Campaign Details</h2>
            <p className="step-description">Set up basic information for your campaign</p>

            <div className="form-group">
                <label htmlFor="name">Campaign Name *</label>
                <input
                    type="text"
                    id="name"
                    value={campaignData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Post-Purchase Follow-up"
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    value={campaignData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    placeholder="Brief description of this campaign's purpose"
                />
            </div>

            <div className="form-group">
                <label htmlFor="formId">Survey *</label>
                <select
                    id="formId"
                    value={campaignData.formId}
                    onChange={(e) => handleInputChange('formId', e.target.value)}
                >
                    <option value="">Select a survey</option>
                    {forms.map(form => (
                        <option key={form.id} value={form.id}>
                            {form.title}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>Channel *</label>
                <div className="channel-selector">
                    {['email', 'sms', 'whatsapp', 'telegram'].map(channel => (
                        <button
                            key={channel}
                            type="button"
                            className={`channel-option ${campaignData.channel === channel ? 'active' : ''}`}
                            onClick={() => handleInputChange('channel', channel)}
                        >
                            {getChannelIcon(channel)}
                            <span>{channel.toUpperCase()}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="wizard-step">
            <h2>Campaign Steps</h2>
            <p className="step-description">Define your initial message and follow-up reminders</p>

            <div className="steps-list">
                {campaignData.steps.map((step, index) => (
                    <div key={index} className="step-editor">
                        <div className="step-header">
                            <div className="step-title">
                                <Clock size={18} />
                                <h3>
                                    {index === 0 ? 'Initial Message' : `Reminder ${index}`}
                                </h3>
                            </div>
                            {index > 0 && (
                                <button
                                    type="button"
                                    className="btn-icon-danger"
                                    onClick={() => removeStep(index)}
                                    title="Remove step"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>

                        {index > 0 && (
                            <div className="delay-config">
                                <label>Send after:</label>
                                <div className="delay-inputs">
                                    <input
                                        type="number"
                                        min="0"
                                        value={step.delay_value}
                                        onChange={(e) => handleStepChange(index, 'delay_value', parseInt(e.target.value) || 0)}
                                    />
                                    <select
                                        value={step.delay_unit}
                                        onChange={(e) => handleStepChange(index, 'delay_unit', e.target.value)}
                                    >
                                        <option value="minutes">Minutes</option>
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                        <option value="weeks">Weeks</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {campaignData.channel === 'email' && (
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    value={step.subject}
                                    onChange={(e) => handleStepChange(index, 'subject', e.target.value)}
                                    placeholder="Email subject line"
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Message Body *</label>
                            <textarea
                                value={step.body}
                                onChange={(e) => handleStepChange(index, 'body', e.target.value)}
                                rows={5}
                                placeholder="Your message content. Use {{survey_url}} to include the survey link."
                            />
                            <small className="help-text">
                                Tip: Use {'{'}{'{'} survey_url {'}'}{'}'}  placeholder for the survey link
                            </small>
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                className="btn-add-step"
                onClick={addStep}
                disabled={campaignData.steps.length >= 10}
            >
                <Plus size={18} />
                Add Reminder Step
            </button>
            {campaignData.steps.length >= 10 && (
                <small className="text-muted">Maximum 10 steps allowed</small>
            )}
        </div>
    );

    const renderStep3 = () => (
        <div className="wizard-step">
            <h2>Campaign Settings</h2>
            <p className="step-description">Configure automation behavior</p>

            <div className="settings-grid">
                <div className="setting-item">
                    <div className="setting-header">
                        <label>
                            <input
                                type="checkbox"
                                checked={campaignData.stopOnResponse}
                                onChange={(e) => handleInputChange('stopOnResponse', e.target.checked)}
                            />
                            <span>Stop on Response</span>
                        </label>
                    </div>
                    <p className="setting-description">
                        Automatically stop sending reminders when recipient submits the survey
                    </p>
                </div>

                <div className="form-group">
                    <label htmlFor="maxReminders">Maximum Reminders</label>
                    <input
                        type="number"
                        id="maxReminders"
                        min="1"
                        max="10"
                        value={campaignData.maxReminders}
                        onChange={(e) => handleInputChange('maxReminders', parseInt(e.target.value) || 3)}
                    />
                    <small className="help-text">
                        Maximum number of reminder steps to send (excluding initial message)
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="timezone">Timezone</label>
                    <select
                        id="timezone"
                        value={campaignData.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                    >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (US)</option>
                        <option value="America/Chicago">Central Time (US)</option>
                        <option value="America/Denver">Mountain Time (US)</option>
                        <option value="America/Los_Angeles">Pacific Time (US)</option>
                        <option value="Europe/London">London</option>
                        <option value="Europe/Paris">Paris</option>
                        <option value="Asia/Dubai">Dubai</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Australia/Sydney">Sydney</option>
                    </select>
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="wizard-step">
            <h2>Review & Create</h2>
            <p className="step-description">Review your campaign configuration</p>

            <div className="review-section">
                <h3>Campaign Details</h3>
                <div className="review-item">
                    <span className="label">Name:</span>
                    <span className="value">{campaignData.name}</span>
                </div>
                <div className="review-item">
                    <span className="label">Survey:</span>
                    <span className="value">
                        {forms.find(f => f.id === parseInt(campaignData.formId))?.title}
                    </span>
                </div>
                <div className="review-item">
                    <span className="label">Channel:</span>
                    <span className="value">{campaignData.channel.toUpperCase()}</span>
                </div>
            </div>

            <div className="review-section">
                <h3>Steps ({campaignData.steps.length})</h3>
                {campaignData.steps.map((step, index) => (
                    <div key={index} className="review-step">
                        <strong>
                            {index === 0 ? 'Initial Message' : `Reminder ${index}`}
                        </strong>
                        {index > 0 && (
                            <small> (after {step.delay_value} {step.delay_unit})</small>
                        )}
                        <p>{step.body.substring(0, 100)}...</p>
                    </div>
                ))}
            </div>

            <div className="review-section">
                <h3>Settings</h3>
                <div className="review-item">
                    <span className="label">Stop on Response:</span>
                    <span className="value">{campaignData.stopOnResponse ? 'Yes' : 'No'}</span>
                </div>
                <div className="review-item">
                    <span className="label">Max Reminders:</span>
                    <span className="value">{campaignData.maxReminders}</span>
                </div>
                <div className="review-item">
                    <span className="label">Timezone:</span>
                    <span className="value">{campaignData.timezone}</span>
                </div>
            </div>
        </div>
    );

    return (
        <div className="campaign-builder">
            <div className="builder-header">
                <button className="btn-back" onClick={() => navigate('/drip-campaigns')}>
                    <ArrowLeft size={20} />
                    Back to Campaigns
                </button>
                <h1>Create Drip Campaign</h1>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
                {[1, 2, 3, 4].map(step => (
                    <div
                        key={step}
                        className={`progress-step ${currentStep >= step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
                    >
                        <div className="step-circle">
                            {currentStep > step ? <Check size={16} /> : step}
                        </div>
                        <span className="step-label">
                            {step === 1 && 'Details'}
                            {step === 2 && 'Steps'}
                            {step === 3 && 'Settings'}
                            {step === 4 && 'Review'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Wizard Content */}
            <div className="wizard-content">
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
            </div>

            {/* Navigation */}
            <div className="wizard-footer">
                {currentStep > 1 && (
                    <button className="btn-secondary" onClick={handleBack}>
                        <ArrowLeft size={18} />
                        Back
                    </button>
                )}
                <div style={{ flex: 1 }}></div>
                {currentStep < 4 ? (
                    <button className="btn-primary" onClick={handleNext}>
                        Next
                        <ArrowRight size={18} />
                    </button>
                ) : (
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create Campaign'}
                        <Check size={18} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default DripCampaignBuilder;
