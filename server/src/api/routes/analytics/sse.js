const express = require('express');
const router = express.Router();
const EventEmitter = require('events');
const authenticate = require('../../middleware/auth');
const logger = require('../../../infrastructure/logger');

/**
 * Server-Sent Events (SSE) for Real-Time Analytics
 *
 * Provides live updates for analytics dashboards without polling.
 * Uses EventEmitter for pub/sub pattern with tenant isolation.
 */

// Global event emitter for analytics updates
const analyticsEmitter = new EventEmitter();

// Increase max listeners to handle many concurrent connections
analyticsEmitter.setMaxListeners(1000);

/**
 * SSE Connection Manager
 * Tracks active connections per tenant for health monitoring
 */
class SSEConnectionManager {
    constructor() {
        this.connections = new Map(); // tenantId -> Set of connection IDs
        this.connectionInfo = new Map(); // connectionId -> { tenantId, res, connectedAt }
    }

    addConnection(tenantId, connectionId, res) {
        if (!this.connections.has(tenantId)) {
            this.connections.set(tenantId, new Set());
        }
        this.connections.get(tenantId).add(connectionId);
        this.connectionInfo.set(connectionId, {
            tenantId,
            res,
            connectedAt: new Date()
        });
    }

    removeConnection(connectionId) {
        const info = this.connectionInfo.get(connectionId);
        if (info) {
            const { tenantId } = info;
            const tenantConnections = this.connections.get(tenantId);
            if (tenantConnections) {
                tenantConnections.delete(connectionId);
                if (tenantConnections.size === 0) {
                    this.connections.delete(tenantId);
                }
            }
            this.connectionInfo.delete(connectionId);
        }
    }

    getConnectionCount(tenantId) {
        return this.connections.get(tenantId)?.size || 0;
    }

    getTotalConnections() {
        return this.connectionInfo.size;
    }

    getStats() {
        const stats = {
            totalConnections: this.getTotalConnections(),
            tenants: []
        };

        for (const [tenantId, connections] of this.connections.entries()) {
            stats.tenants.push({
                tenantId,
                connectionCount: connections.size
            });
        }

        return stats;
    }
}

const connectionManager = new SSEConnectionManager();

/**
 * @swagger
 * /api/analytics/sse/stream:
 *   get:
 *     summary: SSE stream for real-time analytics updates
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stream', authenticate, (req, res) => {
    const tenantId = req.user?.tenant_id;
    const userId = req.user?.id;
    const connectionId = `${tenantId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!tenantId) {
        return res.status(401).json({ error: 'Tenant ID required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx)

    // Enable compression for SSE (reduces bandwidth)
    res.setHeader('Content-Encoding', 'identity');

    // Send initial connected event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({
        message: 'Connected to analytics stream',
        tenantId,
        connectionId,
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Add connection to manager
    connectionManager.addConnection(tenantId, connectionId, res);

    logger.info('[SSE] Client connected', {
        tenantId,
        userId,
        connectionId,
        totalConnections: connectionManager.getTotalConnections()
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeatInterval = setInterval(() => {
        try {
            res.write(`:heartbeat\n\n`);
        } catch (error) {
            clearInterval(heartbeatInterval);
        }
    }, 30000);

    // Event listener for analytics updates
    const updateListener = (data) => {
        // Only send events for this tenant
        if (data.tenantId === tenantId) {
            try {
                res.write(`event: ${data.type}\n`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                logger.error('[SSE] Failed to send event', {
                    error: error.message,
                    tenantId,
                    connectionId
                });
                // Connection broken, clean up
                cleanup();
            }
        }
    };

    // Register listener
    analyticsEmitter.on('update', updateListener);

    // Cleanup on connection close
    const cleanup = () => {
        clearInterval(heartbeatInterval);
        analyticsEmitter.off('update', updateListener);
        connectionManager.removeConnection(connectionId);

        logger.info('[SSE] Client disconnected', {
            tenantId,
            userId,
            connectionId,
            totalConnections: connectionManager.getTotalConnections()
        });
    };

    // Handle client disconnect
    req.on('close', cleanup);
    req.on('error', cleanup);
});

/**
 * @swagger
 * /api/analytics/sse/stats:
 *   get:
 *     summary: Get SSE connection statistics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Connection statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalConnections:
 *                   type: integer
 *                 tenants:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, (req, res) => {
    const stats = connectionManager.getStats();
    res.json(stats);
});

/**
 * Emit analytics update to all connected clients
 *
 * @param {number} tenantId - Tenant ID
 * @param {string} type - Event type (message_sent, message_delivered, distribution_started, etc.)
 * @param {object} data - Event data
 */
function emitAnalyticsUpdate(tenantId, type, data) {
    const event = {
        tenantId,
        type,
        timestamp: new Date().toISOString(),
        ...data
    };

    analyticsEmitter.emit('update', event);

    logger.debug('[SSE] Event emitted', {
        tenantId,
        type,
        connectionCount: connectionManager.getConnectionCount(tenantId)
    });
}

/**
 * Emit multiple analytics updates in batch
 *
 * @param {number} tenantId - Tenant ID
 * @param {array} events - Array of { type, data } objects
 */
function emitAnalyticsBatch(tenantId, events) {
    for (const event of events) {
        emitAnalyticsUpdate(tenantId, event.type, event.data);
    }
}

// Export router and emit functions
module.exports = {
    router,
    emitAnalyticsUpdate,
    emitAnalyticsBatch,
    connectionManager
};
