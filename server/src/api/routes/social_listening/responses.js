/**
 * Mention Response Management API
 *
 * Endpoints for managing responses to social media mentions
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/auth');
const { query } = require('../../../infrastructure/database/db');
const logger = require('../../../infrastructure/logger');

/**
 * @route   GET /api/v1/social-listening/responses
 * @desc    List responses for tenant
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { mentionId, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT r.*,
             m.content as mention_content,
             m.author_name,
             m.author_handle,
             m.platform,
             u.name as sent_by_name,
             u.email as sent_by_email
      FROM sl_mention_responses r
      LEFT JOIN sl_mentions m ON r.mention_id = m.id
      LEFT JOIN users u ON r.sent_by = u.id
      WHERE r.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (mentionId) {
      sql += ` AND r.mention_id = $${paramIdx++}`;
      params.push(mentionId);
    }

    if (status) {
      sql += ` AND r.status = $${paramIdx++}`;
      params.push(status);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) FROM sl_mention_responses WHERE tenant_id = $1';
    const countParams = [tenantId];
    let countIdx = 2;

    if (mentionId) {
      countSql += ` AND mention_id = $${countIdx++}`;
      countParams.push(mentionId);
    }

    if (status) {
      countSql += ` AND status = $${countIdx++}`;
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      responses: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('[Responses API] Failed to list responses', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
});

/**
 * @route   POST /api/v1/social-listening/responses
 * @desc    Create a response (draft or send)
 * @access  Private
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      mentionId,
      responseText,
      responseType,
      sendNow
    } = req.body;

    // Validate required fields
    if (!mentionId || !responseText) {
      return res.status(400).json({ error: 'Missing required fields: mentionId, responseText' });
    }

    // Verify mention exists and belongs to tenant
    const mentionResult = await query(
      'SELECT * FROM sl_mentions WHERE id = $1 AND tenant_id = $2',
      [mentionId, tenantId]
    );

    if (mentionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    const mention = mentionResult.rows[0];

    // Determine status
    const status = sendNow ? 'sent' : 'draft';
    const sentAt = sendNow ? new Date() : null;

    // Create response record
    const result = await query(
      `INSERT INTO sl_mention_responses (
        tenant_id, mention_id, response_text, response_type,
        sent_via, sent_at, sent_by, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *`,
      [
        tenantId,
        mentionId,
        responseText,
        responseType || 'manual',
        sendNow ? 'api' : 'manual',
        sentAt,
        req.user.id,
        status
      ]
    );

    const response = result.rows[0];

    // If sendNow, attempt to post via platform API
    if (sendNow) {
      try {
        await postResponseToPlatform(mention, responseText);

        // Update response with external ID
        await query(
          `UPDATE sl_mention_responses
           SET external_response_id = $1, updated_at = NOW()
           WHERE id = $2`,
          ['external-id-placeholder', response.id]
        );

        // Update mention status to 'actioned'
        await query(
          `UPDATE sl_mentions
           SET status = 'actioned', updated_at = NOW()
           WHERE id = $1`,
          [mentionId]
        );

        logger.info('[Responses API] Response sent to platform', {
          responseId: response.id,
          mentionId,
          platform: mention.platform
        });

      } catch (sendError) {
        logger.error('[Responses API] Failed to send response to platform', {
          responseId: response.id,
          mentionId,
          platform: mention.platform,
          error: sendError.message
        });

        // Update status to failed
        await query(
          `UPDATE sl_mention_responses
           SET status = 'failed', updated_at = NOW()
           WHERE id = $1`,
          [response.id]
        );

        return res.status(500).json({
          error: 'Failed to send response to platform',
          response: { ...response, status: 'failed' }
        });
      }
    }

    logger.info('[Responses API] Response created', {
      responseId: response.id,
      mentionId,
      status,
      tenantId
    });

    res.status(201).json({
      success: true,
      response
    });

  } catch (error) {
    logger.error('[Responses API] Failed to create response', { error: error.message });
    res.status(500).json({ error: 'Failed to create response' });
  }
});

/**
 * @route   PUT /api/v1/social-listening/responses/:responseId
 * @desc    Update response (edit draft or resend failed)
 * @access  Private
 */
