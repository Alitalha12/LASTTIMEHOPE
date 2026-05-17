/**
 * memory.routes.js
 * API routes for AI Memory feature
 */
const router = require('express').Router();
const { verifyFirebaseToken } = require('../middleware/firebaseAuth');
const { buildUserMemoryContext, HISTORY_DEPTHS } = require('../services/userMemory.service');
const { updateDocument, getDocument } = require('../services/firebase.service');
const logger = require('../utils/logger');

/**
 * GET /api/memory/:userId
 * Returns the AI memory context summary for a user
 */
router.get('/:userId', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { depth = 'last10' } = req.query;

    const memory = await buildUserMemoryContext(userId, depth);

    if (!memory) {
      return res.status(200).json({
        success: true,
        hasMemory: false,
        message: 'No booking history found. Complete a booking to enable AI Memory.',
        data: null,
      });
    }

    res.status(200).json({
      success: true,
      hasMemory: true,
      depthOptions: Object.entries(HISTORY_DEPTHS).map(([key, val]) => ({ key, label: val.label })),
      data: memory,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/memory/:userId/settings
 * Update AI memory preferences (enabled/depth) in Firestore
 */
router.put('/:userId/settings', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { aiMemoryEnabled, historyDepth } = req.body;

    await updateDocument('users', userId, {
      aiMemoryEnabled: aiMemoryEnabled ?? true,
      historyDepth: historyDepth || 'last10',
      memorySettingsUpdatedAt: new Date().toISOString(),
    });

    logger.info(`[Memory] Settings updated for ${userId}: enabled=${aiMemoryEnabled}, depth=${historyDepth}`);

    res.status(200).json({
      success: true,
      message: 'AI Memory settings saved.',
      data: { aiMemoryEnabled, historyDepth },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/memory/:userId
 * Clear all AI memory preferences (privacy reset)
 */
router.delete('/:userId', verifyFirebaseToken, async (req, res, next) => {
  try {
    const { userId } = req.params;

    await updateDocument('users', userId, {
      aiMemoryEnabled: false,
      historyDepth: 'last10',
      memorySettingsUpdatedAt: new Date().toISOString(),
    });

    logger.info(`[Memory] Cleared for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'AI Memory cleared. All personalization has been reset.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
