import { VTrustXClient } from './client.js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

/**
 * Example: Export survey responses to JSON file
 */
async function exportData() {
  const client = new VTrustXClient(process.env.API_URL || 'http://localhost:3000/api');

  try {
    // Login
    console.log('🔐 Logging in...');
    await client.login(
      process.env.EMAIL || 'admin@vtrustx.com',
      process.env.PASSWORD || 'admin123'
    );
    console.log('✅ Logged in\n');

    // Get all surveys
    console.log('📋 Fetching surveys...');
    const surveys = await client.getForms();

    if (surveys.length === 0) {
      console.log('⚠️  No surveys found');
      return;
    }

    console.log(`Found ${surveys.length} surveys\n`);

    // Export each survey's responses
    for (const survey of surveys) {
      console.log(`📊 Exporting: ${survey.title}`);

      const submissions = await client.getSubmissions(survey.id);

      if (submissions.length === 0) {
        console.log(`   ⚠️  No responses yet\n`);
        continue;
      }

      // Create export
      const exportData = {
        survey: {
          id: survey.id,
          title: survey.title,
          slug: survey.slug,
          createdAt: survey.createdAt
        },
        submissionCount: submissions.length,
        submissions: submissions.map(sub => ({
          id: sub.id,
          submittedAt: sub.submittedAt,
          data: sub.data,
          metadata: sub.metadata
        })),
        exportedAt: new Date().toISOString()
      };

      // Save to file
      const filename = `export_${survey.slug}_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));

      console.log(`   ✅ Exported ${submissions.length} responses to ${filename}\n`);
    }

    console.log('✨ Export complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
exportData();
