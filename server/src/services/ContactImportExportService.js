/**
 * Contact Import/Export Service
 *
 * Handle bulk contact operations:
 * - Import from CSV, Excel (XLSX)
 * - Export to CSV, Excel (XLSX), JSON
 * - Field mapping and validation
 * - Duplicate detection and merging
 * - Import preview and validation
 * - Background processing for large files
 */

const ExcelJS = require('exceljs');
const csv = require('csv-parser');
const { parse: parseCSV, unparse: unparseCsV } = require('papaparse');
const { query } = require('../infrastructure/database/db');
const logger = require('../infrastructure/logger');
const fs = require('fs').promises;
const path = require('path');

class ContactImportExportService {
    /**
     * Parse CSV file for import
     * @param {string} filePath - Path to CSV file
     * @returns {Promise<array>} - Parsed contacts
     */
    static async parseCSV(filePath) {
        try {
            const fileContent = await fs.readFile(filePath, 'utf-8');

            return new Promise((resolve, reject) => {
                parseCSV(fileContent, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header) => header.trim(),
                    complete: (results) => resolve(results.data),
                    error: (error) => reject(error)
                });
            });
        } catch (error) {
            logger.error('[ContactImport] CSV parse failed', {
                error: error.message,
                filePath
            });
            throw error;
        }
    }

    /**
     * Parse Excel file for import
     * @param {string} filePath - Path to Excel file
     * @returns {Promise<array>} - Parsed contacts
     */
    static async parseExcel(filePath) {
        try {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);

            const worksheet = workbook.worksheets[0]; // First sheet
            const contacts = [];
            const headers = [];

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) {
                    // Extract headers
                    row.eachCell((cell) => {
                        headers.push(cell.value ? String(cell.value).trim() : '');
                    });
                } else {
                    // Extract data
                    const contact = {};
                    row.eachCell((cell, colNumber) => {
                        const header = headers[colNumber - 1];
                        if (header) {
                            contact[header] = cell.value;
                        }
                    });
                    if (Object.keys(contact).length > 0) {
                        contacts.push(contact);
                    }
                }
            });

            return contacts;
        } catch (error) {
            logger.error('[ContactImport] Excel parse failed', {
                error: error.message,
                filePath
            });
            throw error;
        }
    }

    /**
     * Validate and map contact data
     * @param {array} rawContacts - Raw contact data
     * @param {object} fieldMapping - Field mapping configuration
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<object>} - Validation results
     */
    static async validateImport(rawContacts, fieldMapping, tenantId) {
        try {
            const validContacts = [];
            const errors = [];

            for (let i = 0; i < rawContacts.length; i++) {
                const rawContact = rawContacts[i];
                const contact = this.mapFields(rawContact, fieldMapping);

                // Validate required fields
                const validation = this.validateContact(contact, i + 2); // +2 for header row and 0-index

                if (validation.valid) {
                    validContacts.push(contact);
                } else {
                    errors.push({
                        row: i + 2,
                        errors: validation.errors,
                        data: rawContact
                    });
                }
            }

            // Check for duplicates in file
            const duplicatesInFile = this.findDuplicatesInArray(validContacts);

            // Check for duplicates in database
            const duplicatesInDB = await this.findDuplicatesInDatabase(validContacts, tenantId);

            return {
                total: rawContacts.length,
                valid: validContacts.length,
                invalid: errors.length,
                duplicates_in_file: duplicatesInFile.length,
                duplicates_in_db: duplicatesInDB.length,
                valid_contacts: validContacts,
                errors,
                duplicates_in_file: duplicatesInFile,
                duplicates_in_db: duplicatesInDB
            };
        } catch (error) {
            logger.error('[ContactImport] Validation failed', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Map raw fields to contact fields
     * @param {object} rawContact - Raw contact data
     * @param {object} fieldMapping - Field mapping
     * @returns {object} - Mapped contact
     */
    static mapFields(rawContact, fieldMapping) {
        const contact = {};

        Object.entries(fieldMapping).forEach(([targetField, sourceField]) => {
            if (sourceField && rawContact[sourceField] !== undefined) {
                contact[targetField] = rawContact[sourceField];
            }
        });

        return contact;
    }

    /**
     * Validate single contact
     * @param {object} contact - Contact data
     * @param {number} rowNumber - Row number for error reporting
     * @returns {object} - Validation result
     */
    static validateContact(contact, rowNumber) {
        const errors = [];

        // Validate email format if provided
        if (contact.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contact.email)) {
                errors.push('Invalid email format');
            }
        }

        // Validate phone format if provided
        if (contact.phone) {
            const phoneRegex = /^\+?[\d\s\-()]+$/;
            if (!phoneRegex.test(contact.phone)) {
                errors.push('Invalid phone format');
            }
        }

        // At least email or phone required
        if (!contact.email && !contact.phone) {
            errors.push('Either email or phone is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Find duplicates within imported array
     * @param {array} contacts - Contacts array
     * @returns {array} - Duplicate entries
     */
    static findDuplicatesInArray(contacts) {
        const seen = new Map();
        const duplicates = [];

        contacts.forEach((contact, index) => {
            const key = contact.email || contact.phone;
            if (key) {
                if (seen.has(key)) {
                    duplicates.push({
                        row: index + 2,
                        key,
                        first_occurrence: seen.get(key),
                        contact
                    });
                } else {
                    seen.set(key, index + 2);
                }
            }
        });

        return duplicates;
    }

    /**
     * Find duplicates in database
     * @param {array} contacts - Contacts to check
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<array>} - Matching database records
     */
    static async findDuplicatesInDatabase(contacts, tenantId) {
        try {
            const emails = contacts.filter(c => c.email).map(c => c.email);
            const phones = contacts.filter(c => c.phone).map(c => c.phone);

            if (emails.length === 0 && phones.length === 0) {
                return [];
            }

            const result = await query(
                `SELECT id, name, email, phone
                FROM contacts
                WHERE tenant_id = $1 AND (email = ANY($2::text[]) OR phone = ANY($3::text[]))`,
                [tenantId, emails.length > 0 ? emails : [''], phones.length > 0 ? phones : ['']]
            );

            return result.rows.map(row => ({
                existing_id: row.id,
                name: row.name,
                email: row.email,
                phone: row.phone
            }));
        } catch (error) {
            logger.error('[ContactImport] Database duplicate check failed', {
                error: error.message
            });
            return [];
        }
    }

    /**
     * Import contacts to database
     * @param {array} contacts - Validated contacts
     * @param {number} tenantId - Tenant ID
     * @param {object} options - Import options
     * @returns {Promise<object>} - Import results
     */
    static async importContacts(contacts, tenantId, options = {}) {
        try {
            const {
                skipDuplicates = true,
                updateExisting = false,
                tags = []
            } = options;

            let imported = 0;
            let skipped = 0;
            let updated = 0;
            const errors = [];

            for (const contact of contacts) {
                try {
                    // Check for existing contact
                    const existingResult = await query(
                        `SELECT id FROM contacts
                        WHERE tenant_id = $1 AND (email = $2 OR phone = $3)`,
                        [tenantId, contact.email || null, contact.phone || null]
                    );

                    if (existingResult.rows.length > 0) {
                        if (updateExisting) {
                            // Update existing contact
                            await query(
                                `UPDATE contacts
                                SET name = COALESCE($1, name),
                                    email = COALESCE($2, email),
                                    phone = COALESCE($3, phone),
                                    company = COALESCE($4, company),
                                    position = COALESCE($5, position),
                                    updated_at = NOW()
                                WHERE id = $6`,
                                [
                                    contact.name,
                                    contact.email,
                                    contact.phone,
                                    contact.company,
                                    contact.position,
                                    existingResult.rows[0].id
                                ]
                            );
                            updated++;
                        } else if (skipDuplicates) {
                            skipped++;
                            continue;
                        }
                    } else {
                        // Insert new contact
                        await query(
                            `INSERT INTO contacts (
                                tenant_id, name, email, phone, company, position, tags
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                            [
                                tenantId,
                                contact.name || null,
                                contact.email || null,
                                contact.phone || null,
                                contact.company || null,
                                contact.position || null,
                                tags
                            ]
                        );
                        imported++;
                    }
                } catch (err) {
                    errors.push({
                        contact,
                        error: err.message
                    });
                    logger.error('[ContactImport] Failed to import contact', {
                        error: err.message,
                        contact
                    });
                }
            }

            logger.info('[ContactImport] Import completed', {
                tenantId,
                imported,
                updated,
                skipped,
                errors: errors.length
            });

            return {
                success: true,
                imported,
                updated,
                skipped,
                errors: errors.length,
                error_details: errors
            };
        } catch (error) {
            logger.error('[ContactImport] Import failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Export contacts to CSV
     * @param {number} tenantId - Tenant ID
     * @param {object} options - Export options
     * @returns {Promise<string>} - CSV content
     */
    static async exportToCSV(tenantId, options = {}) {
        try {
            const {
                filters = {},
                fields = ['name', 'email', 'phone', 'company', 'position', 'tags']
            } = options;

            // Build query
            let whereClause = 'tenant_id = $1';
            const params = [tenantId];
            let paramIndex = 2;

            if (filters.tags && filters.tags.length > 0) {
                whereClause += ` AND tags && $${paramIndex}::text[]`;
                params.push(filters.tags);
                paramIndex++;
            }

            if (filters.lifecycle_stage) {
                whereClause += ` AND lifecycle_stage = $${paramIndex}`;
                params.push(filters.lifecycle_stage);
                paramIndex++;
            }

            // Get contacts
            const result = await query(
                `SELECT ${fields.join(', ')}
                FROM contacts
                WHERE ${whereClause}
                ORDER BY created_at DESC`,
                params
            );

            // Convert to CSV
            const csv = unparseCsV(result.rows, {
                header: true,
                columns: fields
            });

            logger.info('[ContactExport] CSV export completed', {
                tenantId,
                count: result.rows.length
            });

            return csv;
        } catch (error) {
            logger.error('[ContactExport] CSV export failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Export contacts to Excel
     * @param {number} tenantId - Tenant ID
     * @param {object} options - Export options
     * @returns {Promise<Buffer>} - Excel file buffer
     */
    static async exportToExcel(tenantId, options = {}) {
        try {
            const {
                filters = {},
                fields = ['name', 'email', 'phone', 'company', 'position', 'tags', 'created_at']
            } = options;

            // Build query
            let whereClause = 'tenant_id = $1';
            const params = [tenantId];
            let paramIndex = 2;

            if (filters.tags && filters.tags.length > 0) {
                whereClause += ` AND tags && $${paramIndex}::text[]`;
                params.push(filters.tags);
                paramIndex++;
            }

            if (filters.lifecycle_stage) {
                whereClause += ` AND lifecycle_stage = $${paramIndex}`;
                params.push(filters.lifecycle_stage);
                paramIndex++;
            }

            // Get contacts
            const result = await query(
                `SELECT ${fields.join(', ')}
                FROM contacts
                WHERE ${whereClause}
                ORDER BY created_at DESC`,
                params
            );

            // Create workbook
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Contacts');

            // Add headers
            worksheet.columns = fields.map(field => ({
                header: field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' '),
                key: field,
                width: 20
            }));

            // Style header row
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // Add data
            result.rows.forEach(contact => {
                const row = {};
                fields.forEach(field => {
                    row[field] = contact[field];
                });
                worksheet.addRow(row);
            });

            // Auto-filter
            worksheet.autoFilter = {
                from: 'A1',
                to: `${String.fromCharCode(64 + fields.length)}1`
            };

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();

            logger.info('[ContactExport] Excel export completed', {
                tenantId,
                count: result.rows.length
            });

            return buffer;
        } catch (error) {
            logger.error('[ContactExport] Excel export failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Export contacts to JSON
     * @param {number} tenantId - Tenant ID
     * @param {object} options - Export options
     * @returns {Promise<string>} - JSON content
     */
    static async exportToJSON(tenantId, options = {}) {
        try {
            const {
                filters = {},
                fields = ['id', 'name', 'email', 'phone', 'company', 'position', 'tags', 'custom_fields']
            } = options;

            // Build query
            let whereClause = 'tenant_id = $1';
            const params = [tenantId];
            let paramIndex = 2;

            if (filters.tags && filters.tags.length > 0) {
                whereClause += ` AND tags && $${paramIndex}::text[]`;
                params.push(filters.tags);
                paramIndex++;
            }

            // Get contacts
            const result = await query(
                `SELECT ${fields.join(', ')}
                FROM contacts
                WHERE ${whereClause}
                ORDER BY created_at DESC`,
                params
            );

            const json = JSON.stringify({
                export_date: new Date().toISOString(),
                total_contacts: result.rows.length,
                contacts: result.rows
            }, null, 2);

            logger.info('[ContactExport] JSON export completed', {
                tenantId,
                count: result.rows.length
            });

            return json;
        } catch (error) {
            logger.error('[ContactExport] JSON export failed', {
                error: error.message,
                tenantId
            });
            throw error;
        }
    }

    /**
     * Get import template (CSV with headers)
     * @returns {string} - CSV template
     */
    static getImportTemplate() {
        const headers = [
            'name',
            'email',
            'phone',
            'company',
            'position',
            'tags',
            'lifecycle_stage',
            'source'
        ];

        const exampleRows = [
            {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                company: 'Acme Corp',
                position: 'Manager',
                tags: 'customer,vip',
                lifecycle_stage: 'customer',
                source: 'import'
            },
            {
                name: 'Jane Smith',
                email: 'jane@example.com',
                phone: '+0987654321',
                company: 'Tech Inc',
                position: 'Director',
                tags: 'lead',
                lifecycle_stage: 'lead',
                source: 'import'
            }
        ];

        return unparseCsV(exampleRows, {
            header: true,
            columns: headers
        });
    }
}

module.exports = ContactImportExportService;
