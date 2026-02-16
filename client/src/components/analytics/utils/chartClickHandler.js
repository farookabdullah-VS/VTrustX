/**
 * Chart Click Handler Utilities
 * Handles click events on charts for filtering
 */

/**
 * Create click handler for chart elements
 * Handles different click event formats from various chart types
 */
export const createChartClickHandler = (config, filters, onFilterChange) => {
    return (data, index) => {
        if (!onFilterChange) return;

        let key = null;
        let value = null;

        // 1. Check Legend/Series click (e.g. clicking a bar segment or legend item)
        if (data && data.dataKey && config.legendKey) {
            key = config.legendKey;
            value = data.dataKey;
        }
        // 2. Check Categorical/X-Axis click (Bar, Line activePayload - clicking the axis/column background)
        else if (data && data.activePayload && data.activePayload.length > 0 && config.xKey) {
            key = config.xKey;
            value = data.activePayload[0].payload.name;
        }
        // 3. Check Direct Item click (Pie, Funnel, Treemap returning item data directly)
        else if (data && data.name && config.xKey) {
            key = config.xKey;
            value = data.name;
        }

        if (key && value !== null) {
            const strVal = String(value);
            const currentFilters = filters[key] || [];

            // Toggle Logic: If currently filtered by this value, clear it. Else, set it.
            if (currentFilters.includes(strVal)) {
                onFilterChange(key, []);
            } else {
                onFilterChange(key, [strVal]);
            }
        }
    };
};
