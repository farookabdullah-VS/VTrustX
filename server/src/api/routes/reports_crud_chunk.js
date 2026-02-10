const PostgresRepository = require('../../infrastructure/database/PostgresRepository');
const { query } = require('../../infrastructure/database/db');

// --- REPORT DEFINITION CRUD ---
const reportRepo = new PostgresRepository('reports');

// Get all reports for tenant
router.get('/', authenticate, async (req, res) => {
    try {
        // If PowerBI param exists, ignore this route (handled below) or use separate path? 
        // NOTE: The previous code had `router.get('/', ...)` that conflicted? 
        // Checking previous view_file... previous `reports.js` had `router.get('/crm-stats'...)` but NO `router.get('/')`.
        // It had `router.get('/powerbi'...)`.
        // So `GET /` is free to use for listing reports.

        const rows = await reportRepo.findAllBy('tenant_id', req.user.tenant_id);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new report
router.post('/', authenticate, async (req, res) => {
    try {
        const newReport = {
            tenant_id: req.user.tenant_id,
            title: req.body.title || 'Untitled Report',
            description: req.body.description,
            survey_id: req.body.surveyId,
            layout: req.body.layout || [],
            widgets: req.body.widgets || {},
            theme: req.body.theme || {}, // Logo, colors
            created_at: new Date(),
            updated_at: new Date()
        };
        const saved = await reportRepo.create(newReport);
        res.status(201).json(saved);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update report
router.put('/:id', authenticate, async (req, res) => {
    try {
        const existing = await reportRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Report not found' });

        const updateData = {
            title: req.body.title,
            description: req.body.description,
            layout: req.body.layout,
            widgets: req.body.widgets,
            theme: req.body.theme,
            updated_at: new Date()
        };
        const updated = await reportRepo.update(req.params.id, updateData);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete report
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const existing = await reportRepo.findById(req.params.id);
        if (!existing || existing.tenant_id !== req.user.tenant_id) return res.status(404).json({ error: 'Report not found' });

        await reportRepo.delete(req.params.id);
        res.json({ message: 'Report deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
