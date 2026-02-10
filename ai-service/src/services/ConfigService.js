const { query } = require('../config/db');

class ConfigService {
    /**
     * Get a configuration value by key.
     * Checks DB 'settings' table (lowercase key) first, then falls back to process.env (UPPERCASE key).
     * @param {string} key - The configuration key (e.g. 'gemini_api_key')
     * @returns {Promise<string>}
     */
    async get(key) {
        try {
            const dbKey = key.toLowerCase();
            const res = await query('SELECT value FROM settings WHERE key = $1', [dbKey]);
            if (res.rows.length > 0 && res.rows[0].value) {
                // If value is explicitly 'false' (string), return false?
                // Or let caller handle type coercion.
                // Caller expects string usually.
                return res.rows[0].value;
            }
        } catch (error) {
            console.warn(`[ConfigService] Failed to fetch ${key} from DB: ${error.message}`);
        }

        // Fallback to Environment Variable
        const envKey = key.toUpperCase();
        return process.env[envKey];
    }

    /**
     * Get boolean value (handles 'true'/'false' strings)
     */
    async getBool(key) {
        const val = await this.get(key);
        if (typeof val === 'string') {
            return val.toLowerCase() === 'true';
        }
        return !!val;
    }
}

module.exports = new ConfigService();
