import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import StepDetails from './steps/StepDetails';
import StepVariants from './steps/StepVariants';
import StepTraffic from './steps/StepTraffic';
import StepReview from './steps/StepReview';
import axios from '../../axiosConfig';
import './ABExperimentBuilder.css';

/**
 * A/B Experiment Builder Wizard
 *
 * 4-step wizard for creating and launching A/B test experiments:
 * 1. Details: Name, channel, form, success metric
 * 2. Variants: Create 2-5 variants with content
 * 3. Traffic: Allocate traffic across variants
 * 4. Review: Summary and launch
 */
export default function ABExperimentBuilder() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [config, setConfig] = useState({
        name: '',
        description: '',
        formId: null,
        channel: 'email',
        successMetric: 'response_rate',
        statisticalMethod: 'frequentist',
        // Bayesian options
        bayesianThreshold: 0.95,
        bayesianMinSample: 100,
        // Sequential options
        sequentialChecks: 5,
        sequentialSampleSize: null,
        // Bandit options
        banditAlgorithm: 'thompson',
        variants: [
            { name: 'A', subject: '', body: '', mediaAttachments: [], trafficAllocation: 50 },
            { name: 'B', subject: '', body: '', mediaAttachments: [], trafficAllocation: 50 }
        ]
    });

    const steps = [
        { number: 1, title: 'Details', component: StepDetails },
        { number: 2, title: 'Variants', component: StepVariants },
        { number: 3, title: 'Traffic', component: StepTraffic },
        { number: 4, title: 'Review', component: StepReview }
    ];

    const CurrentStepComponent = steps[currentStep - 1].component;

    const handleNext = () => {
        // Validate current step
        if (!validateStep(currentStep)) {
            return;
        }
        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!config.name || !config.name.trim()) {
                    setError('Experiment name is required');
                    return false;
                }
                if (!config.formId) {
                    setError('Please select a form');
                    return false;
                }
                break;
            case 2:
                if (config.variants.length < 2) {
                    setError('Need at least 2 variants');
                    return false;
                }
                for (const variant of config.variants) {
                    if (!variant.body || !variant.body.trim()) {
                        setError(`Variant ${variant.name} body is required`);
                        return false;
                    }
                    if (config.channel === 'email' && (!variant.subject || !variant.subject.trim())) {
                        setError(`Variant ${variant.name} subject is required for email`);
                        return false;
                    }
                }
                break;
            case 3:
                const totalAllocation = config.variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
                if (Math.abs(totalAllocation - 100) > 0.01) {
                    setError(`Traffic allocation must sum to 100% (currently ${totalAllocation.toFixed(1)}%)`);
                    return false;
                }
                break;
        }
        setError(null);
        return true;
    };

    const handleLaunch = async () => {
        if (!validateStep(3)) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Prepare traffic allocation object
            const trafficAllocation = {};
            config.variants.forEach(v => {
                trafficAllocation[v.name] = v.trafficAllocation;
            });

            // Prepare variants
            const variants = config.variants.map(v => ({
                name: v.name,
                subject: v.subject,
                body: v.body,
                mediaAttachments: v.mediaAttachments.map(m => m.id)
            }));

            // Prepare advanced statistics options
            const advancedOptions = {};
            if (config.statisticalMethod === 'bayesian') {
                advancedOptions.threshold = config.bayesianThreshold;
                advancedOptions.minimumSampleSize = config.bayesianMinSample;
            } else if (config.statisticalMethod === 'sequential') {
                advancedOptions.plannedSampleSize = config.sequentialSampleSize;
                advancedOptions.numChecks = config.sequentialChecks;
            } else if (config.statisticalMethod === 'bandit') {
                advancedOptions.algorithm = config.banditAlgorithm;
            }

            // Create experiment
            const createResponse = await axios.post('/api/ab-tests', {
                name: config.name,
                description: config.description,
                formId: config.formId,
                channel: config.channel,
                trafficAllocation,
                successMetric: config.successMetric,
                statisticalMethod: config.statisticalMethod,
                advancedOptions: Object.keys(advancedOptions).length > 0 ? advancedOptions : undefined,
                variants
            });

            const experimentId = createResponse.data.experiment.id;

            // Start experiment immediately
            await axios.post(`/api/ab-tests/${experimentId}/start`);

            // Navigate to results page
            navigate(`/ab-tests/${experimentId}`);
        } catch (err) {
            console.error('Failed to launch experiment:', err);
            setError(err.response?.data?.error || 'Failed to launch experiment. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="ab-experiment-builder">
            {/* Header */}
            <div className="builder-header">
                <button className="back-link" onClick={() => navigate('/ab-tests')}>
                    <ChevronLeft size={20} />
                    Back to Dashboard
                </button>
                <h1>Create A/B Test Experiment</h1>
            </div>

            {/* Progress steps */}
            <div className="progress-steps">
                {steps.map((step, index) => (
                    <div
                        key={step.number}
                        className={`progress-step ${currentStep === step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}
                    >
                        <div className="step-circle">{step.number}</div>
                        <div className="step-label">{step.title}</div>
                        {index < steps.length - 1 && <div className="step-connector" />}
                    </div>
                ))}
            </div>

            {/* Error message */}
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}

            {/* Current step content */}
            <div className="step-content">
                <CurrentStepComponent
                    config={config}
                    setConfig={setConfig}
                />
            </div>

            {/* Navigation buttons */}
            <div className="builder-actions">
                {currentStep > 1 && (
                    <button
                        className="btn-secondary"
                        onClick={handleBack}
                        disabled={loading}
                    >
                        <ChevronLeft size={18} />
                        Back
                    </button>
                )}
                <div className="spacer" />
                {currentStep < 4 && (
                    <button
                        className="btn-primary"
                        onClick={handleNext}
                    >
                        Next
                        <ChevronRight size={18} />
                    </button>
                )}
                {currentStep === 4 && (
                    <button
                        className="btn-primary launch-btn"
                        onClick={handleLaunch}
                        disabled={loading}
                    >
                        {loading ? 'Launching...' : '🚀 Launch Experiment'}
                    </button>
                )}
            </div>
        </div>
    );
}
