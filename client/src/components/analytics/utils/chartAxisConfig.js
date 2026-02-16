/**
 * Chart Axis Configuration Utilities
 * Handles axis styling, labels, and configuration for Recharts
 */

/**
 * Get axis tick style
 */
export const getAxisTickStyle = (axis, config = {}) => {
    const baseSize = axis === 'x' ? (config.xAxisFontSize || 11) : (config.yAxisFontSize || 11);
    const baseColor = axis === 'x' ? (config.xAxisFontColor || '#64748b') : (config.yAxisFontColor || '#64748b');

    return {
        fontSize: parseInt(baseSize),
        fill: baseColor,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    };
};

/**
 * Get axis label configuration
 */
export const getAxisLabel = (axis, config, fields) => {
    const key = axis === 'x' ? config.xKey : config.yKey;
    if (!key) return undefined;

    let label = fields?.find(f => f.name === key)?.label || key;

    // Add aggregation to Y-axis label
    if (axis === 'y') {
        const agg = config.yAggregation;
        if (agg && agg !== 'auto') {
            label = `${agg.charAt(0).toUpperCase() + agg.slice(1)} of ${label}`;
        }
    }

    const angle = axis === 'x' ? 0 : -90;
    const position = axis === 'x' ? 'insideBottom' : 'insideLeft';
    const offset = axis === 'x' ? -5 : 10;

    return {
        value: label,
        angle,
        position,
        offset,
        style: { fill: '#94a3b8', fontSize: 12 }
    };
};

/**
 * Get secondary Y-axis label
 */
export const getSecondaryYAxisLabel = (config, fields) => {
    if (!config.secondaryYKey) return undefined;

    const key = config.secondaryYKey;
    const agg = config.secondaryYAggregation;
    let label = fields?.find(f => f.name === key)?.label || key;

    if (agg && agg !== 'auto') {
        label = `${agg.charAt(0).toUpperCase() + agg.slice(1)} of ${label}`;
    }

    return {
        value: label,
        angle: 90,
        position: 'insideRight',
        style: { fill: '#94a3b8', fontSize: 12 }
    };
};

/**
 * Get X-axis props for Recharts
 */
export const getXAxisProps = (type, config, fields) => {
    return {
        dataKey: "name",
        type: type === 'bar' && !config.swapAxis ? "category" : (config.swapAxis ? "number" : "category"),
        hide: config.hideXAxis,
        tick: config.xAxisShowValues !== false ? { ...getAxisTickStyle('x', config) } : false,
        label: getAxisLabel('x', config, fields),
        height: parseInt(config.xAxisHeight || 60),
        tickMargin: 10
    };
};

/**
 * Get Y-axis props for Recharts
 */
export const getYAxisProps = (config, fields) => {
    return {
        hide: config.hideYAxis,
        tick: config.yAxisShowValues !== false ? { ...getAxisTickStyle('y', config) } : false,
        label: getAxisLabel('y', config, fields),
        width: parseInt(config.yAxisWidth || 60),
        tickMargin: 10
    };
};

/**
 * Get secondary Y-axis props for combo charts
 */
export const getSecondaryYAxisProps = (config, fields) => {
    return {
        orientation: "right",
        yAxisId: "right",
        tick: config.secondaryYAxisShowValues !== false ? { ...getAxisTickStyle('y', config) } : false,
        label: getSecondaryYAxisLabel(config, fields)
    };
};

/**
 * Get common chart props
 */
export const getCommonChartProps = (handleClick) => {
    return {
        margin: { top: 10, right: 30, left: 10, bottom: 20 },
        onClick: handleClick
    };
};

/**
 * Get element props (for clickable chart elements)
 */
export const getElementProps = (handleClick) => {
    return {
        onClick: handleClick,
        cursor: 'pointer'
    };
};
