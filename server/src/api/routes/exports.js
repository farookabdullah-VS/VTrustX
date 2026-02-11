/**
 * Export Routes - API endpoints for data export functionality
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const logger = require('../../infrastructure/logger');
const ExportService = require('../../services/export/ExportService');
const path = require('path');

const exportService = new ExportService();

/**
 * @swagger
 * /api/exports/raw:
 *   post:
 *     summary: Export raw survey data as Excel or CSV
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - format
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form to export
 *               format:
 *                 type: string
 *                 enum: [xlsx, csv]
 *               options:
 *                 type: object
 *               filters:
 *                 type: object
 *     responses:
 *       202:
 *         description: Export job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *       400:
 *         description: Missing required fields or invalid format
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/raw', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const { formId, format, options, filters } = req.body;

        if (!formId || !format) {
            return res.status(400).json({ error: 'Missing required fields: formId, format' });
        }

        if (!['xlsx', 'csv'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Must be xlsx or csv' });
        }

        // Create export job
        const jobId = await exportService.createExportJob(
            req.user.tenant_id,
            req.user.id,
            formId,
            'raw',
            format,
            options || {},
            filters || {}
        );

        // Process export asynchronously
        exportService.processExport(jobId).catch(err => {
            logger.error('Export processing error', { error: err.message });
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        logger.error('Raw export error', { error: error.message });
        res.status(500).json({ error: 'Failed to create raw data export' });
    }
});

/**
 * @swagger
 * /api/exports/analytics:
 *   post:
 *     summary: Export analytics and charts as PPTX, DOCX, XLSX, or PDF
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *               - format
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form to export
 *               format:
 *                 type: string
 *                 enum: [pptx, ppt, docx, xlsx, pdf]
 *               template:
 *                 type: string
 *                 description: Presentation template name
 *                 default: QuestionPro/Blue
 *               includeOpenEnded:
 *                 type: boolean
 *                 default: true
 *               filters:
 *                 type: object
 *     responses:
 *       202:
 *         description: Export job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *       400:
 *         description: Missing required fields or invalid format
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/analytics', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const { formId, format, template, includeOpenEnded, filters } = req.body;

        if (!formId || !format) {
            return res.status(400).json({ error: 'Missing required fields: formId, format' });
        }

        if (!['pptx', 'ppt', 'docx', 'xlsx', 'pdf'].includes(format)) {
            return res.status(400).json({ error: 'Invalid format. Must be pptx, ppt, docx, xlsx, or pdf' });
        }

        const options = {
            template: template || 'QuestionPro/Blue',
            includeOpenEnded: includeOpenEnded !== false
        };

        // Create export job
        const jobId = await exportService.createExportJob(
            req.user.tenant_id,
            req.user.id,
            formId,
            'analytics',
            format,
            options,
            filters || {}
        );

        // Process export asynchronously
        exportService.processExport(jobId).catch(err => {
            logger.error('Export processing error', { error: err.message });
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        logger.error('Analytics export error', { error: error.message });
        res.status(500).json({ error: 'Failed to create analytics export' });
    }
});

/**
 * @swagger
 * /api/exports/spss:
 *   post:
 *     summary: Export form data in SPSS format
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form to export
 *               options:
 *                 type: object
 *               filters:
 *                 type: object
 *     responses:
 *       202:
 *         description: Export job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *       400:
 *         description: Missing required field formId
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/spss', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const { formId, options, filters } = req.body;

        if (!formId) {
            return res.status(400).json({ error: 'Missing required field: formId' });
        }

        // Create export job
        const jobId = await exportService.createExportJob(
            req.user.tenant_id,
            req.user.id,
            formId,
            'spss',
            'sav',
            options || {},
            filters || {}
        );

        // Process export asynchronously
        exportService.processExport(jobId).catch(err => {
            logger.error('Export processing error', { error: err.message });
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        logger.error('SPSS export error', { error: error.message });
        res.status(500).json({ error: 'Failed to create SPSS export' });
    }
});

/**
 * @swagger
 * /api/exports/sql:
 *   post:
 *     summary: Export form data as SQL statements
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - formId
 *             properties:
 *               formId:
 *                 type: integer
 *                 description: ID of the form to export
 *               includeScores:
 *                 type: boolean
 *                 default: true
 *               includeTimestamps:
 *                 type: boolean
 *                 default: true
 *               filters:
 *                 type: object
 *     responses:
 *       202:
 *         description: Export job created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *                 statusUrl:
 *                   type: string
 *       400:
 *         description: Missing required field formId
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/sql', authenticate, authenticate.checkPermission('forms', 'view'), async (req, res) => {
    try {
        const { formId, includeScores, includeTimestamps, filters } = req.body;

        if (!formId) {
            return res.status(400).json({ error: 'Missing required field: formId' });
        }

        const options = {
            includeScores: includeScores !== false,
            includeTimestamps: includeTimestamps !== false
        };

        // Create export job
        const jobId = await exportService.createExportJob(
            req.user.tenant_id,
            req.user.id,
            formId,
            'sql',
            'sql',
            options,
            filters || {}
        );

        // Process export asynchronously
        exportService.processExport(jobId).catch(err => {
            logger.error('Export processing error', { error: err.message });
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        logger.error('SQL export error', { error: error.message });
        res.status(500).json({ error: 'Failed to create SQL export' });
    }
});

/**
 * @swagger
 * /api/exports/jobs/{id}:
 *   get:
 *     summary: Get the status of an export job
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Export job ID
 *     responses:
 *       200:
 *         description: Export job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, processing, completed, failed]
 *                 export_type:
 *                   type: string
 *                 format:
 *                   type: string
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 completed_at:
 *                   type: string
 *                   format: date-time
 *                   nullable: true
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Export job not found
 */
