/**
 * Widget Data Service
 *
 * Fetches and processes data for report widgets based on their configuration
 * Supports multiple widget types: charts, tables, metrics, funnels, etc.
 * Handles filtering, aggregation, and data transformation
 */

const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');

class WidgetDataService {
    /**
     * Fetch data for a widget based on its configuration
     */
    static async fetchWidgetData(widget, reportFilters, tenantId) {
        const { widgetType, config, dataSource, localFilters } = widget;

        // Merge report-level and widget-level filters
        const mergedFilters = this.mergeFilters(reportFilters, localFilters);

        try {
            switch (widgetType) {
                case 'metric':
                    return await this.fetchMetricData(config, dataSource, mergedFilters, tenantId);

                case 'chart':
                    return await this.fetchChartData(config, dataSource, mergedFilters, tenantId);

                case 'table':
                    return await this.fetchTableData(config, dataSource, mergedFilters, tenantId);

                case 'funnel':
                    return await this.fetchFunnelData(config, dataSource, mergedFilters, tenantId);

                case 'heatmap':
                    return await this.fetchHeatmapData(config, dataSource, mergedFilters, tenantId);

                case 'text':
                    return { content: config.content || '', type: 'text' };

                case 'gauge':
                    return await this.fetchGaugeData(config, dataSource, mergedFilters, tenantId);

                case 'progress':
                    return await this.fetchProgressData(config, dataSource, mergedFilters, tenantId);

                default:
                    throw new Error(`Unsupported widget type: ${widgetType}`);
            }
        } catch (error) {
            logger.error('[WidgetDataService] Failed to fetch widget data', {
                error: error.message,
                widgetType,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Fetch metric data (single number KPI)
     */
    static async fetchMetricData(config, dataSource, filters, tenantId) {
        const { metric, aggregate = 'count', comparisonPeriod = null } = config;

        const whereClause = this.buildWhereClause(dataSource, filters, tenantId);
        let metricQuery = '';

        switch (metric) {
            case 'total_responses':
                metricQuery = `SELECT COUNT(*) as value FROM submissions WHERE ${whereClause}`;
                break;

            case 'nps_score':
                metricQuery = `
                    SELECT
                        ROUND(
                            (SUM(CASE WHEN score >= 9 THEN 1 ELSE 0 END)::float / COUNT(*) * 100) -
                            (SUM(CASE WHEN score <= 6 THEN 1 ELSE 0 END)::float / COUNT(*) * 100)
                        , 2) as value
                    FROM (
                        SELECT CAST(response_value AS INTEGER) as score
                        FROM responses r
                        JOIN submissions s ON r.submission_id = s.id
                        JOIN questions q ON r.question_id = q.id
                        WHERE ${whereClause} AND q.question_type = 'nps'
                    ) nps_scores
                `;
                break;

            case 'csat_score':
                metricQuery = `
                    SELECT ROUND(AVG(CAST(response_value AS FLOAT)), 2) as value
                    FROM responses r
                    JOIN submissions s ON r.submission_id = s.id
                    JOIN questions q ON r.question_id = q.id
                    WHERE ${whereClause} AND q.question_type = 'rating'
                `;
                break;

            case 'completion_rate':
                metricQuery = `
                    SELECT ROUND(
                        SUM(CASE WHEN is_complete THEN 1 ELSE 0 END)::float / COUNT(*) * 100,
                        2
                    ) as value
                    FROM submissions
                    WHERE ${whereClause}
                `;
                break;

            case 'avg_response_time':
                metricQuery = `
                    SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 60), 2) as value
                    FROM submissions
                    WHERE ${whereClause} AND is_complete = true
                `;
                break;

            default:
                // Custom field aggregation
                if (aggregate === 'count') {
                    metricQuery = `SELECT COUNT(*) as value FROM submissions WHERE ${whereClause}`;
                } else {
                    metricQuery = `SELECT ${aggregate}(${metric}) as value FROM submissions WHERE ${whereClause}`;
                }
        }

        const result = await query(metricQuery);
        const currentValue = parseFloat(result.rows[0]?.value || 0);

        // Fetch comparison period data if specified
        let comparisonValue = null;
        let change = null;
        let changePercent = null;

        if (comparisonPeriod) {
            const comparisonFilters = this.getComparisonFilters(filters, comparisonPeriod);
            const comparisonWhereClause = this.buildWhereClause(dataSource, comparisonFilters, tenantId);
            const comparisonQuery = metricQuery.replace(whereClause, comparisonWhereClause);

            const comparisonResult = await query(comparisonQuery);
            comparisonValue = parseFloat(comparisonResult.rows[0]?.value || 0);

            if (comparisonValue > 0) {
                change = currentValue - comparisonValue;
                changePercent = Math.round((change / comparisonValue) * 100);
            }
        }

        return {
            type: 'metric',
            value: currentValue,
            comparisonValue,
            change,
            changePercent,
            metric,
            aggregate
        };
    }

    /**
     * Fetch chart data (line, bar, pie, etc.)
     */
    static async fetchChartData(config, dataSource, filters, tenantId) {
        const { chartType, metric, groupBy, aggregate = 'count', limit = 10 } = config;

        const whereClause = this.buildWhereClause(dataSource, filters, tenantId);
        let chartQuery = '';

        if (groupBy === 'date' || groupBy === 'time') {
            // Time series data
            const dateFormat = groupBy === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH24:00:00';
            chartQuery = `
                SELECT
                    TO_CHAR(created_at, '${dateFormat}') as label,
                    COUNT(*) as value
                FROM submissions
                WHERE ${whereClause}
                GROUP BY TO_CHAR(created_at, '${dateFormat}')
                ORDER BY label
                LIMIT ${limit}
            `;
        } else if (groupBy === 'form') {
            // Group by form
            chartQuery = `
                SELECT
                    f.title as label,
                    COUNT(s.id) as value
                FROM submissions s
                JOIN forms f ON s.form_id = f.id
                WHERE ${whereClause}
                GROUP BY f.id, f.title
                ORDER BY value DESC
                LIMIT ${limit}
            `;
        } else if (groupBy === 'sentiment') {
            // Group by sentiment
            chartQuery = `
                SELECT
                    CASE
                        WHEN sentiment_score >= 0.5 THEN 'Positive'
                        WHEN sentiment_score <= -0.5 THEN 'Negative'
                        ELSE 'Neutral'
                    END as label,
                    COUNT(*) as value
                FROM response_sentiment rs
                JOIN responses r ON rs.response_id = r.id
                JOIN submissions s ON r.submission_id = s.id
                WHERE ${whereClause}
                GROUP BY label
                ORDER BY value DESC
            `;
        } else {
            // Group by custom field
            chartQuery = `
                SELECT
                    ${groupBy} as label,
                    ${aggregate}(*) as value
                FROM submissions
                WHERE ${whereClause}
                GROUP BY ${groupBy}
                ORDER BY value DESC
                LIMIT ${limit}
            `;
        }

        const result = await query(chartQuery);

        return {
            type: 'chart',
            chartType,
            data: result.rows.map(row => ({
                label: row.label || 'Unknown',
                value: parseFloat(row.value || 0)
            })),
            metric,
            groupBy
        };
    }

    /**
     * Fetch table data (paginated list of records)
     */
    static async fetchTableData(config, dataSource, filters, tenantId) {
        const { columns = [], sortBy = 'created_at', sortOrder = 'DESC', page = 1, pageSize = 10 } = config;

        const whereClause = this.buildWhereClause(dataSource, filters, tenantId);
        const offset = (page - 1) * pageSize;

        // Build column selection
        const columnSelection = columns.length > 0
            ? columns.map(col => `s.${col}`).join(', ')
            : 's.*';

        const tableQuery = `
            SELECT ${columnSelection}
            FROM submissions s
            WHERE ${whereClause}
            ORDER BY s.${sortBy} ${sortOrder}
            LIMIT ${pageSize} OFFSET ${offset}
        `;

        const countQuery = `
            SELECT COUNT(*) as total
            FROM submissions s
            WHERE ${whereClause}
        `;

        const [dataResult, countResult] = await Promise.all([
            query(tableQuery),
            query(countQuery)
        ]);

        return {
            type: 'table',
            rows: dataResult.rows,
            total: parseInt(countResult.rows[0].total),
            page,
            pageSize,
            totalPages: Math.ceil(countResult.rows[0].total / pageSize)
        };
    }

    /**
     * Fetch funnel data (conversion rates across steps)
     */
    static async fetchFunnelData(config, dataSource, filters, tenantId) {
        const { steps = [] } = config;

        const whereClause = this.buildWhereClause(dataSource, filters, tenantId);
        const funnelData = [];

        for (const step of steps) {
            const stepQuery = `
                SELECT COUNT(*) as count
                FROM submissions s
                WHERE ${whereClause} AND ${step.condition}
            `;

            const result = await query(stepQuery);
            funnelData.push({
                label: step.label,
                value: parseInt(result.rows[0].count),
                color: step.color || '#3B82F6'
            });
        }

        // Calculate conversion rates
        const dataWithRates = funnelData.map((step, index) => {
            const conversionRate = index > 0
                ? Math.round((step.value / funnelData[0].value) * 100)
                : 100;

            const dropOffRate = index > 0
                ? Math.round(((funnelData[index - 1].value - step.value) / funnelData[index - 1].value) * 100)
                : 0;

            return {
                ...step,
                conversionRate,
                dropOffRate
            };
        });

        return {
            type: 'funnel',
            data: dataWithRates
        };
    }

    /**
     * Fetch heatmap data (matrix of values)
     */
    static async fetchHeatmapData(config, dataSource, filters, tenantId) {
        const { xAxis, yAxis, metric = 'count' } = config;

        const whereClause = this.buildWhereClause(dataSource, filters, tenantId);

        const heatmapQuery = `
            SELECT
                ${xAxis} as x,
                ${yAxis} as y,
                COUNT(*) as value
            FROM submissions
            WHERE ${whereClause}
            GROUP BY ${xAxis}, ${yAxis}
            ORDER BY x, y
        `;

        const result = await query(heatmapQuery);

        return {
            type: 'heatmap',
            data: result.rows.map(row => ({
                x: row.x,
                y: row.y,
                value: parseFloat(row.value)
            })),
            xAxis,
            yAxis
        };
    }

    /**
     * Fetch gauge data (progress toward goal)
     */
    static async fetchGaugeData(config, dataSource, filters, tenantId) {
        const { metric, goal, min = 0, max = 100 } = config;

        const metricData = await this.fetchMetricData({ metric }, dataSource, filters, tenantId);
        const currentValue = metricData.value;

        return {
            type: 'gauge',
            value: currentValue,
            goal,
            min,
            max,
            percentage: Math.round((currentValue / goal) * 100)
        };
    }

    /**
     * Fetch progress bar data
     */
    static async fetchProgressData(config, dataSource, filters, tenantId) {
        const { metric, goal } = config;

        const metricData = await this.fetchMetricData({ metric }, dataSource, filters, tenantId);
        const currentValue = metricData.value;

        return {
            type: 'progress',
            value: currentValue,
            goal,
            percentage: Math.round((currentValue / goal) * 100)
        };
    }

    /**
     * Helper: Build WHERE clause from filters
     */
    static buildWhereClause(dataSource, filters, tenantId) {
        const conditions = [`s.tenant_id = ${tenantId}`];

        // Form filters
        if (filters.formIds && filters.formIds.length > 0) {
            conditions.push(`s.form_id IN (${filters.formIds.join(',')})`);
        }

        // Date range filter
        if (filters.dateRange) {
            const dateCondition = this.buildDateCondition(filters.dateRange);
            if (dateCondition) {
                conditions.push(dateCondition);
            }
        }

        // Custom filters
        if (filters.customFilters && filters.customFilters.length > 0) {
            filters.customFilters.forEach(filter => {
                conditions.push(filter.condition);
            });
        }

        // Data source specific filters
        if (dataSource.filters && dataSource.filters.length > 0) {
            dataSource.filters.forEach(filter => {
                conditions.push(filter.condition);
            });
        }

        return conditions.join(' AND ');
    }

    /**
     * Helper: Build date condition from date range
     */
    static buildDateCondition(dateRange) {
        const now = new Date();

        switch (dateRange) {
            case 'today':
                return `s.created_at >= CURRENT_DATE`;

            case 'yesterday':
                return `s.created_at >= CURRENT_DATE - INTERVAL '1 day' AND s.created_at < CURRENT_DATE`;

            case 'last_7_days':
                return `s.created_at >= CURRENT_DATE - INTERVAL '7 days'`;

            case 'last_30_days':
                return `s.created_at >= CURRENT_DATE - INTERVAL '30 days'`;

            case 'last_90_days':
                return `s.created_at >= CURRENT_DATE - INTERVAL '90 days'`;

            case 'this_month':
                return `s.created_at >= DATE_TRUNC('month', CURRENT_DATE)`;

            case 'last_month':
                return `s.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND s.created_at < DATE_TRUNC('month', CURRENT_DATE)`;

            case 'this_year':
                return `s.created_at >= DATE_TRUNC('year', CURRENT_DATE)`;

            case 'custom':
                // Custom date range handled separately
                return null;

            default:
                return null;
        }
    }

    /**
     * Helper: Merge report-level and widget-level filters
     */
    static mergeFilters(reportFilters, localFilters) {
        return {
            ...reportFilters,
            ...localFilters,
            customFilters: [
                ...(reportFilters.customFilters || []),
                ...(localFilters.customFilters || [])
            ]
        };
    }

    /**
     * Helper: Get comparison period filters
     */
    static getComparisonFilters(filters, comparisonPeriod) {
        const comparisonFilters = { ...filters };

        switch (comparisonPeriod) {
            case 'previous_period':
                if (filters.dateRange === 'last_30_days') {
                    comparisonFilters.dateRange = 'previous_30_days';
                } else if (filters.dateRange === 'last_7_days') {
                    comparisonFilters.dateRange = 'previous_7_days';
                }
                break;

            case 'previous_month':
                comparisonFilters.dateRange = 'previous_month';
                break;

            case 'previous_year':
                comparisonFilters.dateRange = 'previous_year';
                break;
        }

        return comparisonFilters;
    }
}

module.exports = WidgetDataService;
