/**
 * ExportService - Main orchestrator for data exports
 * Handles export job creation, processing, and file generation
 */

const { v4: uuidv4 } = require('uuid');
const { query } = require('../../infrastructure/database/db');
const RawDataExporter = require('./RawDataExporter');
const AnalyticsExporter = require('./AnalyticsExporter');
const SPSSExporter = require('./SPSSExporter');
const SQLExporter = require('./SQLExporter');
const DataTransformer = require('./DataTransformer');

class ExportService {
    constructor() {
        this.rawDataExporter = new RawDataExporter();
        this.analyticsExporter = new AnalyticsExporter();
        this.spssExporter = new SPSSExporter();
        this.sqlExporter = new SQLExporter();
        this.dataTransformer = new DataTransformer();
    }

    /**
     * Create a new export job
     */
    async createExportJob(tenantId, userId, formId, exportType, format, options, filters) {
        const jobId = uuidv4();

        await query(`
            INSERT INTO export_jobs (id, tenant_id, form_id, user_id, export_type, format, options, filters, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        `, [jobId, tenantId, formId, userId, exportType, format, JSON.stringify(options), JSON.stringify(filters)]);

        return jobId;
    }

    /**
     * Process export job
     */
    async processExport(jobId) {
        try {
            // Update status to processing
            await query(`UPDATE export_jobs SET status = 'processing' WHERE id = $1`, [jobId]);

            // Get job details
            const jobResult = await query(`SELECT * FROM export_jobs WHERE id = $1`, [jobId]);
            const job = jobResult.rows[0];

            if (!job) {
                throw new Error('Export job not found');
            }

            // Fetch form and submissions data
            const formData = await this.fetchFormData(job.form_id);
            const submissions = await this.fetchSubmissions(job.form_id, job.filters);

            // Transform data based on options
            const transformedData = await this.dataTransformer.transform(
                formData,
                submissions,
                job.options
            );

            // Generate export file based on type
            let fileBuffer;
            let fileName;

            switch (job.export_type) {
                case 'raw':
                    const rawResult = await this.rawDataExporter.export(
                        transformedData,
                        job.format,
                        job.options
                    );
                    fileBuffer = rawResult.buffer;
                    fileName = rawResult.fileName;
                    break;

                case 'analytics':
                    const analyticsResult = await this.analyticsExporter.export(
                        transformedData,
                        job.format,
                        job.options
                    );
                    fileBuffer = analyticsResult.buffer;
                    fileName = analyticsResult.fileName;
                    break;

                case 'spss':
                    const spssResult = await this.spssExporter.export(
                        transformedData,
                        job.options
                    );
                    fileBuffer = spssResult.buffer;
                    fileName = spssResult.fileName;
                    break;

                case 'sql':
                    const sqlResult = await this.sqlExporter.export(
                        transformedData,
                        job.options
                    );
                    fileBuffer = sqlResult.buffer;
                    fileName = sqlResult.fileName;
                    break;

                default:
                    throw new Error(`Unsupported export type: ${job.export_type}`);
            }

            // Save file (in production, upload to cloud storage)
            const fileUrl = await this.saveExportFile(jobId, fileName, fileBuffer);

            // Update job status
            await query(`
                UPDATE export_jobs 
                SET status = 'completed', file_url = $1, completed_at = NOW()
                WHERE id = $2
            `, [fileUrl, jobId]);

            return { jobId, fileUrl, fileName };

        } catch (error) {
            console.error('Export processing error:', error);

            // Update job with error
            await query(`
                UPDATE export_jobs 
                SET status = 'failed', error_message = $1, completed_at = NOW()
                WHERE id = $2
            `, [error.message, jobId]);

            throw error;
        }
    }

    /**
     * Fetch form definition
     */
    async fetchFormData(formId) {
        const result = await query(`
            SELECT id, title, definition, created_at
            FROM forms
            WHERE id = $1
        `, [formId]);

        if (result.rows.length === 0) {
            throw new Error('Form not found');
        }

        return result.rows[0];
    }

