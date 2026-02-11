const { encrypt, decrypt, encryptGCM, decryptGCM, encryptCBC, decryptCBC } = require('../security/encryption');

describe('Encryption Module', () => {
    describe('encrypt/decrypt round-trip (GCM)', () => {
        it('should encrypt and decrypt a string', () => {
            const original = 'my-secret-api-key-12345';
            const encrypted = encrypt(original);
            expect(encrypted).not.toBe(original);
            expect(encrypted.startsWith('gcm:')).toBe(true);

            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(original);
        });

        it('should produce different ciphertext each time (random IV)', () => {
            const original = 'same-input';
            const enc1 = encrypt(original);
            const enc2 = encrypt(original);
            expect(enc1).not.toBe(enc2);
            expect(decrypt(enc1)).toBe(original);
            expect(decrypt(enc2)).toBe(original);
        });

        it('should handle empty string', () => {
            expect(encrypt('')).toBe(null);
            expect(decrypt('')).toBe(null);
        });

        it('should handle null', () => {
            expect(encrypt(null)).toBe(null);
            expect(decrypt(null)).toBe(null);
        });

        it('should handle undefined', () => {
            expect(encrypt(undefined)).toBe(null);
            expect(decrypt(undefined)).toBe(null);
        });

        it('should handle special characters and unicode', () => {
            const original = 'pässwörd with spëcial chars! @#$%^&*() 🔐';
            const encrypted = encrypt(original);
            expect(decrypt(encrypted)).toBe(original);
        });

        it('should handle long strings', () => {
            const original = 'x'.repeat(10000);
            const encrypted = encrypt(original);
            expect(decrypt(encrypted)).toBe(original);
        });
    });

    describe('GCM format detection', () => {
        it('should detect GCM-encrypted strings by prefix', () => {
            const encrypted = encryptGCM('test');
            expect(encrypted.startsWith('gcm:')).toBe(true);
        });

        it('should correctly decrypt GCM strings via unified decrypt', () => {
            const encrypted = encryptGCM('test-gcm');
            expect(decrypt(encrypted)).toBe('test-gcm');
        });
    });

    describe('CBC backward compatibility', () => {
        it('should encrypt and decrypt using CBC', () => {
            const original = 'legacy-secret';
            const encrypted = encryptCBC(original);
            expect(encrypted).not.toContain('gcm:');
            expect(decryptCBC(encrypted)).toBe(original);
        });

        it('should decrypt CBC ciphertext via unified decrypt', () => {
            const original = 'legacy-data';
            const encrypted = encryptCBC(original);
            expect(decrypt(encrypted)).toBe(original);
        });
    });

    describe('tamper detection (GCM)', () => {
        it('should fail on tampered ciphertext', () => {
            const encrypted = encryptGCM('sensitive-data');
            // Tamper with the encrypted portion
            const parts = encrypted.split(':');
            const tampered = parts[0] + ':' + parts[1] + ':' + 'ff' + parts[2].slice(2) + ':' + parts[3];

            // GCM should detect tampering — decrypt returns raw string (fallback)
            const result = decrypt(tampered);
            expect(result).not.toBe('sensitive-data');
        });

        it('should fail on tampered auth tag', () => {
            const encrypted = encryptGCM('auth-test');
            const parts = encrypted.split(':');
            // Flip bits in auth tag
            const badTag = 'a'.repeat(parts[3].length);
            const tampered = parts[0] + ':' + parts[1] + ':' + parts[2] + ':' + badTag;

            const result = decrypt(tampered);
            expect(result).not.toBe('auth-test');
        });
    });

    describe('error handling', () => {
        it('should return raw text for non-encrypted strings', () => {
            const plaintext = 'just-a-plain-string';
            expect(decrypt(plaintext)).toBe(plaintext);
        });

        it('should throw when DB_ENCRYPTION_KEY is missing', () => {
            const originalKey = process.env.DB_ENCRYPTION_KEY;
            delete process.env.DB_ENCRYPTION_KEY;

            expect(() => encrypt('test')).toThrow('DB_ENCRYPTION_KEY');

            process.env.DB_ENCRYPTION_KEY = originalKey;
        });
    });
});
