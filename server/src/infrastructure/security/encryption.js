const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY_LEN = 32;
const IV_LEN = 16;

/**
 * Helper to encrypt a string.
 * Uses JWT_SECRET or fallback as the key.
 */
function encrypt(text) {
    if (!text) return null;
    const secret = process.env.DB_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('DB_ENCRYPTION_KEY or JWT_SECRET environment variable is required for encryption.');
    }

    // Ensure key is 32 bytes
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(IV_LEN);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
}

/**
 * Helper to decrypt a string.
 */
function decrypt(text) {
    if (!text) return null;
    const secret = process.env.DB_ENCRYPTION_KEY || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('DB_ENCRYPTION_KEY or JWT_SECRET environment variable is required for decryption.');
    }

    try {
        const [ivHex, encryptedHex] = text.split(':');
        if (!ivHex || !encryptedHex) return text; // Return as is if not encrypted

        const key = crypto.createHash('sha256').update(secret).digest();
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (e) {
        console.error("Decryption failed:", e.message);
        return text; // Fallback to raw if decryption fails (for legacy migration)
    }
}

module.exports = { encrypt, decrypt };
