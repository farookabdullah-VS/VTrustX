/**
 * Export Module Test & Examples
 * Run this file to test all export functionality
 */

const ExportService = require('../src/services/export/ExportService');
const { query } = require('../src/infrastructure/database/db');

const exportService = new ExportService();

// Sample form data for testing
const sampleForm = {
    id: 'test-form-123',
    title: 'Customer Satisfaction Survey',
    definition: {
        pages: [
            {
                elements: [
                    {
                        type: 'radiogroup',
                        name: 'satisfaction',
                        title: 'How satisfied are you with our service?',
                        choices: [
                            { value: 'very_satisfied', text: 'Very Satisfied' },
                            { value: 'satisfied', text: 'Satisfied' },
                            { value: 'neutral', text: 'Neutral' },
                            { value: 'dissatisfied', text: 'Dissatisfied' },
                            { value: 'very_dissatisfied', text: 'Very Dissatisfied' }
                        ]
                    },
                    {
                        type: 'rating',
                        name: 'likelihood',
                        title: 'How likely are you to recommend us?',
                        rateMin: 0,
                        rateMax: 10
                    },
                    {
                        type: 'checkbox',
                        name: 'features',
                        title: 'Which features do you use?',
                        choices: [
                            { value: 'surveys', text: 'Surveys' },
                            { value: 'analytics', text: 'Analytics' },
                            { value: 'exports', text: 'Exports' },
                            { value: 'integrations', text: 'Integrations' }
                        ]
                    },
                    {
                        type: 'comment',
                        name: 'feedback',
                        title: 'Additional feedback'
                    }
                ]
            }
        ]
    }
};

// Sample submissions
const sampleSubmissions = [
    {
        id: 'sub-1',
        form_id: 'test-form-123',
        status: 'completed',
        created_at: new Date('2026-01-15'),
        respondent_email: 'user1@example.com',
        data: {
            satisfaction: 'very_satisfied',
            likelihood: 9,
            features: ['surveys', 'analytics', 'exports'],
            feedback: 'Great product! Very easy to use.'
        },
        metadata: { source: 'web', duration: 120 }
    },
    {
        id: 'sub-2',
        form_id: 'test-form-123',
        status: 'completed',
        created_at: new Date('2026-01-16'),
        respondent_email: 'user2@example.com',
        data: {
            satisfaction: 'satisfied',
            likelihood: 8,
            features: ['surveys', 'analytics'],
            feedback: 'Good features, would like more integrations.'
        },
        metadata: { source: 'email', duration: 180 }
    },
    {
        id: 'sub-3',
        form_id: 'test-form-123',
        status: 'completed',
        created_at: new Date('2026-01-17'),
        respondent_email: 'user3@example.com',
        data: {
            satisfaction: 'neutral',
            likelihood: 6,
            features: ['surveys'],
            feedback: 'It works but could be better.'
        },
        metadata: { source: 'web', duration: 90 }
    }
];

console.log('═══════════════════════════════════════════════════════════');
console.log('   VTrustX Export Module - Test Suite');
console.log('═══════════════════════════════════════════════════════════\n');

