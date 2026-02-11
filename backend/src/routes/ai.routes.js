const express = require('express');
const router = express.Router();
const {
  chatWithAI,
  getChatHistory,
  provideFeedback,
  getRecommendations,
  generateRecommendations,
  updateRecommendationStatus,
  analyzeResume,
  summarizeDocument,
  smartSearch,
  predictPerformance,
  getAIStatistics,
} = require('../controllers/ai.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission, hasRole } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { auditLogger } = require('../middlewares/audit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * ============================================
 * CHATBOT ROUTES
 * ============================================
 */

// Chat with AI
router.post('/chat', auditLogger('AI_CHAT'), chatWithAI);

// Get chat history
router.get('/chat/history', getChatHistory);

// Provide feedback on AI response
router.post('/chat/:messageId/feedback', provideFeedback);

/**
 * ============================================
 * RECOMMENDATION ROUTES
 * ============================================
 */

// Get user's recommendations
router.get('/recommendations', getRecommendations);

// Generate recommendations for a student
router.post(
  '/recommendations/generate/:studentId',
  auditLogger('GENERATE_RECOMMENDATIONS'),
  generateRecommendations
);

// Update recommendation status
router.put(
  '/recommendations/:id/status',
  auditLogger('UPDATE_RECOMMENDATION'),
  updateRecommendationStatus
);

/**
 * ============================================
 * ANALYSIS ROUTES
 * ============================================
 */

// Analyze resume
router.post('/analyze/resume', auditLogger('ANALYZE_RESUME'), analyzeResume);

// Summarize document/notice
router.post('/summarize', summarizeDocument);

// Summarize specific notice
router.get('/summarize/notice/:noticeId', summarizeDocument);

/**
 * ============================================
 * SMART SEARCH
 * ============================================
 */

// Smart search across entities
router.get('/search', smartSearch);

/**
 * ============================================
 * PREDICTION ROUTES
 * ============================================
 */

// Predict student performance
router.get(
  '/predict/performance/:studentId',
  hasPermission(PERMISSIONS.REPORT_READ),
  predictPerformance
);

/**
 * ============================================
 * ADMIN ROUTES
 * ============================================
 */

// Get AI statistics (admin only)
router.get(
  '/statistics',
  hasPermission(PERMISSIONS.REPORT_READ),
  getAIStatistics
);

module.exports = router;
