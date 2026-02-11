const crypto = require('crypto');

const CBC_ALGORITHM = 'aes-256-cbc';
const GCM_ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32;
const CBC_IV_LEN = 16;
const GCM_IV_LEN = 12;
const GCM_AUTH_TAG_LEN = 16;
const GCM_PREFIX = 'gcm:';

const logger = require('../logger');

function getKey() {
    const secret = process.env.DB_ENCRYPTION_KEY;
    if (!secret) {
        throw new Error('DB_ENCRYPTION_KEY environment variable is required for encryption. Do not reuse JWT_SECRET.');
    }
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt using AES-256-GCM (preferred).
 * Output format: "gcm:<iv_hex>:<encrypted_hex>:<authTag_hex>"
 */
function encryptGCM(text) {
    if (!text) return null;
    const key = getKey();
    const iv = crypto.randomBytes(GCM_IV_LEN);

    const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return GCM_PREFIX + iv.toString('hex') + ':' + encrypted + ':' + authTag;
}

/**
 * Decrypt AES-256-GCM ciphertext.
 */
function decryptGCM(text) {
    const key = getKey();
    const withoutPrefix = text.slice(GCM_PREFIX.length);
    const parts = withoutPrefix.split(':');
    if (parts.length !== 3) throw new Error('Invalid GCM ciphertext format');

    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Legacy CBC encrypt (kept for reference/migration).
 */
function encryptCBC(text) {
    if (!text) return null;
    const key = getKey();
    const iv = crypto.randomBytes(CBC_IV_LEN);

    const cipher = crypto.createCipheriv(CBC_ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Legacy CBC decrypt.
 */
function decryptCBC(text) {
    const key = getKey();
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) return text;

    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * Unified encrypt — uses GCM.
 */
function encrypt(text) {
    return encryptGCM(text);
}

/**
 * Unified decrypt — auto-detects GCM (gcm: prefix) vs legacy CBC.
 */
function decrypt(text) {
    if (!text) return null;

    try {
        if (text.startsWith(GCM_PREFIX)) {
            return decryptGCM(text);
        }
        // Legacy CBC fallback
        return decryptCBC(text);
    } catch (e) {
        logger.error("Decryption failed", { error: e.message });
        return text; // Fallback to raw if decryption fails (for legacy/plaintext migration)
    }
}

module.exports = { encrypt, decrypt, encryptGCM, decryptGCM, encryptCBC, decryptCBC };
