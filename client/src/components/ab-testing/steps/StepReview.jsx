import './Steps.css';

/**
 * Step 4: Review & Launch
 *
 * Final review of experiment configuration:
 * - Summary of all settings
 * - Estimated sample size needed
 * - Launch button
 */
export default function StepReview({ config }) {
    // Calculate estimated sample size for statistical significance
    const calculateSampleSize = () => {
        const baselineRate = 0.15; // Assume 15% baseline conversion
        const minDetectableEffect = 0.03; // Want to detect 3% improvement
        const alpha = 0.05; // 95% confidence
        const power = 0.80; // 80% power

        // Simplified formula (actual calculation is more complex)
        const n = Math.ceil(
            16 * Math.pow((baselineRate * (1 - baselineRate)), 1) /
            Math.pow(minDetectableEffect, 2)
        );

        return n * config.variants.length;
    };

    const estimatedSampleSize = calculateSampleSize();

    const getChannelLabel = (channel) => {
        const labels = {
            email: '📧 Email',
            sms: '💬 SMS',
            whatsapp: '📱 WhatsApp'
        };
        return labels[channel] || channel;
    };

    const getMetricLabel = (metric) => {
        const labels = {
            delivery_rate: 'Delivery Rate',
            open_rate: 'Open Rate',
            click_rate: 'Click Rate',
            response_rate: 'Response Rate (Survey Completion)'
        };
        return labels[metric] || metric;
    };

    return (
        <div className="step-container">
            <h2>Review & Launch</h2>
            <p className="step-description">
                Review your experiment settings before launching
            </p>

            {/* Experiment summary */}
            <div className="review-section">
                <h3>Experiment Details</h3>
                <div className="review-grid">
                    <div className="review-item">
                        <span className="review-label">Name:</span>
                        <span className="review-value">{config.name}</span>
                    </div>
                    {config.description && (
                        <div className="review-item">
                            <span className="review-label">Description:</span>
                            <span className="review-value">{config.description}</span>
                        </div>
                    )}
                    <div className="review-item">
                        <span className="review-label">Channel:</span>
                        <span className="review-value">{getChannelLabel(config.channel)}</span>
                    </div>
                    <div className="review-item">
                        <span className="review-label">Success Metric:</span>
                        <span className="review-value">{getMetricLabel(config.successMetric)}</span>
                    </div>
                </div>
            </div>

            {/* Variants summary */}
            <div className="review-section">
                <h3>Variants ({config.variants.length})</h3>
                <div className="variants-review">
                    {config.variants.map((variant) => (
                        <div key={variant.name} className="variant-review-card">
                            <div className="variant-review-header">
                                <span className="variant-badge">Variant {variant.name}</span>
                                <span className="traffic-badge">{variant.trafficAllocation}% traffic</span>
                            </div>
                            {config.channel === 'email' && (
                                <div className="variant-detail">
                                    <span className="detail-label">Subject:</span>
                                    <span className="detail-value">{variant.subject}</span>
                                </div>
                            )}
                            <div className="variant-detail">
                                <span className="detail-label">Body:</span>
                                <div className="body-preview">
                                    {variant.body.substring(0, 150)}
                                    {variant.body.length > 150 && '...'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sample size recommendation */}
            <div className="info-box">
                <h4>📊 Statistical Recommendations</h4>
                <ul>
                    <li>
                        <strong>Estimated sample size needed:</strong> ~{estimatedSampleSize} total recipients
                        (≥{Math.ceil(estimatedSampleSize / config.variants.length)} per variant)
                    </li>
                    <li>
                        <strong>Confidence level:</strong> 95% (p-value &lt; 0.05 required for winner)
                    </li>
                    <li>
                        <strong>Minimum runtime:</strong> At least 24-48 hours for reliable results
                    </li>
                </ul>
            </div>

            {/* Launch checklist */}
            <div className="checklist-box">
                <h4>✓ Pre-Launch Checklist</h4>
                <ul className="checklist">
                    <li className="checked">Experiment name and description are clear</li>
                    <li className="checked">All variants have complete content</li>
                    <li className="checked">Traffic allocation totals 100%</li>
                    <li className="checked">Success metric is appropriate for your goal</li>
                </ul>
            </div>

            {/* Warning box */}
            <div className="warning-box">
                <h4>⚠️ Before You Launch</h4>
                <p>
                    Once launched, the experiment will automatically assign variants to recipients in your next
                    distribution campaign. Make sure all content is proofread and tested.
                </p>
                <p>
                    You can pause the experiment at any time, but it's recommended to let it run until
                    statistical significance is achieved.
                </p>
            </div>
        </div>
    );
}
