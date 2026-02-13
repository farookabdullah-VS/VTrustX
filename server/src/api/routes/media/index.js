const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { query } = require('../../../infrastructure/database/db');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');
const { StorageService } = require('../../../infrastructure/storage/StorageService');

// Initialize storage service
const storageService = new StorageService();

// Configure multer for file uploads (memory storage for processing)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
    fileFilter: (req, file, cb) => {
        // Allowed MIME types
        const allowedTypes = [
            // Images
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
            // Videos
            'video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm',
            // Documents
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain', 'text/csv',
            // Audio
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`));
        }
    }
});

/**
 * Determine media type from MIME type
 */
function getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('video/')) return 'video';
    if (mimetype.startsWith('audio/')) return 'audio';
    return 'document';
}

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload media file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file
 *       500:
 *         description: Upload failed
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const tenantId = req.user.tenant_id;
        const userId = req.user.id;
        const file = req.file;

        // Generate unique filename
        const ext = path.extname(file.originalname);
        const filename = `media/${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;

        // Determine media type
        const mediaType = getMediaType(file.mimetype);

        // Upload to storage service (GCS or local)
        const uploadResult = await storageService.upload(
            file.buffer,
            filename,
            {
                contentType: file.mimetype,
                metadata: {
                    originalName: file.originalname,
                    tenantId: tenantId.toString(),
                    uploadedBy: userId.toString(),
                    mediaType
                }
            }
        );

        // Save metadata to database
        const result = await query(
            `INSERT INTO media_assets
            (tenant_id, filename, original_name, media_type, mimetype, size_bytes, storage_path, cdn_url, uploaded_by, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                tenantId,
                filename,
                file.originalname,
                mediaType,
                file.mimetype,
                file.size,
                uploadResult.path,
                uploadResult.url || null,
                userId,
                JSON.stringify({
                    width: file.width || null,
                    height: file.height || null,
                    duration: file.duration || null
                })
            ]
        );

        const asset = result.rows[0];

        logger.info('[MediaAPI] File uploaded successfully', {
            assetId: asset.id,
            filename: asset.filename,
            size: asset.size_bytes,
            tenantId
        });

        res.status(201).json({
            success: true,
            asset: {
                id: asset.id,
                filename: asset.filename,
                originalName: asset.original_name,
                mediaType: asset.media_type,
                mimetype: asset.mimetype,
                size: asset.size_bytes,
                url: asset.cdn_url || asset.storage_path,
                createdAt: asset.created_at
            }
        });
    } catch (error) {
        logger.error('[MediaAPI] Upload failed', { error: error.message });
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: List media assets
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of media assets
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        const { type, limit = 50, offset = 0 } = req.query;

        let queryStr = 'SELECT * FROM media_assets WHERE tenant_id = $1';
        const params = [tenantId];

        if (type) {
            params.push(type);
            queryStr += ` AND media_type = $${params.length}`;
        }

        queryStr += ' ORDER BY created_at DESC';

        if (limit) {
            params.push(parseInt(limit));
            queryStr += ` LIMIT $${params.length}`;
        }

        if (offset) {
            params.push(parseInt(offset));
            queryStr += ` OFFSET $${params.length}`;
        }

        const result = await query(queryStr, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM media_assets WHERE tenant_id = $1';
        const countParams = [tenantId];
        if (type) {
            countParams.push(type);
            countQuery += ` AND media_type = $${countParams.length}`;
        }
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            assets: result.rows.map(asset => ({
                id: asset.id,
                filename: asset.filename,
                originalName: asset.original_name,
                mediaType: asset.media_type,
                mimetype: asset.mimetype,
                size: asset.size_bytes,
                url: asset.cdn_url || asset.storage_path,
                thumbnailUrl: asset.thumbnail_path,
                metadata: asset.metadata,
                createdAt: asset.created_at
            })),
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + parseInt(limit)) < total
            }
        });
    } catch (error) {
        logger.error('[MediaAPI] Failed to list assets', { error: error.message });
        res.status(500).json({ error: 'Failed to list media assets' });
    }
});

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get specific media asset
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Media asset details
 *       404:
 *         description: Asset not found
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'SELECT * FROM media_assets WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        const asset = result.rows[0];

        res.json({
            id: asset.id,
            filename: asset.filename,
            originalName: asset.original_name,
            mediaType: asset.media_type,
            mimetype: asset.mimetype,
            size: asset.size_bytes,
            url: asset.cdn_url || asset.storage_path,
            thumbnailUrl: asset.thumbnail_path,
            metadata: asset.metadata,
            uploadedBy: asset.uploaded_by,
            createdAt: asset.created_at,
            updatedAt: asset.updated_at
        });
    } catch (error) {
        logger.error('[MediaAPI] Failed to get asset', { error: error.message });
        res.status(500).json({ error: 'Failed to get media asset' });
    }
});

/**
 * @swagger
 * /api/media/{id}/download:
 *   get:
 *     summary: Get signed download URL
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Signed download URL
 *       404:
 *         description: Asset not found
 */
router.get('/:id/download', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        const result = await query(
            'SELECT * FROM media_assets WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        const asset = result.rows[0];

        // Generate signed URL (7 days expiry)
        const signedUrl = await storageService.getSignedUrl(asset.storage_path, 7 * 24 * 60 * 60);

        res.json({
            url: signedUrl,
            filename: asset.original_name,
            expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
        });
    } catch (error) {
        logger.error('[MediaAPI] Failed to generate download URL', { error: error.message });
        res.status(500).json({ error: 'Failed to generate download URL' });
    }
});

/**
 * @swagger
 * /api/media/{id}:
 *   delete:
 *     summary: Delete media asset
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *       404:
 *         description: Asset not found
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenant_id;

        // Get asset details
        const assetResult = await query(
            'SELECT * FROM media_assets WHERE id = $1 AND tenant_id = $2',
            [id, tenantId]
        );

        if (assetResult.rows.length === 0) {
            return res.status(404).json({ error: 'Media asset not found' });
        }

        const asset = assetResult.rows[0];

        // Delete from storage
        try {
            await storageService.delete(asset.storage_path);
            if (asset.thumbnail_path) {
                await storageService.delete(asset.thumbnail_path);
            }
        } catch (storageError) {
            logger.warn('[MediaAPI] Failed to delete from storage', {
                error: storageError.message,
                path: asset.storage_path
            });
            // Continue with database deletion even if storage deletion fails
        }

        // Delete from database
        await query('DELETE FROM media_assets WHERE id = $1', [id]);

        logger.info('[MediaAPI] Media asset deleted', {
            assetId: id,
            filename: asset.filename,
            tenantId
        });

        res.json({ success: true, message: 'Media asset deleted successfully' });
    } catch (error) {
        logger.error('[MediaAPI] Failed to delete asset', { error: error.message });
        res.status(500).json({ error: 'Failed to delete media asset' });
    }
});

module.exports = router;
