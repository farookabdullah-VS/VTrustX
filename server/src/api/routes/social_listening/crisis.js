/**
 * Crisis Detection API Routes
 *
 * Advanced AI-powered crisis detection and monitoring
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const CrisisDetector = require('../../../services/ai/CrisisDetector');
const logger = require('../../../infrastructure/logger');

/**
 * @route   GET /api/v1/social-listening/crisis/analyze
 * @desc    Analyze current crisis risk for tenant
 * @access  Private
 */
router.get('/analyze', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { timeWindow, compareWindow } = req.query;

    logger.info('[Crisis API] Analyzing crisis risk', { tenantId });

    const analysis = await CrisisDetector.analyzeCrisisRisk(tenantId, {
      timeWindow: parseInt(timeWindow) || 60,
      compareWindow: parseInt(compareWindow) || 1440
    });

    res.json({
      success: true,
      analysis
    });

  } catch (error) {
    logger.error('[Crisis API] Analysis failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze crisis risk: ' + error.message
    });
  }
});

/**
 * @route   GET /api/v1/social-listening/crisis/history
 * @desc    Get crisis event history
 * @access  Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { days } = req.query;

    const history = await CrisisDetector.getCrisisHistory(
      tenantId,
      parseInt(days) || 30
    );

    res.json({
      success: true,
      count: history.length,
      events: history
    });

  } catch (error) {
    logger.error('[Crisis API] Failed to get history', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get crisis history: ' + error.message
    });
  }
});

/**
 * @route   GET /api/v1/social-listening/crisis/dashboard
 * @desc    Get comprehensive crisis dashboard data
 * @access  Private
 */
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;

    logger.info('[Crisis API] Loading dashboard', { tenantId });

    // Run analysis and get history in parallel
    const [currentAnalysis, recentHistory] = await Promise.all([
      CrisisDetector.analyzeCrisisRisk(tenantId, { timeWindow: 60 }),
      CrisisDetector.getCrisisHistory(tenantId, 7) // Last 7 days
    ]);

    // Calculate summary metrics
    const criticalCount = recentHistory.filter(e => e.crisis_level === 'critical').length;
    const highCount = recentHistory.filter(e => e.crisis_level === 'high').length;
    const avgScore = recentHistory.length > 0
      ? Math.round(recentHistory.reduce((sum, e) => sum + e.severity_score, 0) / recentHistory.length)
      : 0;

    res.json({
      success: true,
      dashboard: {
        currentRisk: currentAnalysis,
        summary: {
          criticalEventsLast7Days: criticalCount,
          highEventsLast7Days: highCount,
          avgSeverityScore: avgScore,
          totalEvents: recentHistory.length
        },
        recentEvents: recentHistory.slice(0, 10),
        trends: {
          riskTrend: currentAnalysis.crisisScore > 60 ? 'increasing' : 'stable',
          comparedToBaseline: currentAnalysis.indicators.volumeAnomaly.percentageChange
        }
      }
    });

  } catch (error) {
    logger.error('[Crisis API] Dashboard load failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard: ' + error.message
    });
  }
});

module.exports = router;
