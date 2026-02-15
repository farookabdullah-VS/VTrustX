/**
 * Multi-Language Surveys Migration
 *
 * Creates tables for storing survey translations and language preferences
 * Tables:
 * - form_translations: Stores translations for form titles, descriptions, questions
 * - supported_languages: List of supported languages with metadata
 * - user_language_preferences: User's preferred language settings
 */

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Supported Languages Table
    pgm.createTable('supported_languages', {
        id: { type: 'serial', primaryKey: true },
        code: { type: 'varchar(10)', notNull: true, unique: true }, // en, es, ar, zh, etc.
        name: { type: 'varchar(100)', notNull: true }, // English, Spanish, Arabic
        native_name: { type: 'varchar(100)', notNull: true }, // English, Español, العربية
        direction: { type: 'varchar(3)', notNull: true, default: "'ltr'" }, // ltr or rtl
        is_enabled: { type: 'boolean', default: true },
        sort_order: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Form Translations Table
    pgm.createTable('form_translations', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        form_id: { type: 'integer', notNull: true },
        language_code: { type: 'varchar(10)', notNull: true },
        title: { type: 'text' },
        description: { type: 'text' },
        welcome_message: { type: 'text' },
        thank_you_message: { type: 'text' },
        questions: { type: 'jsonb' }, // Array of translated questions
        translation_status: { type: 'varchar(20)', default: "'draft'" }, // draft, pending, completed, auto
        translated_by: { type: 'varchar(50)' }, // manual, google, deepl, azure
        translated_at: { type: 'timestamp' },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // User Language Preferences Table
    pgm.createTable('user_language_preferences', {
        id: { type: 'serial', primaryKey: true },
        tenant_id: { type: 'integer', notNull: true },
        user_id: { type: 'integer' },
        contact_email: { type: 'varchar(255)' }, // For respondents without user accounts
        preferred_language: { type: 'varchar(10)', notNull: true },
        auto_detect: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('NOW()') },
        updated_at: { type: 'timestamp', default: pgm.func('NOW()') }
    });

    // Add default_language to forms table
    pgm.addColumn('forms', {
        default_language: { type: 'varchar(10)', default: "'en'" },
        available_languages: { type: 'jsonb', default: '["en"]' }, // Array of enabled language codes
        auto_translate: { type: 'boolean', default: false },
        translation_provider: { type: 'varchar(20)', default: "'google'" } // google, deepl, azure, manual
    });

    // Indexes for performance
    pgm.createIndex('form_translations', 'form_id');
    pgm.createIndex('form_translations', 'language_code');
    pgm.createIndex('form_translations', ['form_id', 'language_code'], { unique: true });
    pgm.createIndex('form_translations', 'tenant_id');
    pgm.createIndex('user_language_preferences', 'user_id');
    pgm.createIndex('user_language_preferences', 'contact_email');
    pgm.createIndex('user_language_preferences', 'tenant_id');

    // Foreign key constraints
    pgm.addConstraint('form_translations', 'fk_form_translations_form', {
        foreignKeys: {
            columns: 'form_id',
            references: 'forms(id)',
            onDelete: 'CASCADE'
        }
    });

    pgm.addConstraint('form_translations', 'fk_form_translations_language', {
        foreignKeys: {
            columns: 'language_code',
            references: 'supported_languages(code)',
            onDelete: 'RESTRICT'
        }
    });

    pgm.addConstraint('user_language_preferences', 'fk_user_language_preferences_language', {
        foreignKeys: {
            columns: 'preferred_language',
            references: 'supported_languages(code)',
            onDelete: 'RESTRICT'
        }
    });

    // Insert default supported languages
    pgm.sql(`
        INSERT INTO supported_languages (code, name, native_name, direction, sort_order) VALUES
        ('en', 'English', 'English', 'ltr', 1),
        ('es', 'Spanish', 'Español', 'ltr', 2),
        ('fr', 'French', 'Français', 'ltr', 3),
        ('de', 'German', 'Deutsch', 'ltr', 4),
        ('it', 'Italian', 'Italiano', 'ltr', 5),
        ('pt', 'Portuguese', 'Português', 'ltr', 6),
        ('ar', 'Arabic', 'العربية', 'rtl', 7),
        ('zh', 'Chinese (Simplified)', '简体中文', 'ltr', 8),
        ('ja', 'Japanese', '日本語', 'ltr', 9),
        ('ko', 'Korean', '한국어', 'ltr', 10),
        ('ru', 'Russian', 'Русский', 'ltr', 11),
        ('hi', 'Hindi', 'हिन्दी', 'ltr', 12),
        ('tr', 'Turkish', 'Türkçe', 'ltr', 13),
        ('nl', 'Dutch', 'Nederlands', 'ltr', 14),
        ('sv', 'Swedish', 'Svenska', 'ltr', 15),
        ('pl', 'Polish', 'Polski', 'ltr', 16),
        ('he', 'Hebrew', 'עברית', 'rtl', 17),
        ('id', 'Indonesian', 'Bahasa Indonesia', 'ltr', 18),
        ('th', 'Thai', 'ไทย', 'ltr', 19),
        ('vi', 'Vietnamese', 'Tiếng Việt', 'ltr', 20)
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // Drop constraints
    pgm.dropConstraint('form_translations', 'fk_form_translations_form', { ifExists: true });
    pgm.dropConstraint('form_translations', 'fk_form_translations_language', { ifExists: true });
    pgm.dropConstraint('user_language_preferences', 'fk_user_language_preferences_language', { ifExists: true });

    // Drop indexes
    pgm.dropIndex('form_translations', 'form_id', { ifExists: true });
    pgm.dropIndex('form_translations', 'language_code', { ifExists: true });
    pgm.dropIndex('form_translations', ['form_id', 'language_code'], { ifExists: true });
    pgm.dropIndex('form_translations', 'tenant_id', { ifExists: true });
    pgm.dropIndex('user_language_preferences', 'user_id', { ifExists: true });
    pgm.dropIndex('user_language_preferences', 'contact_email', { ifExists: true });
    pgm.dropIndex('user_language_preferences', 'tenant_id', { ifExists: true });

    // Remove columns from forms table
    pgm.dropColumn('forms', 'default_language', { ifExists: true });
    pgm.dropColumn('forms', 'available_languages', { ifExists: true });
    pgm.dropColumn('forms', 'auto_translate', { ifExists: true });
    pgm.dropColumn('forms', 'translation_provider', { ifExists: true });

    // Drop tables
    pgm.dropTable('user_language_preferences', { ifExists: true });
    pgm.dropTable('form_translations', { ifExists: true });
    pgm.dropTable('supported_languages', { ifExists: true });
};
