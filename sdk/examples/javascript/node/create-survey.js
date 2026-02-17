import { VTrustXClient } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example: Create a survey programmatically
 */
async function createSurvey() {
  const client = new VTrustXClient(process.env.API_URL || 'http://localhost:3000/api');

  try {
    // Login
    console.log('🔐 Logging in...');
    await client.login(
      process.env.EMAIL || 'admin@vtrustx.com',
      process.env.PASSWORD || 'admin123'
    );
    console.log('✅ Logged in successfully\n');

    // Create survey
    console.log('📋 Creating survey...');

    const surveyDefinition = {
      title: 'Customer Satisfaction Survey',
      slug: `csat-${Date.now()}`,
      definition: {
        title: 'Customer Satisfaction Survey',
        description: 'Help us improve our service',
        pages: [
          {
            name: 'page1',
            elements: [
              {
                type: 'rating',
                name: 'satisfaction',
                title: 'How satisfied are you with our service?',
                isRequired: true,
                rateMin: 1,
                rateMax: 5,
                minRateDescription: 'Very Unsatisfied',
                maxRateDescription: 'Very Satisfied'
              },
              {
                type: 'comment',
                name: 'feedback',
                title: 'Please provide additional feedback',
                isRequired: false
              },
              {
                type: 'radiogroup',
                name: 'recommend',
                title: 'Would you recommend us to others?',
                isRequired: true,
                choices: ['Yes', 'No', 'Maybe']
              }
            ]
          }
        ],
        showProgressBar: 'top',
        showQuestionNumbers: 'off',
        completedHtml: '<h3>Thank you for your feedback!</h3>'
      },
      isPublished: false
    };

    const survey = await client.createForm(surveyDefinition);
    console.log('✅ Survey created successfully!');
    console.log(`   ID: ${survey.id}`);
    console.log(`   Slug: ${survey.slug}`);
    console.log(`   URL: ${process.env.APP_URL || 'http://localhost:3000'}/s/${survey.slug}\n`);

    // Publish survey
    console.log('🚀 Publishing survey...');
    await client.publishForm(survey.id);
    console.log('✅ Survey published!\n');

    console.log('✨ Survey is now live and ready to collect responses!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
createSurvey();
