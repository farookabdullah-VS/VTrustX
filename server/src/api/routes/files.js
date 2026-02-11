const express = require('express');
const router = express.Router();
const multer = require('multer');
const { processAndSave, retrieveAndDecrypt } = require('../../core/fileStorage');

// Memory storage to process buffer before saving
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIMES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed'), false);
        }
    }
});

// UPLOAD
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('No file provided');

        const result = await processAndSave(req.file);

        // Return structure expected by SurveyJS or general usage
        res.json({
            fileId: result.filename,
            url: result.path,
            name: result.originalName,
            type: result.mimetype
        });
    } catch (e) {
        console.error("Upload failed:", e);
        res.status(500).json({ error: e.message });
    }
});

// DOWNLOAD / VIEW (Decrypted on flight)
router.get('/:filename', async (req, res) => {
    try {
        // Prevent path traversal
        const filename = req.params.filename;
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Invalid filename' });
        }
        const fileContent = await retrieveAndDecrypt(filename);

        // Attempt to guess mime type or just basic send
        // Since we don't store mime in DB here for this specific file system MVP,
        // we might guess from extension inside filename or just generic stream.
        // But in `processAndSave` result, we had correct mimetype.
        // For strict viewing, client should know, but here we can try to guess.

        res.write(fileContent);
        res.end();
    } catch (e) {
        res.status(404).send('File not found or decryption failed');
    }
});

module.exports = router;
