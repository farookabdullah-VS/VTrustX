const express = require('express');
const router = express.Router();
const PostgresRepository = require('../../infrastructure/database/PostgresRepository');

const providerRepo = new PostgresRepository('ai_providers');

// Get all providers
router.get('/', async (req, res) => {
    try {
        const providers = await providerRepo.findAll();
        // Map DB snake_case to Client camelCase and mask key
        const safeProviders = providers.map(p => ({
            id: p.id,
            name: p.name,
            provider: p.provider,
            apiKey: p.api_key ? '********' : '',
            isActive: p.is_active,
            createdAt: p.created_at
        }));
        res.json(safeProviders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get active provider
router.get('/active', async (req, res) => {
    try {
        const providers = await providerRepo.findAll();
        const active = providers.find(p => p.is_active);
        if (!active) return res.status(404).json({ message: 'No active provider' });

        res.json({
            id: active.id,
            name: active.name,
            provider: active.provider,
            apiKey: '********',
            isActive: active.is_active,
            createdAt: active.created_at
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create provider
router.post('/', async (req, res) => {
    try {
        const { name, provider, apiKey } = req.body;

        // validation
        if (!name || !provider || !apiKey) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        // Map to DB snake_case
        // Let DB handle 'id' (SERIAL) and 'created_at' (DEFAULT)
        const newConfig = {
            name,
            provider,
            api_key: apiKey,
            is_active: false
        };

        const saved = await providerRepo.create(newConfig);
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete provider
router.delete('/:id', async (req, res) => {
    try {
        await providerRepo.delete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set Active Provider
router.post('/:id/activate', async (req, res) => {
    try {
        const providers = await providerRepo.findAll();

        // Deactivate all
        for (const p of providers) {
            if (p.is_active) {
                // Determine update keys. PostgresRepository.update takes an object and maps keys.
                // We need to pass snake_case keys.
                await providerRepo.update(p.id, { is_active: false });
            }
        }

        // Activate target
        // We can just update directly by ID without fetching if we trust the ID, 
        // but fetching first validates existence.
        const target = await providerRepo.findById(req.params.id);
        if (!target) return res.status(404).json({ error: 'Provider not found' });

        const updated = await providerRepo.update(target.id, { is_active: true });

        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
