import { useState, useEffect } from 'react';
import axios from '../../../axiosConfig';
import './Steps.css';

/**
 * Step 1: Experiment Details
 *
 * Configure basic experiment settings:
 * - Name (required)
 * - Description (optional)
 * - Form selection (required)
 * - Channel (email/SMS/WhatsApp)
 * - Success metric
 */
export default function StepDetails({ config, setConfig }) {
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        try {
            const response = await axios.get('/api/forms');
            setForms(response.data);
        } catch (err) {
            console.error('Failed to fetch forms:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="step-container">
            <h2>Experiment Details</h2>
            <p className="step-description">
                Set up the basic information for your A/B test experiment
            </p>

            <div className="form-group">
                <label htmlFor="name">
                    Experiment Name <span className="required">*</span>
                </label>
                <input
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g., Email Subject Line Test Q1"
                    value={config.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                />
                <p className="field-hint">Choose a descriptive name to identify this test</p>
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    className="form-textarea"
                    placeholder="What are you testing and why?"
                    rows={3}
                    value={config.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                />
            </div>

            <div className="form-group">
                <label htmlFor="formId">
                    Select Form <span className="required">*</span>
                </label>
                {loading ? (
                    <div className="loading-select">Loading forms...</div>
                ) : (
                    <select
                        id="formId"
                        className="form-select"
                        value={config.formId || ''}
                        onChange={(e) => handleChange('formId', parseInt(e.target.value))}
                    >
                        <option value="">Choose a form...</option>
                        {forms.map(form => (
                            <option key={form.id} value={form.id}>
                                {form.title}
                            </option>
                        ))}
                    </select>
                )}
                <p className="field-hint">The survey form that will be distributed</p>
            </div>

            <div className="form-group">
                <label>
                    Channel <span className="required">*</span>
                </label>
                <div className="radio-group">
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="channel"
                            value="email"
                            checked={config.channel === 'email'}
                            onChange={(e) => handleChange('channel', e.target.value)}
                        />
                        <span className="radio-label">
                            <span className="channel-icon">📧</span>
                            Email
                        </span>
                    </label>
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="channel"
                            value="sms"
                            checked={config.channel === 'sms'}
                            onChange={(e) => handleChange('channel', e.target.value)}
                        />
                        <span className="radio-label">
                            <span className="channel-icon">💬</span>
                            SMS
                        </span>
                    </label>
                    <label className="radio-option">
                        <input
                            type="radio"
                            name="channel"
                            value="whatsapp"
                            checked={config.channel === 'whatsapp'}
                            onChange={(e) => handleChange('channel', e.target.value)}
                        />
                        <span className="radio-label">
                            <span className="channel-icon">📱</span>
                            WhatsApp
                        </span>
                    </label>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="successMetric">
                    Success Metric <span className="required">*</span>
                </label>
                <select
                    id="successMetric"
                    className="form-select"
                    value={config.successMetric}
                    onChange={(e) => handleChange('successMetric', e.target.value)}
                >
                    <option value="delivery_rate">Delivery Rate</option>
                    {config.channel === 'email' && (
                        <>
                            <option value="open_rate">Open Rate</option>
                            <option value="click_rate">Click Rate</option>
                        </>
                    )}
                    <option value="response_rate">Response Rate (Survey Completion)</option>
                </select>
                <p className="field-hint">The metric that determines the winning variant</p>
            </div>

            <div className="form-group">
                <label>
                    Statistical Method <span className="required">*</span>
                </label>
                <p className="field-hint" style={{ marginBottom: '16px' }}>
                    Choose the analysis approach for your experiment
                </p>

                <div className="method-cards">
                    <div
                        className={`method-card ${config.statisticalMethod === 'frequentist' ? 'selected' : ''}`}
                        onClick={() => handleChange('statisticalMethod', 'frequentist')}
                    >
                        <div className="method-icon">📊</div>
                        <h3 className="method-name">Frequentist</h3>
                        <p className="method-description">
                            Classic A/B testing with chi-square test. Wait until end for results.
                        </p>
                        <span className="method-badge recommended">Recommended for beginners</span>
                    </div>

                    <div
                        className={`method-card ${config.statisticalMethod === 'bayesian' ? 'selected' : ''}`}
                        onClick={() => handleChange('statisticalMethod', 'bayesian')}
                    >
                        <div className="method-icon">🎯</div>
                        <h3 className="method-name">Bayesian</h3>
                        <p className="method-description">
                            Probability-based analysis. Get "95% chance variant B is best" results.
                        </p>
                        <span className="method-badge">Advanced</span>
                    </div>

                    <div
                        className={`method-card ${config.statisticalMethod === 'sequential' ? 'selected' : ''}`}
                        onClick={() => handleChange('statisticalMethod', 'sequential')}
                    >
                        <div className="method-icon">⏩</div>
                        <h3 className="method-name">Sequential</h3>
                        <p className="method-description">
                            Early stopping with O'Brien-Fleming bounds. Get results faster.
                        </p>
                        <span className="method-badge">Fast Results</span>
                    </div>

                    <div
                        className={`method-card ${config.statisticalMethod === 'bandit' ? 'selected' : ''}`}
                        onClick={() => handleChange('statisticalMethod', 'bandit')}
                    >
                        <div className="method-icon">🎰</div>
                        <h3 className="method-name">Multi-Armed Bandit</h3>
                        <p className="method-description">
                            Dynamic traffic allocation. Shift traffic to better-performing variants.
                        </p>
                        <span className="method-badge">Adaptive</span>
                    </div>
                </div>

                {/* Bayesian Options */}
                {config.statisticalMethod === 'bayesian' && (
                    <div className="method-options">
                        <div className="form-group">
                            <label htmlFor="bayesianThreshold">Decision Threshold</label>
                            <select
                                id="bayesianThreshold"
                                className="form-select"
                                value={config.bayesianThreshold || 0.95}
                                onChange={(e) => handleChange('bayesianThreshold', parseFloat(e.target.value))}
                            >
                                <option value={0.90}>90% Probability (Less strict)</option>
                                <option value={0.95}>95% Probability (Recommended)</option>
                                <option value={0.99}>99% Probability (Very strict)</option>
                            </select>
                            <p className="field-hint">
                                Probability threshold to declare a winner
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="bayesianMinSample">Minimum Sample Size per Variant</label>
                            <input
                                id="bayesianMinSample"
                                type="number"
                                className="form-input"
                                min="50"
                                value={config.bayesianMinSample || 100}
                                onChange={(e) => handleChange('bayesianMinSample', parseInt(e.target.value))}
                            />
                            <p className="field-hint">
                                Minimum data required before analysis (recommended: 100+)
                            </p>
                        </div>
                    </div>
                )}

                {/* Sequential Options */}
                {config.statisticalMethod === 'sequential' && (
                    <div className="method-options">
                        <div className="form-group">
                            <label htmlFor="sequentialChecks">Number of Interim Analyses</label>
                            <select
                                id="sequentialChecks"
                                className="form-select"
                                value={config.sequentialChecks || 5}
                                onChange={(e) => handleChange('sequentialChecks', parseInt(e.target.value))}
                            >
                                <option value={3}>3 checks (25%, 50%, 75%, 100%)</option>
                                <option value={5}>5 checks (20%, 40%, 60%, 80%, 100%)</option>
                                <option value={7}>7 checks (14%, 29%, 43%, 57%, 71%, 86%, 100%)</option>
                            </select>
                            <p className="field-hint">
                                How many times to check for early stopping
                            </p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="sequentialSampleSize">Planned Sample Size per Variant</label>
                            <input
                                id="sequentialSampleSize"
                                type="number"
                                className="form-input"
                                min="100"
                                placeholder="e.g., 1000"
                                value={config.sequentialSampleSize || ''}
                                onChange={(e) => handleChange('sequentialSampleSize', parseInt(e.target.value))}
                            />
                            <p className="field-hint">
                                Total planned sample size (will stop early if significant)
                            </p>
                        </div>
                    </div>
                )}

                {/* Bandit Options */}
                {config.statisticalMethod === 'bandit' && (
                    <div className="method-options">
                        <div className="form-group">
                            <label htmlFor="banditAlgorithm">Bandit Algorithm</label>
                            <select
                                id="banditAlgorithm"
                                className="form-select"
                                value={config.banditAlgorithm || 'thompson'}
                                onChange={(e) => handleChange('banditAlgorithm', e.target.value)}
                            >
                                <option value="thompson">Thompson Sampling (Recommended)</option>
                                <option value="ucb">Upper Confidence Bound (UCB1)</option>
                                <option value="epsilon_greedy">Epsilon-Greedy</option>
                            </select>
                            <p className="field-hint">
                                Algorithm for selecting variants dynamically
                            </p>
                        </div>

                        <div className="info-box">
                            <strong>Note:</strong> Traffic allocation will adapt automatically based on performance.
                            Initial allocations set in Step 3 will be used only for the first few assignments.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
