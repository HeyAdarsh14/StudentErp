const Fee = require('../models/Fee.model');
const Student = require('../models/Student.model');
const {
  createPaymentOrder,
  processPayment,
  verifyPaymentSignature,
  initiateRefund,
  getPaymentStatus,
  generatePaymentLink,
  validatePaymentAmount,
} = require('../services/payment.service');
const { generateUniqueId } = require('../utils/helpers');
const { generateFeeReceipt } = require('../utils/generatePDF');
const { sendEmail } = require('../services/email.service');
const { createNotification } = require('../services/notification.service');
const MESSAGES = require('../constants/messages');

// Create payment order (Step 1)
exports.createOrder = async (req, res, next) => {
  try {
    const { feeId } = req.body;

    const fee = await Fee.findById(feeId).populate('student');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    if (fee.status === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Fee already paid',
      });
    }

    // Create payment order
    const orderData = {
      amount: fee.dueAmount * 100, // Convert to paisa
      currency: 'INR',
      studentId: fee.student._id,
      feeId: fee._id,
    };

    const order = await createPaymentOrder(orderData);

    res.status(201).json({
      success: true,
      message: 'Payment order created',
      data: {
        orderId: order.orderId,
        amount: fee.dueAmount,
        currency: order.currency,
        key: order.key,
        studentName: fee.student.userId?.name,
        feeDetails: {
          id: fee._id,
          academicYear: fee.academicYear,
          semester: fee.semester,
          totalAmount: fee.totalAmount,
          paidAmount: fee.paidAmount,
          dueAmount: fee.dueAmount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Verify and capture payment (Step 2 - after payment on frontend)
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, paymentId, signature, feeId, amount, method } = req.body;

    // Verify signature
    const verification = await verifyPaymentSignature({
      orderId,
      paymentId,
      signature,
    });

    if (!verification.verified) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Process payment
    const paymentResult = await processPayment({
      orderId,
      paymentId,
      amount,
      method: method || 'card',
      status: 'success',
    });

    // Update fee record
    const fee = await Fee.findById(feeId).populate({
      path: 'student',
      populate: [
        { path: 'userId', select: 'name email' },
        { path: 'department', select: 'name' },
      ],
    });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    const receiptNumber = generateUniqueId('REC');
    const transactionId = paymentResult.paymentId;

    // Add payment to fee record
    fee.payments.push({
      transactionId,
      paymentMethod: method || 'online',
      amount: amount / 100, // Convert from paisa to rupees
      paymentDate: new Date(),
      receiptNumber,
      paymentGateway: 'dummy',
      status: 'success',
      processedBy: req.user?.id,
    });

    fee.paidAmount += amount / 100;
    await fee.save();

    // Generate receipt PDF
    let receiptUrl = null;
    try {
      const receiptData = {
        receiptNumber,
        transactionId,
        date: new Date(),
        studentName: fee.student.userId.name,
        registrationNumber: fee.student.registrationNumber,
        department: fee.student.department.name,
        feeType: 'Academic Fee',
        amount: amount / 100,
        paymentMode: method || 'online',
        status: 'success',
      };

      const receiptPath = await generateFeeReceipt(receiptData);
      receiptUrl = receiptPath; // In production, upload to Cloudinary
    } catch (error) {
      console.error('Receipt generation error:', error);
    }

    // Send email notification
    try {
      await sendEmail({
        to: fee.student.userId.email,
        subject: 'Payment Confirmation - Fee Receipt',
        text: `Dear ${fee.student.userId.name},\n\nYour payment of ₹${amount / 100} has been successfully processed.\n\nReceipt Number: ${receiptNumber}\nTransaction ID: ${transactionId}\n\nThank you!`,
        html: `<p>Dear ${fee.student.userId.name},</p><p>Your payment of <strong>₹${amount / 100}</strong> has been successfully processed.</p><p><strong>Receipt Number:</strong> ${receiptNumber}<br><strong>Transaction ID:</strong> ${transactionId}</p><p>Thank you!</p>`,
      });
    } catch (error) {
      console.error('Email notification error:', error);
    }

    // Create in-app notification
    try {
      await createNotification(fee.student.userId._id, {
        type: 'success',
        category: 'fee',
        title: 'Payment Successful',
        message: `Your payment of ₹${amount / 100} has been processed successfully. Receipt: ${receiptNumber}`,
        priority: 'normal',
        channels: { inApp: true, email: false },
      });
    } catch (error) {
      console.error('Notification error:', error);
    }

    res.json({
      success: true,
      message: MESSAGES.PAYMENT_SUCCESS,
      data: {
        paymentId: transactionId,
        receiptNumber,
        amount: amount / 100,
        status: 'success',
        receiptUrl,
        updatedFee: {
          totalAmount: fee.totalAmount,
          paidAmount: fee.paidAmount,
          dueAmount: fee.dueAmount,
          status: fee.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Handle payment webhook (background processing)
exports.handleWebhook = async (req, res, next) => {
  try {
    const webhookEvent = req.body;

    // Verify webhook signature (important in production)
    // For dummy, we accept all webhooks

    const { event, payload } = webhookEvent;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payment.entity;

      // Find fee record by order ID
      // In production, store orderId mapping in database
      console.log('Payment captured webhook received:', paymentEntity.id);

      // Process webhook asynchronously
      // Update fee record, send notifications, etc.
    }

    // Always respond 200 to webhooks
    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).json({ success: true, received: true });
  }
};

// Initiate refund
exports.initiateRefund = async (req, res, next) => {
  try {
    const { paymentId, amount, reason } = req.body;

    const refund = await initiateRefund(paymentId, amount * 100, reason);

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: refund,
    });
  } catch (error) {
    next(error);
  }
};

// Get payment status
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    const result = await getPaymentStatus(paymentId);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      data: result.payment,
    });
  } catch (error) {
    next(error);
  }
};

// Generate payment link (for sharing via email/SMS)
exports.generatePaymentLink = async (req, res, next) => {
  try {
    const { feeId } = req.body;

    const fee = await Fee.findById(feeId).populate('student');

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    const linkData = {
      amount: fee.dueAmount * 100,
      currency: 'INR',
      description: `Fee payment for ${fee.academicYear} - Semester ${fee.semester}`,
      studentId: fee.student._id,
    };

    const paymentLink = await generatePaymentLink(linkData);

    res.json({
      success: true,
      message: 'Payment link generated',
      data: paymentLink,
    });
  } catch (error) {
    next(error);
  }
};

// Simulate payment (for testing)
exports.simulatePayment = async (req, res, next) => {
  try {
    const { feeId, amount, method = 'card', status = 'success' } = req.body;

    const orderId = generateUniqueId('ORDER');
    const paymentId = generateUniqueId('PAY');

    // Simulate payment processing
    const paymentResult = await processPayment({
      orderId,
      paymentId,
      amount: amount * 100,
      method,
      status,
    });

    res.json({
      success: true,
      message: 'Payment simulated',
      data: paymentResult,
      instructions: 'Use this paymentId and orderId to verify payment',
    });
  } catch (error) {
    next(error);
  }
};
