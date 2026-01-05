const express = require('express');
const router = express.Router();
const axios = require('axios');
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');

const contactRepo = new PostgresRepository('contacts');
const formRepo = new PostgresRepository('forms');

router.post('/initiate', async (req, res) => {
    try {
        const { contactId, surveyId } = req.body;

        if (!contactId || !surveyId) {
            return res.status(400).json({ error: "Contact ID and Survey ID are required" });
        }

        // 1. Fetch Contact
        const contact = await contactRepo.findById(contactId);
        if (!contact) return res.status(404).json({ error: 'Contact not found' });

        if (!contact.mobile) {
            return res.status(400).json({ error: 'Contact does not have a mobile number' });
        }

        // 2. Fetch Survey
        const survey = await formRepo.findById(surveyId);
        if (!survey) return res.status(404).json({ error: 'Survey not found' });

        // 3. Prepare AI Service Payload
        const payload = {
            contact: {
                phone: contact.mobile,
                name: contact.name
            },
            surveyId: survey.id,
            surveyDefinition: survey.definition,
            systemContext: `You are conducting a survey named "${survey.title}". Be polite and professional. Ask questions one by one.`
        };

        // 4. Call AI Service
        // We assume AI Service is running locally on 3001 or configured URL
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3001';

        console.log(`[Call Manager] Initiating call to ${contact.name} (${contact.mobile}) for survey ${survey.title}`);

        const response = await axios.post(`${aiServiceUrl}/voice/call`, payload);

        res.json({
            success: true,
            message: "Call initiated via AI Agent",
            serviceResponse: response.data
        });

    } catch (err) {
        console.error("Initiate Call Logic Error:", err.message);
        const errorMsg = err.response?.data?.error || err.message;
        res.status(500).json({ error: errorMsg });
    }
});

module.exports = router;
