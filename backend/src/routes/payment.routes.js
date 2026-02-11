const express = require('express');
const router = express.Router();
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  initiateRefund,
  getPaymentStatus,
  generatePaymentLink,
  simulatePayment,
} = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { auditLogger } = require('../middlewares/audit.middleware');

// Webhook endpoint (no auth required)
router.post('/webhook', handleWebhook);

// Protected routes
router.use(authenticate);

// Create payment order
router.post('/create-order', createOrder);

// Verify and capture payment
router.post('/verify', auditLogger('CREATE', 'FEE'), verifyPayment);

// Generate payment link
router.post('/generate-link', hasPermission(PERMISSIONS.FEE_CREATE), generatePaymentLink);

// Get payment status
router.get('/status/:paymentId', getPaymentStatus);

// Initiate refund (admin only)
router.post('/refund', hasPermission(PERMISSIONS.FEE_UPDATE), auditLogger('UPDATE', 'FEE'), initiateRefund);

// Simulate payment (TESTING ONLY - remove in production)
router.post('/simulate', simulatePayment);

module.exports = router;
