/**
 * File Storage Wrapper
 *
 * This module provides backward-compatible interface for file storage operations.
 * It delegates to StorageService which handles both GCS and local storage.
 *
 * Migration: All file operations now use StorageService (GCS-ready)
 */

const storageService = require('../infrastructure/storage/StorageService');
const path = require('path');

// Backward compatibility: UPLOAD_DIR
const UPLOAD_DIR = storageService.getUploadDir() || path.join(__dirname, '../../uploads');

/**
 * Process and save file to storage (GCS or local)
 * @param {Object} file - Multer file object
 * @returns {Object} File metadata
 */
async function processAndSave(file) {
    return await storageService.processAndSave(file);
}

/**
 * Retrieve and decrypt file from storage
 * @param {string} filename - File name (without .enc extension)
 * @returns {Buffer} Decrypted file buffer
 */
async function retrieveAndDecrypt(filename) {
    return await storageService.retrieveAndDecrypt(filename);
}

/**
 * Delete file from storage
 * @param {string} filename - File name (without .enc extension)
 */
async function deleteFile(filename) {
    return await storageService.deleteFile(filename);
}

/**
 * Get signed URL for file access (GCS) or API path (local)
 * @param {string} filename - File name
 * @param {number} expiresIn - Expiration in seconds
 * @returns {string} URL
 */
async function getSignedUrl(filename, expiresIn = 3600) {
    return await storageService.getSignedUrl(filename, expiresIn);
}

module.exports = {
    processAndSave,
    retrieveAndDecrypt,
    deleteFile,
    getSignedUrl,
    UPLOAD_DIR,
    storageService, // Export for direct access if needed
};
