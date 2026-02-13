const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { Storage } = require('@google-cloud/storage');
const logger = require('../logger');

// Encryption Config
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = (process.env.STORAGE_KEY || 'default_secret_key_32_chars_long').padEnd(32).slice(0, 32);
const IV_LENGTH = 16;

/**
 * Storage service that supports both Google Cloud Storage (production) and local disk (development)
 * Automatically falls back to local storage if GCS is not configured
 */
class StorageService {
  constructor() {
    this.storageType = 'local';
    this.gcsClient = null;
    this.gcsBucket = null;
    this.localUploadDir = null;

    this._initializeStorage();
  }

  _initializeStorage() {
    const bucketName = process.env.GCS_BUCKET_NAME;

    // Try to initialize GCS if bucket name is provided
    if (bucketName) {
      try {
        // In Cloud Run, Application Default Credentials are used automatically
        // For local dev, set GOOGLE_APPLICATION_CREDENTIALS env var
        this.gcsClient = new Storage();
        this.gcsBucket = this.gcsClient.bucket(bucketName);
        this.storageType = 'gcs';
        logger.info('GCS Storage initialized', { bucket: bucketName });
      } catch (err) {
        logger.error('Failed to initialize GCS, falling back to local storage', { error: err.message });
        this._initializeLocalStorage();
      }
    } else {
      logger.info('GCS bucket not configured, using local storage');
      this._initializeLocalStorage();
    }
  }

  _initializeLocalStorage() {
    // Use /tmp/uploads on Cloud Run, ./uploads locally
    this.localUploadDir = process.env.K_SERVICE
      ? '/tmp/uploads'
      : path.join(__dirname, '../../../uploads');

    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }

    this.storageType = 'local';
    logger.info('Local storage initialized', { path: this.localUploadDir });
  }

  /**
   * Compress image if applicable
   */
  async _compressImage(buffer, mimetype) {
    if (!mimetype.startsWith('image/')) {
      return buffer;
    }

    try {
      return await sharp(buffer)
        .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();
    } catch (err) {
      logger.warn('Image compression failed, using original', { error: err.message });
      return buffer;
    }
  }

  /**
   * Encrypt file buffer
   */
  _encryptBuffer(buffer) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // Return IV + Encrypted Data
    return Buffer.concat([iv, encrypted]);
  }

  /**
   * Decrypt file buffer
   */
  _decryptBuffer(buffer) {
    const iv = buffer.slice(0, IV_LENGTH);
    const encryptedContent = buffer.slice(IV_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    return Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
  }

  /**
   * Process and save file to storage
   * @param {Object} file - Multer file object
   * @returns {Object} File metadata
   */
  async processAndSave(file) {
    try {
      // 1. Compress if image
      let buffer = await this._compressImage(file.buffer, file.mimetype);

      // 2. Encrypt
      const encryptedBuffer = this._encryptBuffer(buffer);

      // 3. Generate filename
      const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}-${file.originalname}`;
      const storagePath = `${filename}.enc`;

      // 4. Upload to storage
      if (this.storageType === 'gcs') {
        await this._uploadToGCS(storagePath, encryptedBuffer, file.mimetype);
      } else {
        await this._uploadToLocal(storagePath, encryptedBuffer);
      }

      return {
        filename: filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: encryptedBuffer.length,
        path: `/api/files/${filename}`,
        storageType: this.storageType,
      };
    } catch (err) {
      logger.error('Failed to process and save file', { error: err.message, filename: file.originalname });
      throw new Error('Failed to save file');
    }
  }

  /**
   * Retrieve and decrypt file from storage
   * @param {string} filename - File name (without .enc extension)
   * @returns {Buffer} Decrypted file buffer
   */
  async retrieveAndDecrypt(filename) {
    try {
      const storagePath = `${filename}.enc`;

      let encryptedBuffer;
      if (this.storageType === 'gcs') {
        encryptedBuffer = await this._downloadFromGCS(storagePath);
      } else {
        encryptedBuffer = await this._downloadFromLocal(storagePath);
      }

      return this._decryptBuffer(encryptedBuffer);
    } catch (err) {
      logger.error('Failed to retrieve and decrypt file', { error: err.message, filename });
      throw new Error('File not found or decryption failed');
    }
  }

  /**
   * Delete file from storage
   * @param {string} filename - File name (without .enc extension)
   */
  async deleteFile(filename) {
    try {
      const storagePath = `${filename}.enc`;

      if (this.storageType === 'gcs') {
        await this._deleteFromGCS(storagePath);
      } else {
        await this._deleteFromLocal(storagePath);
      }

      logger.info('File deleted', { filename, storageType: this.storageType });
    } catch (err) {
      logger.error('Failed to delete file', { error: err.message, filename });
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Generate signed URL for direct file access (GCS only)
   * @param {string} filename - File name (without .enc extension)
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {string} Signed URL
   */
  async getSignedUrl(filename, expiresIn = 3600) {
    if (this.storageType !== 'gcs') {
      // For local storage, return API endpoint
      return `/api/files/${filename}`;
    }

    try {
      const storagePath = `${filename}.enc`;
      const file = this.gcsBucket.file(storagePath);

      const [url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

      return url;
    } catch (err) {
      logger.error('Failed to generate signed URL', { error: err.message, filename });
      throw new Error('Failed to generate signed URL');
    }
  }

  // --- GCS Operations ---

  async _uploadToGCS(path, buffer, mimetype) {
    const file = this.gcsBucket.file(path);

    await file.save(buffer, {
      metadata: {
        contentType: 'application/octet-stream', // Encrypted, so generic type
        metadata: {
          originalMimetype: mimetype,
          encrypted: 'true',
        },
      },
    });

    logger.info('File uploaded to GCS', { path });
  }

  async _downloadFromGCS(path) {
    const file = this.gcsBucket.file(path);

    const [exists] = await file.exists();
    if (!exists) {
      throw new Error('File not found in GCS');
    }

    const [buffer] = await file.download();
    return buffer;
  }

  async _deleteFromGCS(path) {
    const file = this.gcsBucket.file(path);
    await file.delete();
  }

  // --- Local Storage Operations ---

  async _uploadToLocal(path, buffer) {
    const filepath = path.join(this.localUploadDir, path);
    fs.writeFileSync(filepath, buffer);
    logger.info('File uploaded to local storage', { path: filepath });
  }

  async _downloadFromLocal(path) {
    const filepath = path.join(this.localUploadDir, path);

    if (!fs.existsSync(filepath)) {
      throw new Error('File not found on local disk');
    }

    return fs.readFileSync(filepath);
  }

  async _deleteFromLocal(path) {
    const filepath = path.join(this.localUploadDir, path);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  // --- Public Getters ---

  getStorageType() {
    return this.storageType;
  }

  getUploadDir() {
    return this.localUploadDir;
  }
}

// Singleton instance
const storageService = new StorageService();

module.exports = storageService;
