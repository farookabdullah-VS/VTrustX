/**
 * Export Routes - API endpoints for data export functionality
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const ExportService = require('../../services/export/ExportService');
const path = require('path');

const exportService = new ExportService();

/**
 * POST /api/exports/raw
 * Generate raw data export (Excel/CSV)
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
            console.error('Export processing error:', err);
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Raw export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/exports/analytics
 * Generate charts and analytics export
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
            console.error('Export processing error:', err);
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        console.error('Analytics export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/exports/spss
 * Generate SPSS export
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
            console.error('Export processing error:', err);
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        console.error('SPSS export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/exports/sql
 * Generate SQL export
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
            console.error('Export processing error:', err);
        });

        res.status(202).json({
            message: 'Export job created',
            jobId: jobId,
            statusUrl: `/api/exports/jobs/${jobId}`
        });

    } catch (error) {
        console.error('SQL export error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/exports/jobs/:id
 * Get export job status
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
        console.error('Get job status error:', error);
        res.status(404).json({ error: error.message });
    }
});

/**
 * GET /api/exports/download/:jobId
 * Download completed export file
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
        console.error('Download error:', error);
        res.status(404).json({ error: error.message });
    }
});

/**
 * GET /api/exports/history
 * Get export history for current user
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
        console.error('Get export history error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * DELETE /api/exports/jobs/:id
 * Delete export job and file
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
                console.error('Error deleting export file:', err);
            }
        }

        // Delete database record
        await query(`
            DELETE FROM export_jobs
            WHERE id = $1 AND user_id = $2 AND tenant_id = $3
        `, [req.params.id, req.user.id, req.user.tenant_id]);

        res.json({ message: 'Export job deleted' });

    } catch (error) {
        console.error('Delete export job error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/exports/cleanup
 * Manually trigger cleanup of old exports (admin only)
 */
router.post('/cleanup', authenticate, authenticate.checkPermission('admin', 'manage'), async (req, res) => {
    try {
        const olderThanHours = req.body.olderThanHours || 24;

        await exportService.cleanupOldExports(olderThanHours);

        res.json({ message: 'Cleanup completed' });

    } catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
