/**
 * SQLExporter - Exports data as SQL dump
 */

class SQLExporter {
    /**
     * Export to SQL format
     */
    async export(transformedData, options) {
        const sqlDump = this.generateSQLDump(transformedData, options);

        return {
            buffer: Buffer.from(sqlDump, 'utf-8'),
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_sql_${this.getDateString()}.sql`,
            mimeType: 'application/sql'
        };
    }

    /**
     * Generate SQL dump
     */
    generateSQLDump(transformedData, options) {
        let sql = `-- SQL Export for ${transformedData.form.title}\n`;
        sql += `-- Generated: ${new Date().toISOString()}\n`;
        sql += `-- Total Responses: ${transformedData.submissions.length}\n\n`;

        // Create database and tables
        sql += this.generateTableSchema(transformedData);
        sql += `\n`;

        // Insert form data
        sql += this.generateFormInsert(transformedData);
        sql += `\n`;

        // Insert submissions
        sql += this.generateSubmissionsInsert(transformedData, options);
        sql += `\n`;

        // Insert responses
        sql += this.generateResponsesInsert(transformedData, options);
        sql += `\n`;

        return sql;
    }

    /**
     * Generate table schema
     */
    generateTableSchema(transformedData) {
        let sql = `-- Create tables\n\n`;

        // Forms table
        sql += `CREATE TABLE IF NOT EXISTS exported_forms (\n`;
        sql += `    id VARCHAR(36) PRIMARY KEY,\n`;
        sql += `    title VARCHAR(255) NOT NULL,\n`;
        sql += `    definition TEXT,\n`;
        sql += `    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n`;
        sql += `);\n\n`;

        // Submissions table
        sql += `CREATE TABLE IF NOT EXISTS exported_submissions (\n`;
        sql += `    id VARCHAR(36) PRIMARY KEY,\n`;
        sql += `    form_id VARCHAR(36) NOT NULL,\n`;
        sql += `    status VARCHAR(20),\n`;
        sql += `    respondent_email VARCHAR(255),\n`;
        sql += `    metadata TEXT,\n`;
        sql += `    created_at TIMESTAMP,\n`;
        sql += `    FOREIGN KEY (form_id) REFERENCES exported_forms(id)\n`;
        sql += `);\n\n`;

        // Responses table
        sql += `CREATE TABLE IF NOT EXISTS exported_responses (\n`;
        sql += `    id SERIAL PRIMARY KEY,\n`;
        sql += `    submission_id VARCHAR(36) NOT NULL,\n`;
        sql += `    question_name VARCHAR(255) NOT NULL,\n`;
        sql += `    question_title TEXT,\n`;
        sql += `    question_type VARCHAR(50),\n`;
        sql += `    response_value TEXT,\n`;
        sql += `    response_score DECIMAL(10,2),\n`;
        sql += `    created_at TIMESTAMP,\n`;
        sql += `    FOREIGN KEY (submission_id) REFERENCES exported_submissions(id)\n`;
        sql += `);\n\n`;

        // Indexes
        sql += `CREATE INDEX IF NOT EXISTS idx_submissions_form ON exported_submissions(form_id);\n`;
        sql += `CREATE INDEX IF NOT EXISTS idx_responses_submission ON exported_responses(submission_id);\n`;
        sql += `CREATE INDEX IF NOT EXISTS idx_responses_question ON exported_responses(question_name);\n\n`;

        return sql;
    }

    /**
     * Generate form insert
     */
    generateFormInsert(transformedData) {
        let sql = `-- Insert form\n\n`;

        sql += `INSERT INTO exported_forms (id, title, definition, created_at) VALUES (\n`;
        sql += `    ${this.escapeString(transformedData.form.id)},\n`;
        sql += `    ${this.escapeString(transformedData.form.title)},\n`;
        sql += `    ${this.escapeString(JSON.stringify(transformedData.form.questions))},\n`;
        sql += `    ${this.escapeTimestamp(transformedData.form.createdAt)}\n`;
        sql += `);\n`;

        return sql;
    }

    /**
     * Generate submissions insert
     */
    generateSubmissionsInsert(transformedData, options) {
        let sql = `-- Insert submissions\n\n`;

        transformedData.submissions.forEach((submission, index) => {
            sql += `INSERT INTO exported_submissions (id, form_id, status, respondent_email, metadata, created_at) VALUES (\n`;
            sql += `    ${this.escapeString(submission.id)},\n`;
            sql += `    ${this.escapeString(transformedData.form.id)},\n`;
            sql += `    ${this.escapeString(submission.status)},\n`;
            sql += `    ${this.escapeString(submission.respondentEmail)},\n`;
            sql += `    ${this.escapeString(JSON.stringify(submission.metadata))},\n`;
            sql += `    ${this.escapeTimestamp(submission.submittedAt)}\n`;
            sql += `);\n`;

            if (index < transformedData.submissions.length - 1) {
                sql += `\n`;
            }
        });

        return sql;
    }

    /**
     * Generate responses insert
     */
    generateResponsesInsert(transformedData, options) {
        let sql = `-- Insert responses\n\n`;

        transformedData.submissions.forEach(submission => {
            Object.keys(submission.responses).forEach(questionName => {
                const question = transformedData.form.questions.find(q => q.name === questionName);
                if (!question) return;

                const responseValue = submission.responses[questionName];
                const score = this.calculateScore(responseValue, question);

                sql += `INSERT INTO exported_responses (submission_id, question_name, question_title, question_type, response_value, response_score, created_at) VALUES (\n`;
                sql += `    ${this.escapeString(submission.id)},\n`;
                sql += `    ${this.escapeString(questionName)},\n`;
                sql += `    ${this.escapeString(question.title)},\n`;
                sql += `    ${this.escapeString(question.type)},\n`;
                sql += `    ${this.escapeString(this.formatResponseValue(responseValue))},\n`;
                sql += `    ${score !== null ? score : 'NULL'},\n`;
                sql += `    ${this.escapeTimestamp(submission.submittedAt)}\n`;
                sql += `);\n`;
            });
        });

        return sql;
    }

    /**
     * Calculate score for response
     */
    calculateScore(responseValue, question) {
        if (question.type === 'rating' && !isNaN(responseValue)) {
            return Number(responseValue);
        }

        if (question.type === 'radiogroup' || question.type === 'dropdown') {
            const index = question.choices.findIndex(c => {
                const choiceValue = typeof c === 'object' ? c.value : c;
                return choiceValue === responseValue;
            });
            return index >= 0 ? index + 1 : null;
        }

        if (question.type === 'checkbox' && typeof responseValue === 'object') {
            // Count selected items
            const selectedCount = Object.values(responseValue).filter(v => v === 1 || v === '1').length;
            return selectedCount;
        }

        return null;
    }

    /**
     * Format response value for SQL
     */
    formatResponseValue(value) {
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return String(value);
    }

    /**
     * Escape string for SQL
     */
    escapeString(str) {
        if (str === null || str === undefined) {
            return 'NULL';
        }

        const escaped = String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "''")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');

        return `'${escaped}'`;
    }

    /**
     * Escape timestamp for SQL
     */
    escapeTimestamp(timestamp) {
        if (!timestamp) {
            return 'CURRENT_TIMESTAMP';
        }

        const date = new Date(timestamp);
        const formatted = date.toISOString().replace('T', ' ').replace('Z', '');
        return `'${formatted}'`;
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

module.exports = SQLExporter;
