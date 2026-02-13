import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import PowerAnalysisCalculator from './PowerAnalysisCalculator';
import './PowerAnalysisPage.css';

/**
 * Power Analysis Page
 *
 * Standalone page for the Power Analysis Calculator tool.
 * Helps users plan experiments by calculating required sample sizes.
 */
export default function PowerAnalysisPage() {
    const navigate = useNavigate();

    const handleUseResults = (settings) => {
        // Redirect to experiment builder with pre-filled settings
        navigate('/ab-tests/new', {
            state: {
                prefillSettings: settings
            }
        });
    };

    return (
        <div className="power-analysis-page">
            <div className="page-header">
                <button className="back-button" onClick={() => navigate('/ab-tests')}>
                    <ChevronLeft size={20} />
                    Back to Dashboard
                </button>
            </div>

            <div className="page-content">
                <div className="intro-section">
                    <h1>Power Analysis Calculator</h1>
                    <p className="intro-text">
                        Plan your A/B test experiment with confidence. This calculator helps you determine
                        the required sample size to detect meaningful improvements with statistical certainty.
                    </p>

                    <div className="info-cards">
                        <div className="info-card">
                            <div className="info-icon">📊</div>
                            <h3>What is Power Analysis?</h3>
                            <p>
                                Power analysis determines how many participants you need to reliably
                                detect a difference between variants if one exists.
                            </p>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">🎯</div>
                            <h3>Why Use It?</h3>
                            <p>
                                Avoid running experiments that are too small (missing real effects) or
                                too large (wasting time and resources).
                            </p>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">⚡</div>
                            <h3>Quick Planning</h3>
                            <p>
                                Get instant estimates for experiment duration and see how different
                                parameters affect your required sample size.
                            </p>
                        </div>
                    </div>
                </div>

                <PowerAnalysisCalculator onUseResults={handleUseResults} />

                <div className="tips-section">
                    <h2>Tips for Using the Calculator</h2>
                    <div className="tips-grid">
                        <div className="tip-card">
                            <strong>Baseline Rate:</strong>
                            <p>
                                Use historical data if available. If you don't have data, estimate conservatively.
                                A 10% conversion rate (0.10) is a common starting point.
                            </p>
                        </div>

                        <div className="tip-card">
                            <strong>Minimum Detectable Effect:</strong>
                            <p>
                                The smallest improvement worth detecting. A 20% relative lift (e.g., from 10% to 12%)
                                is often practical. Smaller effects require much larger samples.
                            </p>
                        </div>

                        <div className="tip-card">
                            <strong>Statistical Power:</strong>
                            <p>
                                80% power (default) means an 80% chance of detecting a real effect. Higher power
                                reduces false negatives but requires more participants.
                            </p>
                        </div>

                        <div className="tip-card">
                            <strong>Significance Level:</strong>
                            <p>
                                5% (α = 0.05) is standard. It means a 5% chance of false positives. Stricter levels
                                (1%) require larger samples but reduce false discoveries.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
