const express = require('express');
const router = express.Router();
const { query } = require('../../../infrastructure/database/db');
const logger = require('../../../infrastructure/logger');
// We would typically use a dedicated scraper service or 3rd party API here.
// For MVP, we will simulate the scraping/API connection.

// 1. Get Connected Sources
router.get('/sources', async (req, res) => {
    try {
        // Mock Sources
        res.json([
            { id: 1, platform: 'Google Maps', name: 'Downtown Branch', last_sync: new Date(), review_count: 1240, avg_rating: 4.2 },
            { id: 2, platform: 'Trustpilot', name: 'RayiX Corporate', last_sync: new Date(), review_count: 450, avg_rating: 3.8 }
        ]);
    } catch (err) {
        logger.error('Failed to fetch reputation sources', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch reputation sources' });
    }
});

// 2. Get Reviews (with AI Analysis)
router.get('/reviews', async (req, res) => {
    try {
        // Mock Reviews with AI Sentiment
        // In real impl, we query a 'reviews' table where we stored scraped data
        const mockReviews = [
            {
                id: 101, source: 'Google Maps', author: 'Jane Doe', rating: 5, date: '2026-01-26',
                content: "Absolutely love the new dashboard features! Makes my life so much easier.",
                sentiment: 'Positive', sentiment_score: 0.95,
                tags: ['Product', 'UX']
            },
            {
                id: 102, source: 'Trustpilot', author: 'Mark Smith', rating: 2, date: '2026-01-25',
                content: "Customer support took 3 days to reply. Unacceptable wait times.",
                sentiment: 'Negative', sentiment_score: -0.8,
                tags: ['Support', 'Wait Time']
            },
            {
                id: 103, source: 'Google Maps', author: 'Alex R.', rating: 4, date: '2026-01-24',
                content: "Great tool, but a bit expensive for small teams.",
                sentiment: 'Neutral', sentiment_score: 0.1,
                tags: ['Pricing', 'Value']
            }
        ];
        res.json(mockReviews);
    } catch (err) {
        logger.error('Failed to fetch reviews', { error: err.message });
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});

// 3. Generate AI Reply
router.post('/generate-reply', async (req, res) => {
    const { reviewContent, rating, author } = req.body;

    // Simulate AI Gen (In real app, call OpenAI/Gemini)
    let reply = "";
    if (rating >= 8) {
        reply = `Hi ${author}, thank you so much for the ${rating}-star review! We're thrilled to hear you had a great experience. We look forward to seeing you again soon!`;
    } else {
        reply = `Hi ${author}, we're sorry to hear about your experience. We take feedback like this seriously. Could you please reach out to us at support@rayix.com so we can make this right?`;
    }

    // Add slight AI "flavor" delay
    setTimeout(() => {
        res.json({ reply });
    }, 1000);
});

// 4. Competitive Benchmarking
router.get('/benchmarks', async (req, res) => {
    // Mock Competitor Data
    res.json([
        { name: 'Your Business', score: 4.2, trend: 0.1 },
        { name: 'Competitor A (Across Street)', score: 4.5, trend: 0.2 },
        { name: 'Competitor B (Downtown)', score: 3.8, trend: -0.1 }
    ]);
});

// 5. Trigger Sync (Scrape) & Auto-Ticket Check
router.post('/sync', async (req, res) => {
    // Determine source
    const { sourceId } = req.body;
    logger.info('Syncing reputation source', { sourceId });

    // Simulation delay
    setTimeout(async () => {
        logger.info('Reputation sync complete', { sourceId });

        // SIMULATE NEW NEGATIVE REVIEW
        const newReview = { rating: 1, content: "Terrible service today!", source: 'Google' };

        if (newReview.rating <= 2) {
            const { query } = require('../../../infrastructure/database/db'); // lazy load
            // Auto-Create Ticket
            const code = 'TCK-' + Math.floor(100000 + Math.random() * 900000);
            try {
                await query(`INSERT INTO tickets (ticket_code, subject, description, priority, status, channel, created_at, tenant_id)
                              VALUES ($1, $2, $3, 'high', 'new', 'review', NOW(), 'default')`,
                    [code, `Negative Review Alert: ${newReview.source}`, newReview.content]);
                logger.info('Auto-ticket created for negative review', { ticketCode: code });
            } catch (e) {
                logger.error('Failed to create auto ticket', { error: e.message });
            }
        }

    }, 2000);

    res.json({ status: 'Sync Started' });
});

module.exports = router;
