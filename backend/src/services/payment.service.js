const { generateUniqueId } = require('../utils/helpers');

/**
 * DUMMY PAYMENT SERVICE
 * Simulates payment gateway operations for development/testing
 * Replace with actual Razorpay/Stripe implementation in production
 */

// Simulate payment gateway delay
const simulateDelay = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));

// In-memory storage for dummy transactions (use Redis/DB in production)
const transactions = new Map();

/**
 * Create a dummy payment order
 * Simulates Razorpay/Stripe order creation
 */
const createPaymentOrder = async (orderData) => {
  await simulateDelay(500);

  const orderId = generateUniqueId('ORDER');
  const order = {
    id: orderId,
    amount: orderData.amount,
    currency: orderData.currency || 'INR',
    status: 'created',
    studentId: orderData.studentId,
    feeId: orderData.feeId,
    createdAt: new Date(),
  };

  transactions.set(orderId, order);

  return {
    success: true,
    orderId,
    amount: order.amount,
    currency: order.currency,
    key: 'dummy_key_12345', // Dummy public key
  };
};

/**
 * Verify payment signature
 * Simulates webhook signature verification
 */
const verifyPaymentSignature = async (paymentData) => {
  await simulateDelay(300);

  // In real implementation, verify HMAC signature
  // For dummy: assume all signatures are valid
  return {
    success: true,
    verified: true,
  };
};

/**
 * Process dummy payment
 * Simulates successful payment processing
 */
const processPayment = async (paymentData) => {
  await simulateDelay(1000);

  const {
    orderId,
    paymentId = generateUniqueId('PAY'),
    amount,
    method = 'card',
    status = 'success',
  } = paymentData;

  // Simulate 95% success rate (5% failures for testing)
  const isSuccess = status === 'success' || Math.random() > 0.05;

  const transaction = {
    paymentId,
    orderId,
    amount,
    method,
    status: isSuccess ? 'success' : 'failed',
    processedAt: new Date(),
    failureReason: isSuccess ? null : 'Payment declined by bank',
  };

  transactions.set(paymentId, transaction);

  if (!isSuccess) {
    throw new Error('Payment failed: ' + transaction.failureReason);
  }

  return {
    success: true,
    paymentId: transaction.paymentId,
    orderId: transaction.orderId,
    amount: transaction.amount,
    status: transaction.status,
    method: transaction.method,
  };
};

/**
 * Capture payment
 * Simulates payment capture (for authorized payments)
 */
const capturePayment = async (paymentId, amount) => {
  await simulateDelay(500);

  const transaction = transactions.get(paymentId);
  if (!transaction) {
    throw new Error('Payment not found');
  }

  transaction.status = 'captured';
  transaction.capturedAmount = amount;
  transaction.capturedAt = new Date();

  return {
    success: true,
    paymentId,
    status: 'captured',
    amount,
  };
};

/**
 * Initiate refund
 * Simulates refund processing
 */
const initiateRefund = async (paymentId, amount, reason) => {
  await simulateDelay(800);

  const refundId = generateUniqueId('REFUND');
  const refund = {
    refundId,
    paymentId,
    amount,
    reason,
    status: 'processed',
    processedAt: new Date(),
  };

  transactions.set(refundId, refund);

  return {
    success: true,
    refundId,
    paymentId,
    amount,
    status: 'processed',
  };
};

/**
 * Get payment status
 * Fetch transaction details
 */
const getPaymentStatus = async (paymentId) => {
  await simulateDelay(300);

  const transaction = transactions.get(paymentId);
  if (!transaction) {
    return {
      success: false,
      error: 'Payment not found',
    };
  }

  return {
    success: true,
    payment: transaction,
  };
};

/**
 * Simulate webhook event
 * For testing webhook handlers
 */
const simulateWebhook = async (eventType, paymentData) => {
  await simulateDelay(200);

  const webhookEvent = {
    event: eventType,
    payload: {
      payment: {
        entity: {
          id: paymentData.paymentId,
          order_id: paymentData.orderId,
          amount: paymentData.amount,
          status: paymentData.status || 'captured',
          method: paymentData.method || 'card',
        },
      },
    },
    created_at: Date.now(),
  };

  return webhookEvent;
};

/**
 * Generate payment link
 * Simulates shareable payment link creation
 */
const generatePaymentLink = async (linkData) => {
  await simulateDelay(400);

  const linkId = generateUniqueId('LINK');
  const paymentLink = {
    id: linkId,
    shortUrl: `https://dummy-payment.gateway/pay/${linkId}`,
    amount: linkData.amount,
    currency: linkData.currency || 'INR',
    description: linkData.description,
    studentId: linkData.studentId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    status: 'active',
  };

  transactions.set(linkId, paymentLink);

  return {
    success: true,
    linkId,
    shortUrl: paymentLink.shortUrl,
    expiresAt: paymentLink.expiresAt,
  };
};

/**
 * Validate payment amount
 */
const validatePaymentAmount = (amount, expectedAmount) => {
  // Amount is in paisa/cents, convert to rupees for comparison
  const actualAmount = amount / 100;
  const expected = expectedAmount;

  return Math.abs(actualAmount - expected) < 0.01;
};

module.exports = {
  createPaymentOrder,
  verifyPaymentSignature,
  processPayment,
  capturePayment,
  initiateRefund,
  getPaymentStatus,
  simulateWebhook,
  generatePaymentLink,
  validatePaymentAmount,
};