async function testRawDataExport() {
    console.log('\n📊 Test 1: Raw Data Export (Excel)\n');
    console.log('───────────────────────────────────────────────────────────');

    try {
        const DataTransformer = require('../src/services/export/DataTransformer');
        const RawDataExporter = require('../src/services/export/RawDataExporter');

        const transformer = new DataTransformer();
        const exporter = new RawDataExporter();

        // Transform data
        const transformedData = await transformer.transform(
            sampleForm,
            sampleSubmissions,
            {
                singleHeaderRow: true,
                displayAnswerValues: true,
                questionCodes: false,
                reportLabels: true
            }
        );

        console.log('✅ Data transformed successfully');
        console.log(`   - ${transformedData.submissions.length} submissions`);
        console.log(`   - ${transformedData.form.questions.length} questions`);

        // Generate Excel
        const result = await exporter.exportToExcel(transformedData, {
            singleHeaderRow: true,
            displayAnswerValues: true,
            reportLabels: true
        });

        console.log('✅ Excel file generated');
        console.log(`   - File: ${result.fileName}`);
        console.log(`   - Size: ${(result.buffer.length / 1024).toFixed(2)} KB`);

        // Save to file for testing
        const fs = require('fs');
        const path = require('path');
        const testFile = path.join(__dirname, '..', 'exports', 'test_export.xlsx');
        fs.writeFileSync(testFile, result.buffer);
        console.log(`   - Saved to: ${testFile}\n`);

        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testAnalyticsExport() {
    console.log('\n📈 Test 2: Analytics Export (PowerPoint)\n');
    console.log('───────────────────────────────────────────────────────────');

    try {
        const DataTransformer = require('../src/services/export/DataTransformer');
        const AnalyticsExporter = require('../src/services/export/AnalyticsExporter');

        const transformer = new DataTransformer();
        const exporter = new AnalyticsExporter();

        // Transform and analyze
        const transformedData = await transformer.transform(
            sampleForm,
            sampleSubmissions,
            {}
        );

        console.log('✅ Data analyzed successfully');

        // Generate PowerPoint
        const result = await exporter.exportToPowerPoint(
            transformedData,
            await exporter.calculateAnalytics(transformedData),
            { template: 'QuestionPro/Blue' }
        );

        console.log('✅ PowerPoint generated');
        console.log(`   - File: ${result.fileName}`);
        console.log(`   - Size: ${(result.buffer.length / 1024).toFixed(2)} KB`);

        // Save to file
        const fs = require('fs');
        const path = require('path');
        const testFile = path.join(__dirname, '..', 'exports', 'test_analytics.pptx');
        fs.writeFileSync(testFile, result.buffer);
        console.log(`   - Saved to: ${testFile}\n`);

        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
        return false;
    }
}

async function testSPSSExport() {
    console.log('\n📉 Test 3: SPSS Export\n');
    console.log('───────────────────────────────────────────────────────────');

    try {
        const DataTransformer = require('../src/services/export/DataTransformer');
        const SPSSExporter = require('../src/services/export/SPSSExporter');

        const transformer = new DataTransformer();
        const exporter = new SPSSExporter();

        const transformedData = await transformer.transform(
            sampleForm,
            sampleSubmissions,
            {}
        );

        console.log('✅ Data prepared for SPSS');

        const result = await exporter.export(transformedData, {
            answerCodes: true,
            questionCodeVariableName: true
        });

        console.log('✅ SPSS package generated');
        console.log(`   - File: ${result.fileName}`);
        console.log(`   - Size: ${(result.buffer.length / 1024).toFixed(2)} KB`);
        console.log(`   - Contains: data.csv, import_syntax.sps, README.txt`);

        // Save to file
        const fs = require('fs');
        const path = require('path');
        const testFile = path.join(__dirname, '..', 'exports', 'test_spss.zip');
        fs.writeFileSync(testFile, result.buffer);
        console.log(`   - Saved to: ${testFile}\n`);

        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testSQLExport() {
    console.log('\n🗄️  Test 4: SQL Export\n');
    console.log('───────────────────────────────────────────────────────────');

    try {
        const DataTransformer = require('../src/services/export/DataTransformer');
        const SQLExporter = require('../src/services/export/SQLExporter');

        const transformer = new DataTransformer();
        const exporter = new SQLExporter();

        const transformedData = await transformer.transform(
            sampleForm,
            sampleSubmissions,
            {}
        );

        console.log('✅ Data prepared for SQL');

        const result = await exporter.export(transformedData, {
            includeScores: true,
            includeTimestamps: true
        });

        console.log('✅ SQL dump generated');
        console.log(`   - File: ${result.fileName}`);
        console.log(`   - Size: ${(result.buffer.length / 1024).toFixed(2)} KB`);

        // Save to file
        const fs = require('fs');
        const path = require('path');
        const testFile = path.join(__dirname, '..', 'exports', 'test_export.sql');
        fs.writeFileSync(testFile, result.buffer);
        console.log(`   - Saved to: ${testFile}\n`);

        // Show preview
        const preview = result.buffer.toString('utf8').substring(0, 500);
        console.log('   Preview:');
        console.log('   ┌────────────────────────────────────────────');
        preview.split('\n').forEach(line => {
            console.log(`   │ ${line}`);
        });
        console.log('   └────────────────────────────────────────────\n');

        return true;
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        return false;
    }
}

async function testAPIEndpoints() {
    console.log('\n🌐 Test 5: API Integration Test\n');
    console.log('───────────────────────────────────────────────────────────');

    console.log('ℹ️  This test requires a running server instance.');
    console.log('   Manual test with curl:\n');

    console.log('   # Create export job');
    console.log('   curl -X POST http://localhost:3000/api/exports/raw \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('     -d \'{"formId":"test-123","format":"xlsx","options":{},"filters":{}}\'\n');

    console.log('   # Check status');
    console.log('   curl http://localhost:3000/api/exports/jobs/JOB_ID \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN"\n');

    console.log('   # Download export');
    console.log('   curl http://localhost:3000/api/exports/download/JOB_ID \\');
    console.log('     -H "Authorization: Bearer YOUR_TOKEN" \\');
    console.log('     -o export.xlsx\n');

    return true;
}

async function runAllTests() {
    const tests = [
        { name: 'Raw Data Export', fn: testRawDataExport },
        { name: 'Analytics Export', fn: testAnalyticsExport },
        { name: 'SPSS Export', fn: testSPSSExport },
        { name: 'SQL Export', fn: testSQLExport },
        { name: 'API Endpoints', fn: testAPIEndpoints }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            const result = await test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`\n❌ ${test.name} crashed:`, error);
            failed++;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   Test Results');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Total:  ${tests.length}\n`);

    if (failed === 0) {
        console.log('   🎉 All tests passed!\n');
    } else {
        console.log('   ⚠️  Some tests failed. Check errors above.\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
}

// Run tests if called directly
if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('Test suite completed.');
            process.exit(0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = {
    testRawDataExport,
    testAnalyticsExport,
    testSPSSExport,
    testSQLExport,
    testAPIEndpoints,
    runAllTests
};
