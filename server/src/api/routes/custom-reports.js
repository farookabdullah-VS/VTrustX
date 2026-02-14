/**
 * Custom Reports API Routes
 *
 * Endpoints for visual custom report builder
 * Features:
 * - CRUD operations for reports
 * - Widget management
 * - Data fetching for widgets
 * - Report sharing and access control
 * - Snapshots and templates
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const CustomReportService = require('../../services/CustomReportService');
const WidgetDataService = require('../../services/WidgetDataService');
const logger = require('../../infrastructure/logger');

/**
 * @route   POST /api/custom-reports
 * @desc    Create a new custom report
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;

        const report = await CustomReportService.createReport(tenantId, userId, req.body);

        res.status(201).json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('[CustomReports] POST / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports
 * @desc    List all reports for tenant
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const {
            category,
            tags,
            isTemplate,
            createdBy,
            search,
            limit = 50,
            offset = 0
        } = req.query;

        const options = {
            category,
            tags: tags ? tags.split(',') : [],
            isTemplate: isTemplate === 'true' ? true : isTemplate === 'false' ? false : null,
            createdBy: createdBy ? parseInt(createdBy) : null,
            search,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        const reports = await CustomReportService.listReports(tenantId, options);

        res.json({
            success: true,
            data: reports,
            pagination: {
                limit: options.limit,
                offset: options.offset,
                total: reports.length
            }
        });
    } catch (error) {
        logger.error('[CustomReports] GET / failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports/:id
 * @desc    Get a specific report with widgets
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const reportId = parseInt(req.params.id);

        const report = await CustomReportService.getReport(reportId, tenantId, userId);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('[CustomReports] GET /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/custom-reports/:id
 * @desc    Update a report
 * @access  Private
 */
router.put('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const reportId = parseInt(req.params.id);

        const report = await CustomReportService.updateReport(reportId, tenantId, userId, req.body);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        logger.error('[CustomReports] PUT /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/custom-reports/:id
 * @desc    Delete a report
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);

        const result = await CustomReportService.deleteReport(reportId, tenantId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CustomReports] DELETE /:id failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/custom-reports/:id/widgets
 * @desc    Add a widget to a report
 * @access  Private
 */
router.post('/:id/widgets', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);

        const widget = await CustomReportService.addWidget(reportId, tenantId, req.body);

        res.status(201).json({
            success: true,
            data: widget
        });
    } catch (error) {
        logger.error('[CustomReports] POST /:id/widgets failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/custom-reports/:id/widgets/:widgetId
 * @desc    Update a widget
 * @access  Private
 */
router.put('/:id/widgets/:widgetId', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);
        const widgetId = parseInt(req.params.widgetId);

        const widget = await CustomReportService.updateWidget(widgetId, reportId, tenantId, req.body);

        res.json({
            success: true,
            data: widget
        });
    } catch (error) {
        logger.error('[CustomReports] PUT /:id/widgets/:widgetId failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   DELETE /api/custom-reports/:id/widgets/:widgetId
 * @desc    Delete a widget
 * @access  Private
 */
router.delete('/:id/widgets/:widgetId', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);
        const widgetId = parseInt(req.params.widgetId);

        const result = await CustomReportService.deleteWidget(widgetId, reportId, tenantId);

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('[CustomReports] DELETE /:id/widgets/:widgetId failed', { error: error.message });
        res.status(error.message.includes('not found') ? 404 : 500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports/:id/widgets/:widgetId/data
 * @desc    Fetch data for a specific widget
 * @access  Private
 */
router.get('/:id/widgets/:widgetId/data', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);
        const widgetId = parseInt(req.params.widgetId);

        // Get report and widget
        const report = await CustomReportService.getReport(reportId, tenantId);
        const widget = report.widgets.find(w => w.id === widgetId);

        if (!widget) {
            return res.status(404).json({
                success: false,
                error: `Widget ${widgetId} not found in report ${reportId}`
            });
        }

        // Fetch widget data
        const data = await WidgetDataService.fetchWidgetData(widget, report.filters, tenantId);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        logger.error('[CustomReports] GET /:id/widgets/:widgetId/data failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports/:id/data
 * @desc    Fetch data for all widgets in a report
 * @access  Private
 */
router.get('/:id/data', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);

        // Get report with widgets
        const report = await CustomReportService.getReport(reportId, tenantId);

        // Fetch data for all widgets in parallel
        const widgetDataPromises = report.widgets.map(widget =>
            WidgetDataService.fetchWidgetData(widget, report.filters, tenantId)
                .then(data => ({ widgetId: widget.id, data }))
                .catch(error => ({ widgetId: widget.id, error: error.message }))
        );

        const widgetData = await Promise.all(widgetDataPromises);

        // Format response
        const dataByWidgetId = {};
        widgetData.forEach(item => {
            dataByWidgetId[item.widgetId] = item.data || { error: item.error };
        });

        res.json({
            success: true,
            data: {
                reportId,
                widgets: dataByWidgetId
            }
        });
    } catch (error) {
        logger.error('[CustomReports] GET /:id/data failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/custom-reports/:id/share/public
 * @desc    Generate public share token for a report
 * @access  Private
 */
router.post('/:id/share/public', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const reportId = parseInt(req.params.id);

        const shareInfo = await CustomReportService.generateShareToken(reportId, tenantId, userId);

        res.json({
            success: true,
            data: shareInfo
        });
    } catch (error) {
        logger.error('[CustomReports] POST /:id/share/public failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/custom-reports/:id/share/user
 * @desc    Share report with specific user
 * @access  Private
 */
router.post('/:id/share/user', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const reportId = parseInt(req.params.id);

        const shareInfo = await CustomReportService.shareWithUser(reportId, tenantId, userId, req.body);

        res.json({
            success: true,
            data: shareInfo
        });
    } catch (error) {
        logger.error('[CustomReports] POST /:id/share/user failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   POST /api/custom-reports/:id/snapshots
 * @desc    Create a snapshot of report data
 * @access  Private
 */
router.post('/:id/snapshots', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.userId;
        const reportId = parseInt(req.params.id);

        const snapshot = await CustomReportService.createSnapshot(reportId, tenantId, userId, req.body);

        res.status(201).json({
            success: true,
            data: snapshot
        });
    } catch (error) {
        logger.error('[CustomReports] POST /:id/snapshots failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports/:id/snapshots
 * @desc    Get all snapshots for a report
 * @access  Private
 */
router.get('/:id/snapshots', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const reportId = parseInt(req.params.id);

        const snapshots = await CustomReportService.getSnapshots(reportId, tenantId);

        res.json({
            success: true,
            data: snapshots
        });
    } catch (error) {
        logger.error('[CustomReports] GET /:id/snapshots failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * @route   GET /api/custom-reports/templates/library
 * @desc    Get report templates library
 * @access  Private
 */
router.get('/templates/library', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { category } = req.query;

        const options = {
            isTemplate: true,
            category: category || null,
            limit: 100,
            offset: 0
        };

        const templates = await CustomReportService.listReports(tenantId, options);

        // Group by template category
        const grouped = {};
        templates.forEach(template => {
            const cat = template.templateCategory || 'general';
            if (!grouped[cat]) {
                grouped[cat] = [];
            }
            grouped[cat].push(template);
        });

        res.json({
            success: true,
            data: {
                categories: Object.keys(grouped),
                templates: grouped
            }
        });
    } catch (error) {
        logger.error('[CustomReports] GET /templates/library failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
