const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
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
   * Generate thumbnail for media
   * @param {Buffer} buffer - Original file buffer
   * @param {string} mimetype - File MIME type
   * @returns {Buffer|null} Thumbnail buffer or null if not applicable
   */
  async _generateThumbnail(buffer, mimetype) {
    try {
      if (mimetype.startsWith('image/')) {
        // Generate image thumbnail using sharp
        return await sharp(buffer)
          .resize(200, 200, { fit: 'cover', position: 'center' })
          .jpeg({ quality: 70 })
          .toBuffer();
      }

      if (mimetype.startsWith('video/')) {
        // Generate video thumbnail using ffmpeg
        return await this._extractVideoFrame(buffer);
      }

      return null;
    } catch (err) {
      logger.warn('Thumbnail generation failed', { error: err.message, mimetype });
      return null;
    }
  }

  /**
   * Extract first frame from video as thumbnail
   * @param {Buffer} buffer - Video buffer
   * @returns {Promise<Buffer>} Thumbnail buffer
   */
  async _extractVideoFrame(buffer) {
    return new Promise((resolve, reject) => {
      // Write buffer to temporary file
      const tempInput = path.join(this.localUploadDir || '/tmp', `temp_${Date.now()}.mp4`);
      const tempOutput = path.join(this.localUploadDir || '/tmp', `thumb_${Date.now()}.jpg`);

      try {
        fs.writeFileSync(tempInput, buffer);

        ffmpeg(tempInput)
          .screenshots({
            count: 1,
            folder: path.dirname(tempOutput),
            filename: path.basename(tempOutput),
            size: '200x200',
            timemarks: ['1'] // Extract frame at 1 second
          })
          .on('end', () => {
            try {
              const thumbnailBuffer = fs.readFileSync(tempOutput);

              // Cleanup temp files
              fs.unlinkSync(tempInput);
              fs.unlinkSync(tempOutput);

              resolve(thumbnailBuffer);
            } catch (err) {
              reject(err);
            }
          })
          .on('error', (err) => {
            // Cleanup on error
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
            reject(err);
          });
      } catch (err) {
        reject(err);
      }
    });
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

  /**
   * Upload file with optional thumbnail generation
   * @param {Buffer} buffer - File buffer
   * @param {string} filename - Destination filename
   * @param {Object} options - Upload options
   * @param {string} options.contentType - MIME type
   * @param {Object} options.metadata - Additional metadata
   * @returns {Object} Upload result with path and URL
   */
  async upload(buffer, filename, options = {}) {
    try {
      const { contentType, metadata = {} } = options;

      // 1. Compress if image
      let processedBuffer = await this._compressImage(buffer, contentType);

      // 2. Generate thumbnail
      let thumbnailPath = null;
      const thumbnailBuffer = await this._generateThumbnail(processedBuffer, contentType);

      if (thumbnailBuffer) {
        const thumbnailFilename = `thumb_${filename}`;
        const encryptedThumbnail = this._encryptBuffer(thumbnailBuffer);
        const thumbnailStoragePath = `${thumbnailFilename}.enc`;

        // Upload thumbnail
        if (this.storageType === 'gcs') {
          await this._uploadToGCS(thumbnailStoragePath, encryptedThumbnail, 'image/jpeg');
        } else {
          await this._uploadToLocal(thumbnailStoragePath, encryptedThumbnail);
        }

        thumbnailPath = thumbnailFilename;
      }

      // 3. Encrypt main file
      const encryptedBuffer = this._encryptBuffer(processedBuffer);

      // 4. Upload main file
      const storagePath = `${filename}.enc`;
      if (this.storageType === 'gcs') {
        await this._uploadToGCS(storagePath, encryptedBuffer, contentType);
      } else {
        await this._uploadToLocal(storagePath, encryptedBuffer);
      }

      logger.info('File uploaded with thumbnail', {
        filename,
        thumbnailPath,
        storageType: this.storageType
      });

      return {
        path: filename,
        url: this.storageType === 'gcs' ? null : `/api/files/${filename}`,
        thumbnailPath,
        thumbnailUrl: thumbnailPath ? `/api/files/${thumbnailPath}` : null,
        size: buffer.length
      };
    } catch (err) {
      logger.error('Failed to upload file', { error: err.message, filename });
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Delete file and its thumbnail
   * @param {string} filename - File name to delete
   * @param {string} thumbnailPath - Optional thumbnail path
   */
  async delete(filename, thumbnailPath = null) {
    try {
      // Delete main file
      await this.deleteFile(filename);

      // Delete thumbnail if exists
      if (thumbnailPath) {
        try {
          await this.deleteFile(thumbnailPath);
        } catch (err) {
          logger.warn('Failed to delete thumbnail', { thumbnailPath, error: err.message });
        }
      }

      logger.info('File and thumbnail deleted', { filename, thumbnailPath });
    } catch (err) {
      logger.error('Failed to delete file', { error: err.message, filename });
      throw new Error('Failed to delete file');
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
