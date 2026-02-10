/**
 * AnalyticsExporter - Exports charts and analytics to PowerPoint and Word
 */

const PptxGenJS = require('pptxgenjs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType } = require('docx');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const ExcelJS = require('exceljs');

class AnalyticsExporter {
    constructor() {
        this.chartRenderer = new ChartJSNodeCanvas({ width: 800, height: 600 });
    }

    /**
     * Export analytics in specified format
     */
    async export(transformedData, format, options) {
        // Calculate statistics
        const analytics = await this.calculateAnalytics(transformedData);

        if (format === 'pptx' || format === 'ppt') {
            return await this.exportToPowerPoint(transformedData, analytics, options);
        } else if (format === 'docx') {
            return await this.exportToWord(transformedData, analytics, options);
        } else if (format === 'xlsx') {
            return await this.exportAnalyticsToExcel(transformedData, analytics, options);
        } else if (format === 'pdf') {
            return await this.exportToPdf(transformedData, analytics, options);
        } else {
            throw new Error(`Unsupported format: ${format}`);
        }
    }

    /**
     * Calculate analytics and statistics
     */
    async calculateAnalytics(transformedData) {
        const analytics = {
            summary: {
                totalResponses: transformedData.submissions.length,
                completedResponses: transformedData.submissions.filter(s => s.status === 'completed').length,
                partialResponses: transformedData.submissions.filter(s => s.status === 'partial').length,
                averageCompletionTime: this.calculateAverageCompletionTime(transformedData.submissions)
            },
            questions: []
        };

        // Calculate statistics for each question
        for (const question of transformedData.form.questions) {
            const questionAnalytics = await this.analyzeQuestion(question, transformedData.submissions);
            analytics.questions.push(questionAnalytics);
        }

        return analytics;
    }

    /**
     * Analyze individual question
     */
    async analyzeQuestion(question, submissions) {
        const responses = submissions
            .map(s => s.responses[question.name])
            .filter(r => r !== undefined && r !== null && r !== '');

        const analytics = {
            name: question.name,
            title: question.title,
            type: question.type,
            totalResponses: responses.length,
            responseRate: (responses.length / submissions.length * 100).toFixed(2) + '%'
        };

        // Type-specific analytics
        if (question.type === 'radiogroup' || question.type === 'dropdown') {
            analytics.distribution = this.calculateDistribution(responses, question.choices);
            analytics.chartType = 'pie';
        } else if (question.type === 'checkbox') {
            analytics.distribution = this.calculateCheckboxDistribution(responses, question.choices);
            analytics.chartType = 'bar';
        } else if (question.type === 'rating') {
            analytics.distribution = this.calculateDistribution(responses);
            analytics.average = this.calculateAverage(responses);
            analytics.chartType = 'bar';
        } else if (question.type === 'text' || question.type === 'comment') {
            analytics.responses = responses.slice(0, 100); // Limit to first 100
            analytics.chartType = 'none';
        } else if (question.type === 'matrix') {
            analytics.matrixDistribution = this.calculateMatrixDistribution(responses, question);
            analytics.chartType = 'matrix';
        }

        // Generate chart image
        if (analytics.chartType !== 'none') {
            analytics.chartImage = await this.generateChart(analytics);
        }

        return analytics;
    }

    /**
     * Calculate distribution for single-choice questions
     */
    calculateDistribution(responses, choices = null) {
        const distribution = {};

        responses.forEach(response => {
            const value = typeof response === 'object' ? JSON.stringify(response) : response;
            distribution[value] = (distribution[value] || 0) + 1;
        });

        // Calculate percentages
        const total = responses.length;
        const result = Object.keys(distribution).map(key => ({
            label: key,
            count: distribution[key],
            percentage: (distribution[key] / total * 100).toFixed(2)
        }));

        return result.sort((a, b) => b.count - a.count);
    }

    /**
     * Calculate distribution for checkbox questions
     */
    calculateCheckboxDistribution(responses, choices) {
        const distribution = {};

        // Initialize with all choices
        choices.forEach(choice => {
            const choiceValue = typeof choice === 'object' ? choice.value : choice;
            distribution[choiceValue] = 0;
        });

        // Count selections
        responses.forEach(response => {
            if (Array.isArray(response)) {
                response.forEach(value => {
                    distribution[value] = (distribution[value] || 0) + 1;
                });
            } else if (typeof response === 'object') {
                Object.keys(response).forEach(key => {
                    if (response[key] === 1 || response[key] === '1') {
                        distribution[key] = (distribution[key] || 0) + 1;
                    }
                });
            }
        });

        const total = responses.length;
        return Object.keys(distribution).map(key => ({
            label: key,
            count: distribution[key],
            percentage: (distribution[key] / total * 100).toFixed(2)
        }));
    }

    /**
     * Calculate matrix distribution
     */
    calculateMatrixDistribution(responses, question) {
        const distribution = {};

        question.rows.forEach(row => {
            const rowValue = typeof row === 'object' ? row.value : row;
            distribution[rowValue] = {};

            question.columns.forEach(col => {
                const colValue = typeof col === 'object' ? col.value : col;
                distribution[rowValue][colValue] = 0;
            });
        });

        responses.forEach(response => {
            if (typeof response === 'object') {
                Object.keys(response).forEach(rowKey => {
                    const colValue = response[rowKey];
                    if (distribution[rowKey] && distribution[rowKey][colValue] !== undefined) {
                        distribution[rowKey][colValue]++;
                    }
                });
            }
        });

        return distribution;
    }

    /**
     * Calculate average for numeric responses
     */
    calculateAverage(responses) {
        const numericResponses = responses.filter(r => !isNaN(r)).map(r => Number(r));
        if (numericResponses.length === 0) return 0;

        const sum = numericResponses.reduce((a, b) => a + b, 0);
        return (sum / numericResponses.length).toFixed(2);
    }

    /**
     * Calculate average completion time
     */
    calculateAverageCompletionTime(submissions) {
        // This would require start/end timestamps in submissions
        return 'N/A';
    }

    /**
     * Generate chart image
     */
    async generateChart(analytics) {
        let chartConfig;

        if (analytics.chartType === 'pie') {
            chartConfig = {
                type: 'pie',
                data: {
                    labels: analytics.distribution.map(d => d.label),
                    datasets: [{
                        data: analytics.distribution.map(d => d.count),
                        backgroundColor: this.getColorPalette(analytics.distribution.length)
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'right' },
                        title: { display: true, text: analytics.title }
                    }
                }
            };
        } else if (analytics.chartType === 'bar') {
            chartConfig = {
                type: 'bar',
                data: {
                    labels: analytics.distribution.map(d => d.label),
                    datasets: [{
                        label: 'Responses',
                        data: analytics.distribution.map(d => d.count),
                        backgroundColor: '#4472C4'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: analytics.title }
                    },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            };
        }

        if (chartConfig) {
            const imageBuffer = await this.chartRenderer.renderToBuffer(chartConfig);
            return imageBuffer.toString('base64');
        }

        return null;
    }

    /**
     * Get color palette
     */
    getColorPalette(count) {
        const colors = [
            '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5',
            '#70AD47', '#264478', '#9E480E', '#636363', '#997300'
        ];

        const palette = [];
        for (let i = 0; i < count; i++) {
            palette.push(colors[i % colors.length]);
        }
        return palette;
    }

    /**
     * Export to PowerPoint
     */
    async exportToPowerPoint(transformedData, analytics, options) {
        const pptx = new PptxGenJS();

        // Apply template
        this.applyPowerPointTemplate(pptx, options.template);

        // Title slide
        const titleSlide = pptx.addSlide();
        titleSlide.addText(transformedData.form.title, {
            x: 0.5, y: 1.5, w: 9, h: 1,
            fontSize: 44, bold: true, color: '363636', align: 'center'
        });
        titleSlide.addText(`Survey Results Report`, {
            x: 0.5, y: 2.5, w: 9, h: 0.5,
            fontSize: 24, color: '666666', align: 'center'
        });
        titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, {
            x: 0.5, y: 3.5, w: 9, h: 0.3,
            fontSize: 14, color: '999999', align: 'center'
        });

        // Summary slide
        const summarySlide = pptx.addSlide();
        summarySlide.addText('Response Summary', {
            x: 0.5, y: 0.5, w: 9, h: 0.5,
            fontSize: 32, bold: true, color: '363636'
        });

        const summaryData = [
            ['Metric', 'Value'],
            ['Total Responses', analytics.summary.totalResponses.toString()],
            ['Completed', analytics.summary.completedResponses.toString()],
            ['Partial', analytics.summary.partialResponses.toString()],
            ['Response Rate', ((analytics.summary.completedResponses / analytics.summary.totalResponses * 100).toFixed(2) + '%')]
        ];

        summarySlide.addTable(summaryData, {
            x: 1.5, y: 1.5, w: 7, h: 3,
            fontSize: 18,
            border: { pt: 1, color: 'CFCFCF' },
            fill: { color: 'F7F7F7' }
        });

        // Question slides
        for (const questionAnalytics of analytics.questions) {
            if (questionAnalytics.chartType !== 'none') {
                const slide = pptx.addSlide();

                slide.addText(questionAnalytics.title, {
                    x: 0.5, y: 0.3, w: 9, h: 0.5,
                    fontSize: 24, bold: true, color: '363636'
                });

                slide.addText(`Response Rate: ${questionAnalytics.responseRate} (${questionAnalytics.totalResponses} responses)`, {
                    x: 0.5, y: 0.8, w: 9, h: 0.3,
                    fontSize: 14, color: '666666'
                });

                if (questionAnalytics.chartImage) {
                    slide.addImage({
                        data: `data:image/png;base64,${questionAnalytics.chartImage}`,
                        x: 1, y: 1.5, w: 8, h: 4.5
                    });
                }
            }
        }

        // Generate buffer
        const buffer = await pptx.write({ outputType: 'nodebuffer' });

        return {
            buffer,
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_analytics_${this.getDateString()}.pptx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        };
    }

    /**
     * Apply PowerPoint template
     */
    applyPowerPointTemplate(pptx, template) {
        // Template configurations
        const templates = {
            'QuestionPro/Blue': { theme: 'blue', layout: 'standard' },
            'Microsoft/Blends': { theme: 'blends', layout: 'modern' }
        };

        // Apply template settings (simplified)
        pptx.layout = 'LAYOUT_WIDE';
        pptx.author = 'VTrustX';
        pptx.company = 'VTrustX';
        pptx.subject = 'Survey Analytics Report';
    }

    /**
     * Export to Word
     */
    async exportToWord(transformedData, analytics, options) {
        const sections = [];

        // Title
        sections.push(
            new Paragraph({
                text: transformedData.form.title,
                heading: 'Heading1',
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                text: 'Survey Results Report',
                heading: 'Heading2',
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({
                text: `Generated: ${new Date().toLocaleDateString()}`,
                alignment: AlignmentType.CENTER
            }),
            new Paragraph({ text: '' })
        );

        // Summary
        sections.push(
            new Paragraph({ text: 'Response Summary', heading: 'Heading2' }),
            new Paragraph({ text: `Total Responses: ${analytics.summary.totalResponses}` }),
            new Paragraph({ text: `Completed: ${analytics.summary.completedResponses}` }),
            new Paragraph({ text: `Partial: ${analytics.summary.partialResponses}` }),
            new Paragraph({ text: '' })
        );

        // Question analytics
        for (const questionAnalytics of analytics.questions) {
            sections.push(
                new Paragraph({ text: questionAnalytics.title, heading: 'Heading3' }),
                new Paragraph({ text: `Response Rate: ${questionAnalytics.responseRate}` }),
                new Paragraph({ text: '' })
            );

            if (questionAnalytics.distribution) {
                questionAnalytics.distribution.forEach(item => {
                    sections.push(
                        new Paragraph({ text: `${item.label}: ${item.count} (${item.percentage}%)` })
                    );
                });
            }

            sections.push(new Paragraph({ text: '' }));
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: sections
            }]
        });

        const buffer = await Packer.toBuffer(doc);

        return {
            buffer,
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_analytics_${this.getDateString()}.docx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
    }

    /**
     * Export analytics to Excel
     */
    async exportAnalyticsToExcel(transformedData, analytics, options) {
        const workbook = new ExcelJS.Workbook();

        // Summary sheet
        const summarySheet = workbook.addWorksheet('Summary');
        summarySheet.addRow(['Survey Results Summary']);
        summarySheet.addRow(['Total Responses', analytics.summary.totalResponses]);
        summarySheet.addRow(['Completed', analytics.summary.completedResponses]);
        summarySheet.addRow(['Partial', analytics.summary.partialResponses]);

        // Question analytics sheets
        for (const questionAnalytics of analytics.questions) {
            const sheet = workbook.addWorksheet(this.sanitizeSheetName(questionAnalytics.name));

            sheet.addRow([questionAnalytics.title]);
            sheet.addRow(['Response Rate', questionAnalytics.responseRate]);
            sheet.addRow([]);

            if (questionAnalytics.distribution) {
                sheet.addRow(['Option', 'Count', 'Percentage']);
                questionAnalytics.distribution.forEach(item => {
                    sheet.addRow([item.label, item.count, item.percentage + '%']);
                });
            }
        }

        const buffer = await workbook.xlsx.writeBuffer();

        return {
            buffer,
            fileName: `${this.sanitizeFileName(transformedData.form.title)}_analytics_${this.getDateString()}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        };
    }

    /**
     * Export analytics to PDF
     */
    async exportToPdf(transformedData, analytics, options) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50 });
                const buffers = [];

                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => {
                    const buffer = Buffer.concat(buffers);
                    resolve({
                        buffer,
                        fileName: `${this.sanitizeFileName(transformedData.form.title)}_analytics_${this.getDateString()}.pdf`,
                        mimeType: 'application/pdf'
                    });
                });

                // Title Page
                doc.fontSize(24).text(transformedData.form.title, { align: 'center' });
                doc.moveDown();
                doc.fontSize(16).text('Survey Results Report', { align: 'center', color: '#666666' });
                doc.moveDown();
                doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center', color: '#999999' });
                doc.moveDown(4);

                // Summary Section
                doc.fontSize(18).text('Response Summary', { underline: true });
                doc.moveDown();
                doc.fontSize(12).text(`Total Responses: ${analytics.summary.totalResponses}`);
                doc.text(`Completed: ${analytics.summary.completedResponses}`);
                doc.text(`Partial: ${analytics.summary.partialResponses}`);
                const rate = ((analytics.summary.completedResponses / analytics.summary.totalResponses) * 100).toFixed(2);
                doc.text(`Response Rate: ${isNaN(rate) ? '0' : rate}%`);
                doc.moveDown(2);

                // Questions
                analytics.questions.forEach((q, index) => {
                    // Add new page if close to bottom
                    if (doc.y > 650) doc.addPage();

                    doc.fontSize(14).text(`${index + 1}. ${q.title}`, { underline: true });
                    doc.moveDown(0.5);
                    doc.fontSize(10).text(`Responses: ${q.totalResponses} | Rate: ${q.responseRate}`);

                    if (q.distribution) {
                        doc.moveDown(0.5);
                        q.distribution.forEach(d => {
                            doc.text(`${d.label}: ${d.count} (${d.percentage}%)`, { indent: 20 });
                        });
                    }

                    if (q.chartImage && q.chartType !== 'none') {
                        try {
                            const imgBuffer = Buffer.from(q.chartImage, 'base64');
                            doc.moveDown();
                            // Fit image within page (approx 500 width)
                            doc.image(imgBuffer, { width: 400, align: 'center' });
                            doc.moveDown();
                        } catch (e) {
                            console.error('Error adding chart image', e);
                        }
                    } else if (q.responses && q.responses.length > 0) {
                        // Open ended
                        doc.moveDown();
                        doc.text('Recent Responses:', { bold: true });
                        q.responses.slice(0, 5).forEach(r => doc.text(`- ${r}`, { indent: 10 }));
                    }

                    doc.moveDown(2);
                });

                doc.end();
            } catch (err) {
                console.error("PDF generation error", err);
                reject(err);
            }
        });
    }

    sanitizeFileName(name) {
        return name.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').toLowerCase();
    }

    sanitizeSheetName(name) {
        return name.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '_');
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }
}

module.exports = AnalyticsExporter;
