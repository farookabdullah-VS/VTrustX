import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './Steps.css';

/**
 * Step 3: Traffic Allocation
 *
 * Distribute traffic across variants:
 * - Sliders for each variant
 * - Visual pie/bar chart showing split
 * - Equal split button for quick setup
 * - Must sum to 100%
 */
export default function StepTraffic({ config, setConfig }) {
    const handleAllocationChange = (index, value) => {
        const newValue = parseFloat(value);

        setConfig(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) =>
                i === index ? { ...v, trafficAllocation: newValue } : v
            )
        }));
    };

    const handleEqualSplit = () => {
        const equalAllocation = 100 / config.variants.length;

        setConfig(prev => ({
            ...prev,
            variants: prev.variants.map(v => ({
                ...v,
                trafficAllocation: parseFloat(equalAllocation.toFixed(1))
            }))
        }));
    };

    const totalAllocation = config.variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    const isValid = Math.abs(totalAllocation - 100) < 0.01;

    // Prepare data for bar chart
    const chartData = config.variants.map(v => ({
        name: `Variant ${v.name}`,
        allocation: v.trafficAllocation
    }));

    const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <div className="step-container">
            <div className="step-header-with-action">
                <div>
                    <h2>Traffic Allocation</h2>
                    <p className="step-description">
                        Distribute traffic across your variants (must total 100%)
                    </p>
                </div>
                <button className="btn-secondary-small" onClick={handleEqualSplit}>
                    Equal Split
                </button>
            </div>

            {/* Allocation sliders */}
            <div className="allocation-sliders">
                {config.variants.map((variant, index) => (
                    <div key={variant.name} className="slider-group">
                        <div className="slider-header">
                            <span className="variant-label">Variant {variant.name}</span>
                            <span className="allocation-value">
                                {variant.trafficAllocation.toFixed(1)}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={variant.trafficAllocation}
                            onChange={(e) => handleAllocationChange(index, e.target.value)}
                            className="allocation-slider"
                            style={{
                                background: `linear-gradient(to right, ${COLORS[index]} ${variant.trafficAllocation}%, #E5E7EB ${variant.trafficAllocation}%)`
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* Total indicator */}
            <div className={`total-indicator ${isValid ? 'valid' : 'invalid'}`}>
                <span className="total-label">Total Allocation:</span>
                <span className="total-value">{totalAllocation.toFixed(1)}%</span>
                {isValid ? (
                    <span className="status-icon">✓</span>
                ) : (
                    <span className="status-icon">⚠</span>
                )}
            </div>

            {/* Visual chart */}
            <div className="chart-container">
                <h3>Traffic Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                        <Bar dataKey="allocation" radius={[8, 8, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Recommendations */}
            <div className="recommendations-box">
                <h4>💡 Recommendations</h4>
                <ul>
                    <li>For most tests, an equal split (50/50 or 33/33/33) is recommended</li>
                    <li>Unequal splits can be useful when testing a risky variant</li>
                    <li>Ensure each variant gets at least 100 recipients for statistical significance</li>
                </ul>
            </div>
        </div>
    );
}
