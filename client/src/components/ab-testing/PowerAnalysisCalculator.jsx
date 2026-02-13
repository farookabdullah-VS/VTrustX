import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, Info } from 'lucide-react';
import axios from '../../axiosConfig';
import './PowerAnalysisCalculator.css';

/**
 * Power Analysis Calculator
 *
 * Interactive tool for experiment planning:
 * - Calculate required sample size
 * - Estimate experiment duration
 * - Visualize power curve
 * - Get recommendations
 */
export default function PowerAnalysisCalculator({ onUseResults }) {
    const [inputs, setInputs] = useState({
        baselineRate: 0.10,
        mde: 0.02,
        power: 0.80,
        alpha: 0.05,
        dailyVolume: null
    });

    const [results, setResults] = useState(null);
    const [powerCurve, setPowerCurve] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleInputChange = (field, value) => {
        setInputs(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);

        try {
            // Validate inputs
            if (inputs.baselineRate <= 0 || inputs.baselineRate >= 1) {
                throw new Error('Baseline rate must be between 0 and 1');
            }
            if (inputs.mde <= 0 || inputs.mde >= 1) {
                throw new Error('MDE must be between 0 and 1');
            }

            // Calculate sample size
            const sampleSizeResponse = await axios.post('/api/analytics/power-analysis/calculate-sample-size', {
                baselineRate: inputs.baselineRate,
                mde: inputs.mde,
                power: inputs.power,
                alpha: inputs.alpha
            });

            const calculationResults = sampleSizeResponse.data;

            // Estimate duration if daily volume provided
            let durationResults = null;
            if (inputs.dailyVolume && inputs.dailyVolume > 0) {
                const totalRequired = calculationResults.sampleSizePerVariant * 2;
                const days = Math.ceil(totalRequired / inputs.dailyVolume);
                durationResults = {
                    estimatedDays: days,
                    estimatedWeeks: (days / 7).toFixed(1)
                };
            }

            // Generate power curve
            const powerCurveResponse = await axios.post('/api/analytics/power-analysis/power-curve', {
                baselineRate: inputs.baselineRate,
                mde: inputs.mde,
                alpha: inputs.alpha
            });

            setResults({
                ...calculationResults,
                ...durationResults
            });
            setPowerCurve(powerCurveResponse.data.points);
        } catch (err) {
            console.error('Power analysis failed:', err);
            setError(err.response?.data?.error || err.message || 'Calculation failed');
        } finally {
            setLoading(false);
        }
    };

    const handleUseResults = () => {
        if (onUseResults && results) {
            onUseResults({
                statisticalMethod: 'sequential',
                sequentialSampleSize: results.sampleSizePerVariant,
                sequentialChecks: 5
            });
        }
    };

    const getRecommendations = () => {
        if (!results) return [];

        const recommendations = [];

        if (results.sampleSizePerVariant > 5000) {
            recommendations.push({
                type: 'warning',
                message: 'Large sample size required. Consider increasing MDE or reducing power.'
            });
        }

        if (results.estimatedDays && results.estimatedDays > 30) {
            recommendations.push({
                type: 'warning',
                message: `Long duration (${results.estimatedDays} days). Consider increasing daily volume.`
            });
        }

        if (results.relativeLift < 10) {
            recommendations.push({
                type: 'info',
                message: `Small effect (${results.relativeLift}% lift) requires large sample for detection.`
            });
        }

        if (results.sampleSizePerVariant <= 1000 && results.relativeLift >= 15) {
            recommendations.push({
                type: 'success',
                message: 'Good setup! Reasonable sample size for meaningful improvement detection.'
            });
        }

        return recommendations;
    };

    return (
        <div className="power-analysis-calculator">
            <div className="calculator-header">
                <div className="header-content">
                    <Calculator size={24} />
                    <h2>Power Analysis Calculator</h2>
                </div>
                <p className="header-description">
                    Calculate required sample size and estimate experiment duration
                </p>
            </div>

            <div className="calculator-body">
                {/* Inputs Section */}
                <div className="inputs-section">
                    <div className="input-group">
                        <label htmlFor="baselineRate">
                            Baseline Conversion Rate
                            <span className="info-icon" title="Expected conversion rate for control group">
                                <Info size={14} />
                            </span>
                        </label>
                        <div className="input-with-unit">
                            <input
                                id="baselineRate"
                                type="number"
                                className="calc-input"
                                min="0.01"
                                max="0.99"
                                step="0.01"
                                value={inputs.baselineRate}
                                onChange={(e) => handleInputChange('baselineRate', parseFloat(e.target.value))}
                            />
                            <span className="input-unit">
                                ({(inputs.baselineRate * 100).toFixed(1)}%)
                            </span>
                        </div>
                        <p className="input-hint">e.g., 0.10 = 10% conversion rate</p>
                    </div>

                    <div className="input-group">
                        <label htmlFor="mde">
                            Minimum Detectable Effect (MDE)
                            <span className="info-icon" title="Smallest improvement you want to detect">
                                <Info size={14} />
                            </span>
                        </label>
                        <div className="input-with-unit">
                            <input
                                id="mde"
                                type="number"
                                className="calc-input"
                                min="0.001"
                                max="0.5"
                                step="0.01"
                                value={inputs.mde}
                                onChange={(e) => handleInputChange('mde', parseFloat(e.target.value))}
                            />
                            <span className="input-unit">
                                ({((inputs.mde / inputs.baselineRate) * 100).toFixed(1)}% lift)
                            </span>
                        </div>
                        <p className="input-hint">e.g., 0.02 = 2 percentage point improvement</p>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label htmlFor="power">Statistical Power</label>
                            <select
                                id="power"
                                className="calc-select"
                                value={inputs.power}
                                onChange={(e) => handleInputChange('power', parseFloat(e.target.value))}
                            >
                                <option value={0.70}>70% (Lower)</option>
                                <option value={0.80}>80% (Recommended)</option>
                                <option value={0.90}>90% (Higher)</option>
                                <option value={0.95}>95% (Very High)</option>
                            </select>
                            <p className="input-hint">Chance of detecting effect if it exists</p>
                        </div>

                        <div className="input-group">
                            <label htmlFor="alpha">Significance Level (α)</label>
                            <select
                                id="alpha"
                                className="calc-select"
                                value={inputs.alpha}
                                onChange={(e) => handleInputChange('alpha', parseFloat(e.target.value))}
                            >
                                <option value={0.10}>10% (α = 0.10)</option>
                                <option value={0.05}>5% (α = 0.05, Recommended)</option>
                                <option value={0.01}>1% (α = 0.01, Strict)</option>
                            </select>
                            <p className="input-hint">False positive rate</p>
                        </div>
                    </div>

                    <div className="input-group">
                        <label htmlFor="dailyVolume">
                            Daily Volume (Optional)
                            <span className="info-icon" title="Expected participants per day for duration estimate">
                                <Info size={14} />
                            </span>
                        </label>
                        <input
                            id="dailyVolume"
                            type="number"
                            className="calc-input"
                            min="1"
                            placeholder="e.g., 100"
                            value={inputs.dailyVolume || ''}
                            onChange={(e) => handleInputChange('dailyVolume', parseInt(e.target.value) || null)}
                        />
                        <p className="input-hint">For duration estimation (participants/day)</p>
                    </div>

                    <button
                        className="btn-calculate"
                        onClick={handleCalculate}
                        disabled={loading}
                    >
                        {loading ? 'Calculating...' : <><Calculator size={18} /> Calculate</>}
                    </button>
                </div>

                {/* Results Section */}
                {error && (
                    <div className="error-box">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {results && (
                    <div className="results-section">
                        <h3>Results</h3>

                        <div className="results-cards">
                            <div className="result-card primary">
                                <div className="result-label">Required Sample Size</div>
                                <div className="result-value">
                                    {results.sampleSizePerVariant.toLocaleString()}
                                    <span className="result-unit">per variant</span>
                                </div>
                                <div className="result-subtext">
                                    {results.totalSampleSize.toLocaleString()} total (2 variants)
                                </div>
                            </div>

                            <div className="result-card">
                                <div className="result-label">Relative Lift</div>
                                <div className="result-value">
                                    {results.relativeLift}%
                                </div>
                                <div className="result-subtext">
                                    From {(results.baselineRate * 100).toFixed(1)}% to {((results.baselineRate + results.mde) * 100).toFixed(1)}%
                                </div>
                            </div>

                            {results.estimatedDays && (
                                <div className="result-card">
                                    <div className="result-label">Estimated Duration</div>
                                    <div className="result-value">
                                        {results.estimatedDays}
                                        <span className="result-unit">days</span>
                                    </div>
                                    <div className="result-subtext">
                                        ≈ {results.estimatedWeeks} weeks
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Recommendations */}
                        {getRecommendations().length > 0 && (
                            <div className="recommendations">
                                <h4>Recommendations</h4>
                                <ul>
                                    {getRecommendations().map((rec, index) => (
                                        <li key={index} className={`recommendation-${rec.type}`}>
                                            {rec.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Power Curve */}
                        {powerCurve.length > 0 && (
                            <div className="power-curve">
                                <h4>Power Curve</h4>
                                <p className="chart-description">
                                    Relationship between sample size and statistical power
                                </p>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={powerCurve}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="sampleSize"
                                            label={{ value: 'Sample Size per Variant', position: 'insideBottom', offset: -5 }}
                                        />
                                        <YAxis
                                            label={{ value: 'Statistical Power', angle: -90, position: 'insideLeft' }}
                                            domain={[0, 1]}
                                            tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                                        />
                                        <Tooltip
                                            formatter={(value) => `${(value * 100).toFixed(1)}%`}
                                            labelFormatter={(label) => `Sample Size: ${label}`}
                                        />
                                        <Legend />
                                        <ReferenceLine
                                            y={0.80}
                                            stroke="#10B981"
                                            strokeDasharray="5 5"
                                            label="80% Power"
                                        />
                                        <ReferenceLine
                                            x={results.sampleSizePerVariant}
                                            stroke="#6366F1"
                                            strokeDasharray="5 5"
                                            label="Calculated"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="power"
                                            stroke="#6366F1"
                                            strokeWidth={3}
                                            dot={false}
                                            name="Power"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Use Results Button */}
                        {onUseResults && (
                            <button
                                className="btn-use-results"
                                onClick={handleUseResults}
                            >
                                Use These Settings in Experiment
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