router.get('/jobs/:id', authenticate, async (req, res) => {
    try {
        const job = await exportService.getJobStatus(
            req.params.id,
            req.user.id,
            req.user.tenant_id
        );

        res.json(job);

    } catch (error) {
        logger.error('Get job status error', { error: error.message });
        res.status(404).json({ error: 'Export job not found' });
    }
});

/**
 * @swagger
 * /api/exports/download/{jobId}:
 *   get:
 *     summary: Download a completed export file
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Export job ID
 *     responses:
 *       200:
 *         description: File download stream
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Export file not found
 */
router.get('/download/:jobId', authenticate, async (req, res) => {
    try {
        const filePath = await exportService.getFilePath(
            req.params.jobId,
            req.user.id,
            req.user.tenant_id
        );

        // Get file name from path
        const fileName = path.basename(filePath);

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Determine content type based on file extension
        const ext = path.extname(fileName).toLowerCase();
        const contentTypes = {
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.csv': 'text/csv',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.zip': 'application/zip',
            '.sql': 'application/sql',
            '.pdf': 'application/pdf'
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');

        // Stream file to response
        const fs = require('fs');
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

    } catch (error) {
        logger.error('Download error', { error: error.message });
        res.status(404).json({ error: 'Export file not found' });
    }
});

/**
 * @swagger
 * /api/exports/history:
 *   get:
 *     summary: Get export history for the current user
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of recent export jobs (last 50)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   export_type:
 *                     type: string
 *                   format:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [pending, processing, completed, failed]
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   completed_at:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   form_title:
 *                     type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const { query } = require('../../infrastructure/database/db');

        const result = await query(`
            SELECT 
                ej.id,
                ej.export_type,
                ej.format,
                ej.status,
                ej.created_at,
                ej.completed_at,
                f.title as form_title
            FROM export_jobs ej
            LEFT JOIN forms f ON ej.form_id = f.id
            WHERE ej.user_id = $1 AND ej.tenant_id = $2
            ORDER BY ej.created_at DESC
            LIMIT 50
        `, [req.user.id, req.user.tenant_id]);

        res.json(result.rows);

    } catch (error) {
        logger.error('Get export history error', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve export history' });
    }
});

/**
 * @swagger
 * /api/exports/jobs/{id}:
 *   delete:
 *     summary: Delete an export job and its associated file
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Export job ID
 *     responses:
 *       200:
 *         description: Export job deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Server error
 */
router.delete('/jobs/:id', authenticate, async (req, res) => {
    try {
        const { query } = require('../../infrastructure/database/db');
        const fs = require('fs').promises;

        // Get job details
        const job = await exportService.getJobStatus(
            req.params.id,
            req.user.id,
            req.user.tenant_id
        );

        // Delete file if exists
        if (job.status === 'completed') {
            try {
                const filePath = await exportService.getFilePath(
                    req.params.id,
                    req.user.id,
                    req.user.tenant_id
                );
                await fs.unlink(filePath);
            } catch (err) {
                logger.error('Error deleting export file', { error: err.message });
            }
        }

        // Delete database record
        await query(`
            DELETE FROM export_jobs
            WHERE id = $1 AND user_id = $2 AND tenant_id = $3
        `, [req.params.id, req.user.id, req.user.tenant_id]);

        res.json({ message: 'Export job deleted' });

    } catch (error) {
        logger.error('Delete export job error', { error: error.message });
        res.status(500).json({ error: 'Failed to delete export job' });
    }
});

/**
 * @swagger
 * /api/exports/cleanup:
 *   post:
 *     summary: Manually trigger cleanup of old export files (admin only)
 *     tags: [Exports]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               olderThanHours:
 *                 type: integer
 *                 default: 24
 *                 description: Delete exports older than this many hours
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin permission required
 *       500:
 *         description: Server error
 */
router.post('/cleanup', authenticate, authenticate.checkPermission('admin', 'manage'), async (req, res) => {
    try {
        const olderThanHours = req.body.olderThanHours || 24;

        await exportService.cleanupOldExports(olderThanHours);

        res.json({ message: 'Cleanup completed' });

    } catch (error) {
        logger.error('Cleanup error', { error: error.message });
        res.status(500).json({ error: 'Failed to run export cleanup' });
    }
});

module.exports = router;
