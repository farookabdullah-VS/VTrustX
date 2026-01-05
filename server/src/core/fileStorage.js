const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

// Ensure uploads dir exists
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Encryption Config (Use ENV in production)
const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = (process.env.STORAGE_KEY || 'default_secret_key_32_chars_long').padEnd(32).slice(0, 32); // Must be 32 chars
const IV_LENGTH = 16;

async function processAndSave(file) {
    let buffer = file.buffer;
    const filename = `${Date.now()}-${file.originalname}`;
    const filepath = path.join(UPLOAD_DIR, filename + '.enc');

    // 1. COMPRESSION (Images only)
    if (file.mimetype.startsWith('image/')) {
        try {
            buffer = await sharp(buffer)
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // reasonable max size
                .jpeg({ quality: 80 })
                .toBuffer();
        } catch (e) {
            console.warn("Image compression failed, using original:", e);
        }
    }

    // 2. ENCRYPTION
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // Store IV + Encrypted Data
    const params = Buffer.concat([iv, encrypted]);

    // 3. WRITE TO DISK
    fs.writeFileSync(filepath, params);

    return {
        filename: filename,
        originalName: file.originalname,
        mimetype: file.mimetype, // Store original mime
        size: params.length,
        path: `/api/files/${filename}` // Virtual path
    };
}

async function retrieveAndDecrypt(filename) {
    const filepath = path.join(UPLOAD_DIR, filename + '.enc');

    if (!fs.existsSync(filepath)) throw new Error('File not found');

    const fileBuffer = fs.readFileSync(filepath);

    // Extract IV and content
    const iv = fileBuffer.slice(0, IV_LENGTH);
    const encryptedContent = fileBuffer.slice(IV_LENGTH);

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);

    return decrypted;
}

module.exports = { processAndSave, retrieveAndDecrypt, UPLOAD_DIR };