    /**
     * Fetch submissions with filters
     */
    async fetchSubmissions(formId, filters) {
        let queryText = `
            SELECT s.*, u.email as respondent_email
            FROM submissions s
            LEFT JOIN users u ON s.user_id = u.id
            WHERE s.form_id = $1
        `;
        const params = [formId];
        let paramIndex = 2;

        // Apply date range filter
        if (filters.dateRange) {
            if (filters.dateRange.start) {
                queryText += ` AND s.created_at >= $${paramIndex}`;
                params.push(filters.dateRange.start);
                paramIndex++;
            }
            if (filters.dateRange.end) {
                queryText += ` AND s.created_at <= $${paramIndex}`;
                params.push(filters.dateRange.end);
                paramIndex++;
            }
        }

        // Apply status filter
        if (filters.status) {
            queryText += ` AND s.status = $${paramIndex}`;
            params.push(filters.status);
            paramIndex++;
        }

        // Apply custom filters (field-based filtering)
        if (filters.customFilters && filters.customFilters.length > 0) {
            for (const filter of filters.customFilters) {
                if (filter.field && filter.operator && filter.value !== undefined) {
                    queryText += ` AND s.data->>'${filter.field}' ${this.getOperatorSQL(filter.operator)} $${paramIndex}`;
                    params.push(filter.value);
                    paramIndex++;
                }
            }
        }

        queryText += ` ORDER BY s.created_at DESC`;

        const result = await query(queryText, params);
        return result.rows;
    }

    /**
     * Get SQL operator for custom filters
     */
    getOperatorSQL(operator) {
        const operators = {
            'equals': '=',
            'not_equals': '!=',
            'contains': 'LIKE',
            'not_contains': 'NOT LIKE',
            'greater_than': '>',
            'less_than': '<',
            'greater_or_equal': '>=',
            'less_or_equal': '<='
        };
        return operators[operator] || '=';
    }

    /**
     * Save export file (in production, use cloud storage)
     */
    async saveExportFile(jobId, fileName, buffer) {
        const storageService = require('../../infrastructure/storage/StorageService');
        const storageType = storageService.getStorageType();

        if (storageType === 'gcs') {
            // Upload to GCS directly (unencrypted exports)
            const gcsPath = `exports/${jobId}_${fileName}`;
            const gcsBucket = storageService.gcsBucket;

            if (!gcsBucket) {
                throw new Error('GCS bucket not initialized');
            }

            const file = gcsBucket.file(gcsPath);
            await file.save(buffer, {
                metadata: {
                    contentType: this._getContentType(fileName),
                },
            });

            // Generate signed URL (7 days expiration for exports)
            const [url] = await file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            return url;
        } else {
            // Local storage fallback
            const fs = require('fs').promises;
            const path = require('path');

            const exportsDir = path.join(__dirname, '../../../exports');
            try {
                await fs.mkdir(exportsDir, { recursive: true });
            } catch (err) {
                // Directory might already exist
            }

            const filePath = path.join(exportsDir, `${jobId}_${fileName}`);
            await fs.writeFile(filePath, buffer);

            return `/api/exports/download/${jobId}`;
        }
    }

    _getContentType(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const contentTypes = {
            'csv': 'text/csv',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'json': 'application/json',
            'xml': 'application/xml',
            'pdf': 'application/pdf',
            'sav': 'application/x-spss-sav',
            'sql': 'application/sql',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }

    /**
     * Get export job status
     */
    async getJobStatus(jobId, userId, tenantId) {
        const result = await query(`
            SELECT id, export_type, format, status, file_url, error_message, created_at, completed_at
            FROM export_jobs
            WHERE id = $1 AND user_id = $2 AND tenant_id = $3
        `, [jobId, userId, tenantId]);

        if (result.rows.length === 0) {
            throw new Error('Export job not found');
        }

        return result.rows[0];
    }

    /**
     * Get file path for download
     */
    async getFilePath(jobId, userId, tenantId) {
        const job = await this.getJobStatus(jobId, userId, tenantId);

        if (job.status !== 'completed') {
            throw new Error('Export is not ready for download');
        }

        const path = require('path');
        const fs = require('fs').promises;

        // Find the file
        const exportsDir = path.join(__dirname, '../../../exports');
        const files = await fs.readdir(exportsDir);
        const matchingFile = files.find(f => f.startsWith(jobId));

        if (!matchingFile) {
            throw new Error('Export file not found');
        }

        return path.join(exportsDir, matchingFile);
    }

    /**
     * Clean up old export files (run periodically)
     */
    async cleanupOldExports(olderThanHours = 24) {
        const fs = require('fs').promises;
        const path = require('path');

        const exportsDir = path.join(__dirname, '../../../exports');
        const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

        // Delete old database records
        await query(`
            DELETE FROM export_jobs
            WHERE completed_at < $1
        `, [cutoffTime]);

        // Delete old files
        try {
            const files = await fs.readdir(exportsDir);
            for (const file of files) {
                const filePath = path.join(exportsDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtime < cutoffTime) {
                    await fs.unlink(filePath);
                }
            }
        } catch (err) {
            console.error('Error cleaning up export files:', err);
        }
    }
}

module.exports = ExportService;
