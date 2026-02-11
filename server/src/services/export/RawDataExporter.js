/**
 * RawDataExporter - Exports raw data to Excel and CSV formats
 */

const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const DataTransformer = require('./DataTransformer');

class RawDataExporter {
    constructor() {
        this.dataTransformer = new DataTransformer();
    }

    /**
     * Export data in specified format
     */
    async export(transformedData, format, options) {
        if (format === 'xlsx') {
            return await this.exportToExcel(transformedData, options);
        } else if (format === 'csv') {
            return await this.exportToCSV(transformedData, options);
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Export to Excel format
     */
    async exportToExcel(transformedData, options) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'RayiX';
        workbook.created = new Date();

        // Create main data sheet
        const worksheet = workbook.addWorksheet('Survey Responses');

        // Get flattened data and headers
        const flattenedData = this.dataTransformer.flattenResponses(transformedData);
        const headers = this.dataTransformer.getColumnHeaders(transformedData, options);

        // Add headers
        if (options.singleHeaderRow) {
            worksheet.addRow(headers.map(h => h.label));
        } else {
            // Add multiple header rows if needed (for grouped questions)
            const headerRow = worksheet.addRow(headers.map(h => h.label));
            headerRow.font = { bold: true };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }

        // Add data rows
        flattenedData.forEach(row => {
            const rowData = headers.map(h => {
                const value = row[h.key];

                // Format dates
                if (h.key === 'submitted_at' && value) {
                    return new Date(value);
                }

                return value !== undefined ? value : '';
            });

            worksheet.addRow(rowData);
        });

        // Auto-fit columns
        worksheet.columns.forEach((column, index) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(maxLength + 2, 50);
        });

        // Add filters
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: headers.length }
        };

        // Freeze header row
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // Add metadata sheet if requested
        if (options.reportLabels) {
            this.addMetadataSheet(workbook, transformedData);
        }

        // Add question dictionary sheet
        this.addQuestionDictionarySheet(workbook, transformedData);

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return {
            buffer,
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_${this.getDateString()}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
    }

    /**
     * Export to CSV format
     */
    async exportToCSV(transformedData, options) {
        const flattenedData = this.dataTransformer.flattenResponses(transformedData);
        const headers = this.dataTransformer.getColumnHeaders(transformedData, options);

        // Configure CSV parser
        const fields = headers.map(h => ({
            label: h.label,
            value: h.key
        }));

        const parser = new Parser({
            fields,
            quote: '"',
            delimiter: ',',
            header: true,
            withBOM: true // Add BOM for Excel compatibility
        });

        const csv = parser.parse(flattenedData);

        return {
            buffer: Buffer.from(csv, 'utf-8'),
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_${this.getDateString()}.csv`,
            mimeType: 'text/csv'
        };
    }

    /**
     * Add metadata sheet to workbook
     */
    addMetadataSheet(workbook, transformedData) {
        const metaSheet = workbook.addWorksheet('Export Metadata');

        metaSheet.addRow(['Export Information']);
        metaSheet.addRow(['Form Title', transformedData.form.title]);
        metaSheet.addRow(['Form ID', transformedData.form.id]);
        metaSheet.addRow(['Total Responses', transformedData.metadata.totalResponses]);
        metaSheet.addRow(['Export Date', transformedData.metadata.exportDate]);
        metaSheet.addRow(['Export Options', JSON.stringify(transformedData.metadata.options, null, 2)]);

        // Style the metadata sheet
        metaSheet.getCell('A1').font = { bold: true, size: 14 };
        metaSheet.columns = [
            { width: 25 },
            { width: 50 }
        ];
    }

    /**
     * Add question dictionary sheet
     */
    addQuestionDictionarySheet(workbook, transformedData) {
        const dictSheet = workbook.addWorksheet('Question Dictionary');

        // Add headers
        const headerRow = dictSheet.addRow([
            'Question Name',
            'Question Text',
            'Question Type',
            'Required',
            'Choices'
        ]);

        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' }
        };
        headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

        // Add question data
        transformedData.form.questions.forEach(question => {
            let choicesText = '';

            if (question.choices && question.choices.length > 0) {
                choicesText = question.choices.map(c => {
                    return typeof c === 'object' ? `${c.value}: ${c.text}` : c;
                }).join('; ');
            }

            dictSheet.addRow([
                question.name,
                question.title,
                question.type,
                question.isRequired ? 'Yes' : 'No',
                choicesText
            ]);
        });

        // Auto-fit columns
        dictSheet.columns.forEach((column) => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, (cell) => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(maxLength + 2, 60);
        });
    }

    /**
     * Sanitize filename
     */
    sanitizeFileName(name) {
        return name
            .replace(/[^a-z0-9]/gi, '_')
            .replace(/_+/g, '_')
            .toLowerCase();
    }

    /**
     * Get date string for filename
     */
    getDateString() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
}

module.exports = RawDataExporter;