router.put('/:responseId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { responseId } = req.params;
    const {
      responseText,
      sendNow
    } = req.body;

    // Verify response exists and belongs to tenant
    const existingResult = await query(
      'SELECT * FROM sl_mention_responses WHERE id = $1 AND tenant_id = $2',
      [responseId, tenantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const existing = existingResult.rows[0];

    // Can only edit drafts or failed responses
    if (existing.status === 'sent') {
      return res.status(400).json({ error: 'Cannot edit sent response' });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramIdx = 1;

    if (responseText !== undefined) {
      updates.push(`response_text = $${paramIdx++}`);
      params.push(responseText);
    }

    if (sendNow) {
      updates.push(`status = $${paramIdx++}`);
      params.push('sent');
      updates.push(`sent_at = NOW()`);
      updates.push(`sent_by = $${paramIdx++}`);
      params.push(req.user.id);
    }

    updates.push(`updated_at = NOW()`);

    params.push(responseId, tenantId);

    const result = await query(
      `UPDATE sl_mention_responses
       SET ${updates.join(', ')}
       WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx++}
       RETURNING *`,
      params
    );

    const response = result.rows[0];

    // If sending now, post to platform
    if (sendNow) {
      const mentionResult = await query(
        'SELECT * FROM sl_mentions WHERE id = $1',
        [response.mention_id]
      );

      const mention = mentionResult.rows[0];

      try {
        await postResponseToPlatform(mention, response.response_text);

        await query(
          `UPDATE sl_mention_responses
           SET external_response_id = $1, updated_at = NOW()
           WHERE id = $2`,
          ['external-id-placeholder', response.id]
        );

        logger.info('[Responses API] Response sent to platform', {
          responseId: response.id,
          mentionId: mention.id
        });

      } catch (sendError) {
        logger.error('[Responses API] Failed to send response', {
          error: sendError.message
        });

        await query(
          `UPDATE sl_mention_responses
           SET status = 'failed', updated_at = NOW()
           WHERE id = $1`,
          [response.id]
        );

        return res.status(500).json({
          error: 'Failed to send response to platform',
          response: { ...response, status: 'failed' }
        });
      }
    }

    logger.info('[Responses API] Response updated', {
      responseId,
      tenantId
    });

    res.json({
      success: true,
      response
    });

  } catch (error) {
    logger.error('[Responses API] Failed to update response', { error: error.message });
    res.status(500).json({ error: 'Failed to update response' });
  }
});

/**
 * @route   DELETE /api/v1/social-listening/responses/:responseId
 * @desc    Delete response (draft only)
 * @access  Private
 */
router.delete('/:responseId', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { responseId } = req.params;

    // Verify response exists and is draft
    const existingResult = await query(
      'SELECT * FROM sl_mention_responses WHERE id = $1 AND tenant_id = $2',
      [responseId, tenantId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const existing = existingResult.rows[0];

    if (existing.status !== 'draft') {
      return res.status(400).json({ error: 'Can only delete draft responses' });
    }

    await query(
      'DELETE FROM sl_mention_responses WHERE id = $1 AND tenant_id = $2',
      [responseId, tenantId]
    );

    logger.info('[Responses API] Response deleted', {
      responseId,
      tenantId
    });

    res.json({
      success: true,
      message: 'Response deleted successfully'
    });

  } catch (error) {
    logger.error('[Responses API] Failed to delete response', { error: error.message });
    res.status(500).json({ error: 'Failed to delete response' });
  }
});

/**
 * @route   POST /api/v1/social-listening/responses/:responseId/send
 * @desc    Send a draft response
 * @access  Private
 */
router.post('/:responseId/send', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { responseId } = req.params;

    // Verify response exists and is draft
    const responseResult = await query(
      'SELECT * FROM sl_mention_responses WHERE id = $1 AND tenant_id = $2',
      [responseId, tenantId]
    );

    if (responseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    const response = responseResult.rows[0];

    if (response.status !== 'draft' && response.status !== 'failed') {
      return res.status(400).json({ error: 'Can only send draft or failed responses' });
    }

    // Get mention
    const mentionResult = await query(
      'SELECT * FROM sl_mentions WHERE id = $1',
      [response.mention_id]
    );

    const mention = mentionResult.rows[0];

    // Post to platform
    try {
      await postResponseToPlatform(mention, response.response_text);

      // Update response status
      await query(
        `UPDATE sl_mention_responses
         SET status = 'sent',
             sent_at = NOW(),
             sent_by = $1,
             sent_via = 'api',
             external_response_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [req.user.id, 'external-id-placeholder', responseId]
      );

      // Update mention status
      await query(
        `UPDATE sl_mentions
         SET status = 'actioned', updated_at = NOW()
         WHERE id = $1`,
        [mention.id]
      );

      logger.info('[Responses API] Response sent', {
        responseId,
        mentionId: mention.id
      });

      res.json({
        success: true,
        message: 'Response sent successfully'
      });

    } catch (sendError) {
      logger.error('[Responses API] Failed to send response', {
        error: sendError.message
      });

      // Update status to failed
      await query(
        `UPDATE sl_mention_responses
         SET status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [responseId]
      );

      res.status(500).json({
        error: 'Failed to send response to platform',
        details: sendError.message
      });
    }

  } catch (error) {
    logger.error('[Responses API] Failed to send response', { error: error.message });
    res.status(500).json({ error: 'Failed to send response' });
  }
});

