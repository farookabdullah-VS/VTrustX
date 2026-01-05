const express = require('express');
const router = express.Router();
const personaEngine = require('../../core/PersonaCalculationEngine');

const authenticate = require('../middleware/auth');

// POST /v1/persona/decide (or /decide if mounted at /v1/persona)
router.post('/decide', authenticate, async (req, res) => {
    try {
        const context = {
            tenantId: req.user.tenant_id,
            userId: req.user.id
        };
        const result = await personaEngine.decide(req.body, context);
        res.json(result);
    } catch (err) {
        console.error('Persona Decision Error:', err);
        res.status(500).json({
            error: 'Internal Server Error',
            message: err.message,
            request_id: req.body.request_id
        });
    }
});

// POST /v1/persona/validate
router.post('/validate', (req, res) => {
    try {
        const result = personaEngine.validate(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /v1/persona/feedback
router.post('/feedback', async (req, res) => {
    try {
        const result = await personaEngine.feedback(req.body);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
