/**
 * Chart Data Processing Utilities
 * Handles data aggregation, grouping, and transformation for charts
 */

/**
 * Get numeric value from row data
 */
export const getVal = (row, key) => {
    if (!key) return 0;
    const num = parseFloat(row[key]);
    return !isNaN(num) ? num : 0;
};

/**
 * Update statistics for aggregation
 */
export const updateStats = (stats, val) => {
    if (!stats) stats = { sum: 0, count: 0, min: Infinity, max: -Infinity };
    stats.sum += val;
    stats.count += 1;
    stats.min = Math.min(stats.min, val);
    stats.max = Math.max(stats.max, val);
    return stats;
};

/**
 * Calculate final aggregated value based on type
 */
export const getFinalValue = (stats, aggType, fieldKey, fields) => {
    if (!stats) return 0;

    // Default inference
    let type = aggType;
    if (!type || type === 'auto') {
        if (fieldKey) {
            const fieldDef = fields?.find(f => f.name === fieldKey);
            if (fieldDef?.isMeasure) type = fieldDef.aggregation;
            else type = 'sum';
        } else {
            type = 'count';
        }
    }

    switch (type) {
        case 'count': return stats.count;
        case 'sum': return stats.sum;
        case 'avg': return stats.count > 0 ? stats.sum / stats.count : 0;
        case 'min': return stats.min === Infinity ? 0 : stats.min;
        case 'max': return stats.max === -Infinity ? 0 : stats.max;
        default: return stats.sum;
    }
};

/**
 * Process and aggregate chart data
 * Supports grouping by X-axis and optional legend key
 */
export const processChartData = (data, config, fields) => {
    if (!data || data.length === 0 || !config.xKey) return [];

    const groups = {};

    // Primary Y aggregation
    data.forEach(row => {
        const xVal = row[config.xKey] || 'N/A';
        if (!groups[xVal]) groups[xVal] = { _primary: {}, _secondary: {} };

        const seriesVal = config.legendKey ? (row[config.legendKey] || 'Other') : 'value';
        const rawY = getVal(row, config.yKey);
        groups[xVal]._primary[seriesVal] = updateStats(groups[xVal]._primary[seriesVal], rawY);

        // Secondary Y aggregation (for combo charts)
        if (config.secondaryYKey) {
            const rawSecY = getVal(row, config.secondaryYKey);
            groups[xVal]._secondary.lineValue = updateStats(groups[xVal]._secondary.lineValue, rawSecY);
        }
    });

    // Convert to chart data format
    const chartData = Object.keys(groups).map(xVal => {
        const row = { name: xVal };

        // Primary Y values
        Object.keys(groups[xVal]._primary).forEach(seriesKey => {
            row[seriesKey] = getFinalValue(
                groups[xVal]._primary[seriesKey],
                config.yAggregation,
                config.yKey,
                fields
            );
        });

        // Secondary Y value
        if (config.secondaryYKey) {
            row.lineValue = getFinalValue(
                groups[xVal]._secondary.lineValue,
                config.secondaryYAggregation,
                config.secondaryYKey,
                fields
            );
        }

        return row;
    });

    // Sort data
    if (config.sortBy === 'ascending') {
        chartData.sort((a, b) => (a.name > b.name ? 1 : -1));
    } else if (config.sortBy === 'descending') {
        chartData.sort((a, b) => (a.name < b.name ? 1 : -1));
    } else if (config.sortBy === 'value_asc' || config.sortBy === 'value_desc') {
        const valueKey = config.legendKey ? Object.keys(chartData[0] || {}).find(k => k !== 'name') : 'value';
        const mult = config.sortBy === 'value_asc' ? 1 : -1;
        chartData.sort((a, b) => mult * ((a[valueKey] || 0) - (b[valueKey] || 0)));
    }

    // Apply top N filtering
    if (config.topN && parseInt(config.topN) > 0) {
        return chartData.slice(0, parseInt(config.topN));
    }

    return chartData;
};

/**
 * Get series keys from chart data (for legend support)
 */
export const getSeriesKeys = (chartData) => {
    if (!chartData || chartData.length === 0) return [];
    const firstRow = chartData[0];
    return Object.keys(firstRow).filter(k => k !== 'name' && k !== 'lineValue');
};

/**
 * Generate color for series/index
 */
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const getColor = (key, index) => {
    return COLORS[index % COLORS.length];
};