/**
 * @route   POST /api/v1/social-listening/responses/ai-generate
 * @desc    Generate AI response suggestion
 * @access  Private
 */
router.post('/ai-generate', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { mentionId, tone, instructions } = req.body;

    // Validate mention
    const mentionResult = await query(
      'SELECT * FROM sl_mentions WHERE id = $1 AND tenant_id = $2',
      [mentionId, tenantId]
    );

    if (mentionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Mention not found' });
    }

    const mention = mentionResult.rows[0];

    // Generate AI response
    const generatedResponse = await generateAIResponse(mention, tone, instructions);

    logger.info('[Responses API] AI response generated', {
      mentionId,
      tenantId
    });

    res.json({
      success: true,
      response: generatedResponse
    });

  } catch (error) {
    logger.error('[Responses API] Failed to generate AI response', { error: error.message });
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

/**
 * Post response to platform API
 * (Placeholder - actual implementation depends on platform)
 */
async function postResponseToPlatform(mention, responseText) {
  // TODO: Implement platform-specific posting logic
  // For now, just log
  logger.info('[Responses] Posting to platform (placeholder)', {
    mentionId: mention.id,
    platform: mention.platform,
    responseLength: responseText.length
  });

  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));

  // In real implementation:
  // - Use ConnectorFactory to get platform connector
  // - Call connector.postReply(mention.external_id, responseText)
  // - Return external response ID

  return 'external-response-id-placeholder';
}

/**
 * Generate AI response suggestion
 */
async function generateAIResponse(mention, tone = 'professional', instructions = '') {
  try {
    const axios = require('axios');

    const prompt = `Generate a ${tone} response to this social media mention:

Platform: ${mention.platform}
Author: ${mention.author_name} (@${mention.author_handle})
Content: "${mention.content}"
Sentiment: ${mention.sentiment}

${instructions ? `Additional instructions: ${instructions}` : ''}

Generate a concise, appropriate response (max 280 characters for Twitter).`;

    // Call AI service
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL || 'http://localhost:5001'}/api/v1/generate`,
      {
        prompt,
        maxTokens: 100,
        temperature: 0.7
      },
      { timeout: 10000 }
    );

    return response.data.text || 'Unable to generate response';

  } catch (error) {
    logger.error('[Responses] AI generation failed', { error: error.message });
    throw new Error('Failed to generate AI response');
  }
}

module.exports = router;
