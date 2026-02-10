/**
 * SPSSExporter - Exports data in SPSS format
 */

class SPSSExporter {
    /**
     * Export to SPSS format
     * Note: This creates SPSS syntax files (.sps) and CSV data
     * For actual .sav files, you would need the spss-writer package
     */
    async export(transformedData, options) {
        // Generate SPSS syntax file
        const syntax = this.generateSPSSSyntax(transformedData, options);

        // Generate data file (CSV format for SPSS import)
        const dataCSV = this.generateDataForSPSS(transformedData, options);

        // Create a combined package
        const archiver = require('archiver');
        const { Readable } = require('stream');

        return new Promise((resolve, reject) => {
            const archive = archiver('zip', { zlib: { level: 9 } });
            const chunks = [];

            archive.on('data', chunk => chunks.push(chunk));
            archive.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    buffer,
                    fileName: `${this.sanitizeFileName(transformedData.form.title)}_spss_${this.getDateString()}.zip`,
                    mimeType: 'application/zip'
                });
            });
            archive.on('error', reject);

            // Add syntax file
            archive.append(syntax, { name: 'import_syntax.sps' });

            // Add data file
            archive.append(dataCSV, { name: 'data.csv' });

            // Add readme
            const readme = this.generateReadme(transformedData);
            archive.append(readme, { name: 'README.txt' });

            archive.finalize();
        });
    }

    /**
     * Generate SPSS syntax file
     */
    generateSPSSSyntax(transformedData, options) {
        let syntax = `* SPSS Syntax File for ${transformedData.form.title}\n`;
        syntax += `* Generated: ${new Date().toISOString()}\n`;
        syntax += `* Total Responses: ${transformedData.submissions.length}\n\n`;

        // Data import command
        syntax += `GET DATA\n`;
        syntax += `  /TYPE=TXT\n`;
        syntax += `  /FILE='data.csv'\n`;
        syntax += `  /DELIMITERS=","\n`;
        syntax += `  /QUALIFIER='"'\n`;
        syntax += `  /ARRANGEMENT=DELIMITED\n`;
        syntax += `  /FIRSTCASE=2\n`;
        syntax += `  /VARIABLES=\n`;

        // Define variables
        const variables = this.getVariableDefinitions(transformedData, options);
        variables.forEach((variable, index) => {
            const isLast = index === variables.length - 1;
            syntax += `    ${variable.name} ${variable.type}${isLast ? '.\n' : '\n'}`;
        });

        syntax += `CACHE.\n`;
        syntax += `EXECUTE.\n\n`;

        // Variable labels
        syntax += `VARIABLE LABELS\n`;
        variables.forEach((variable, index) => {
            const isLast = index === variables.length - 1;
            syntax += `  ${variable.name} '${variable.label}'${isLast ? '.\n' : '\n'}`;
        });
        syntax += `\n`;

        // Value labels for categorical variables
        const categoricalVars = variables.filter(v => v.valueLabels);
        if (categoricalVars.length > 0) {
            syntax += `VALUE LABELS\n`;
            categoricalVars.forEach((variable, index) => {
                syntax += `  ${variable.name}\n`;
                Object.keys(variable.valueLabels).forEach(value => {
                    syntax += `    ${value} '${variable.valueLabels[value]}'\n`;
                });
                if (index < categoricalVars.length - 1) {
                    syntax += `  /\n`;
                }
            });
            syntax += `.\n\n`;
        }

        // Missing values
        syntax += `MISSING VALUES\n`;
        variables.forEach((variable, index) => {
            if (variable.type === 'F8.2' || variable.type === 'F8.0') {
                const isLast = index === variables.length - 1;
                syntax += `  ${variable.name} (-99)${isLast ? '.\n' : '\n'}`;
            }
        });
        syntax += `\n`;

        // Frequencies
        syntax += `* Run frequencies for all variables\n`;
        syntax += `FREQUENCIES VARIABLES=ALL\n`;
        syntax += `  /ORDER=ANALYSIS.\n\n`;

        // Descriptives for numeric variables
        const numericVars = variables.filter(v => v.type.startsWith('F'));
        if (numericVars.length > 0) {
            syntax += `* Descriptive statistics for numeric variables\n`;
            syntax += `DESCRIPTIVES VARIABLES=${numericVars.map(v => v.name).join(' ')}\n`;
            syntax += `  /STATISTICS=MEAN STDDEV MIN MAX.\n\n`;
        }

        return syntax;
    }

    /**
     * Get variable definitions for SPSS
     */
    getVariableDefinitions(transformedData, options) {
        const variables = [];

        // Standard variables
        variables.push({
            name: 'resp_id',
            type: 'A36',
            label: 'Response ID'
        });

        variables.push({
            name: 'submit_date',
            type: 'DATETIME23',
            label: 'Submission Date'
        });

        variables.push({
            name: 'status',
            type: 'A20',
            label: 'Response Status'
        });

        // Question variables
        transformedData.form.questions.forEach(question => {
            if (question.type === 'checkbox') {
                // Create binary variables for each checkbox option
                question.choices.forEach((choice, index) => {
                    const choiceValue = typeof choice === 'object' ? choice.value : choice;
                    const choiceText = typeof choice === 'object' ? choice.text : choice;

                    const varName = options.questionCodeVariableName
                        ? `${question.name}_${choiceValue}`.substring(0, 64)
                        : `Q${transformedData.form.questions.indexOf(question) + 1}_${index + 1}`;

                    variables.push({
                        name: this.sanitizeVariableName(varName),
                        type: 'F1.0',
                        label: options.questionCodeInsteadOfText ? question.name : `${question.title} - ${choiceText}`,
                        valueLabels: { 0: 'Not Selected', 1: 'Selected' }
                    });
                });
            } else if (question.type === 'radiogroup' || question.type === 'dropdown') {
                const varName = options.questionCodeVariableName
                    ? question.name.substring(0, 64)
                    : `Q${transformedData.form.questions.indexOf(question) + 1}`;

                const valueLabels = {};
                question.choices.forEach((choice, index) => {
                    const choiceValue = typeof choice === 'object' ? choice.value : choice;
                    const choiceText = typeof choice === 'object' ? choice.text : choice;

                    if (options.answerCodes) {
                        valueLabels[index + 1] = choiceText;
                    } else {
                        valueLabels[choiceValue] = choiceText;
                    }
                });

                variables.push({
                    name: this.sanitizeVariableName(varName),
                    type: 'F2.0',
                    label: options.questionCodeInsteadOfText ? question.name : question.title,
                    valueLabels: valueLabels
                });
            } else if (question.type === 'rating') {
                const varName = options.questionCodeVariableName
                    ? question.name.substring(0, 64)
                    : `Q${transformedData.form.questions.indexOf(question) + 1}`;

                variables.push({
                    name: this.sanitizeVariableName(varName),
                    type: 'F3.1',
                    label: options.questionCodeInsteadOfText ? question.name : question.title
                });
            } else if (question.type === 'text' || question.type === 'comment') {
                const varName = options.questionCodeVariableName
                    ? question.name.substring(0, 64)
                    : `Q${transformedData.form.questions.indexOf(question) + 1}`;

                variables.push({
                    name: this.sanitizeVariableName(varName),
                    type: 'A255',
                    label: options.questionCodeInsteadOfText ? question.name : question.title
                });
            } else if (question.type === 'matrix') {
                // Create variable for each matrix row
                question.rows.forEach((row, rowIndex) => {
                    const rowValue = typeof row === 'object' ? row.value : row;
                    const rowText = typeof row === 'object' ? row.text : row;

                    const varName = options.questionCodeVariableName
                        ? `${question.name}_${rowValue}`.substring(0, 64)
                        : `Q${transformedData.form.questions.indexOf(question) + 1}_${rowIndex + 1}`;

                    const valueLabels = {};
                    question.columns.forEach((col, colIndex) => {
                        const colValue = typeof col === 'object' ? col.value : col;
                        const colText = typeof col === 'object' ? col.text : col;
                        valueLabels[colIndex + 1] = colText;
                    });

                    variables.push({
                        name: this.sanitizeVariableName(varName),
                        type: 'F2.0',
                        label: options.questionCodeInsteadOfText ? `${question.name}_${rowValue}` : `${question.title} - ${rowText}`,
                        valueLabels: valueLabels
                    });
                });
            }
        });

        return variables;
    }

    /**
     * Generate data CSV for SPSS import
     */
    generateDataForSPSS(transformedData, options) {
        const { Parser } = require('json2csv');
        const DataTransformer = require('./DataTransformer');
        const dataTransformer = new DataTransformer();

        const flattenedData = dataTransformer.flattenResponses(transformedData);
        const variables = this.getVariableDefinitions(transformedData, options);

        // Map data to SPSS variable names
        const spssData = flattenedData.map(row => {
            const spssRow = {};

            spssRow.resp_id = row.submission_id;
            spssRow.submit_date = row.submitted_at;
            spssRow.status = row.status;

            // Map question responses
            transformedData.form.questions.forEach((question, qIndex) => {
                if (question.type === 'checkbox') {
                    question.choices.forEach((choice, cIndex) => {
                        const choiceValue = typeof choice === 'object' ? choice.value : choice;
                        const varName = options.questionCodeVariableName
                            ? this.sanitizeVariableName(`${question.name}_${choiceValue}`)
                            : this.sanitizeVariableName(`Q${qIndex + 1}_${cIndex + 1}`);

                        const responseKey = `${question.name}_${choiceValue}`;
                        spssRow[varName] = row[responseKey] || (options.unselectedCheckboxes || 0);
                    });
                } else {
                    const varName = options.questionCodeVariableName
                        ? this.sanitizeVariableName(question.name)
                        : this.sanitizeVariableName(`Q${qIndex + 1}`);

                    spssRow[varName] = row[question.name] || '';
                }
            });

            return spssRow;
        });

        const parser = new Parser({
            fields: variables.map(v => v.name),
            quote: '"',
            delimiter: ',',
            header: true
        });

        return parser.parse(spssData);
    }

    /**
     * Generate README file
     */
    generateReadme(transformedData) {
        let readme = `SPSS Export Package for ${transformedData.form.title}\n`;
        readme += `${'='.repeat(60)}\n\n`;
        readme += `Generated: ${new Date().toISOString()}\n`;
        readme += `Total Responses: ${transformedData.submissions.length}\n\n`;
        readme += `Files Included:\n`;
        readme += `- data.csv: Survey response data in CSV format\n`;
        readme += `- import_syntax.sps: SPSS syntax file for importing and analyzing data\n`;
        readme += `- README.txt: This file\n\n`;
        readme += `Instructions:\n`;
        readme += `1. Open SPSS Statistics\n`;
        readme += `2. Open the import_syntax.sps file\n`;
        readme += `3. Run the syntax file (Run > All)\n`;
        readme += `4. The data will be imported and labeled automatically\n\n`;
        readme += `Note: Make sure data.csv is in the same directory as the syntax file.\n`;

        return readme;
    }

    /**
     * Sanitize variable name for SPSS (max 64 chars, alphanumeric + underscore)
     */
    sanitizeVariableName(name) {
        return name
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[^a-zA-Z]/, 'V')
            .substring(0, 64);
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

module.exports = SPSSExporter;
