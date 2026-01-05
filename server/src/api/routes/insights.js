const express = require('express'); // Fixed: require express properly
const router = require('express').Router();
// Mock persistence for now
const insightsMock = []; // In-mem storage

router.get('/', (req, res) => {
    // Return all insights (filter by submissionId if needed)
    res.json(insightsMock);
});

// Endpoint for AI Service to callback/store insights
router.post('/', (req, res) => {
    const insight = req.body;
    insightsMock.push(insight);
    console.log("Stored new insight:", insight);
    res.status(201).json({ status: 'stored' });
});

module.exports = router;
