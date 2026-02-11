const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { createFeeValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const MESSAGES = require('../constants/messages');
const { generateUniqueId } = require('../utils/helpers');

router.use(authenticate);

// Create fee
router.post('/', hasPermission(PERMISSIONS.FEE_CREATE), createFeeValidation, auditLogger('CREATE', 'FEE'), async (req, res, next) => {
  try {
    const fee = await Fee.create(req.body);

    res.status(201).json({
      success: true,
      message: MESSAGES.FEE_CREATED,
      data: fee,
    });
  } catch (error) {
    next(error);
  }
});

// Get all fees
router.get('/', hasPermission(PERMISSIONS.FEE_READ_ALL), async (req, res, next) => {
  try {
    const { student, status, academicYear, semester } = req.query;

    const query = {};
    if (student) query.student = student;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const fees = await Fee.find(query)
      .populate('student', 'registrationNumber rollNumber')
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email contactNumber' },
      })
      .sort({ dueDate: -1 });

    res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    next(error);
  }
});

// Get fee by ID
router.get('/:id', async (req, res, next) => {
  try {
    const fee = await Fee.findById(req.params.id)
      .populate('student', 'registrationNumber rollNumber')
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name email contactNumber' },
          { path: 'department', select: 'name code' },
        ],
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    res.json({
      success: true,
      data: fee,
    });
  } catch (error) {
    next(error);
  }
});

// Update fee
router.put('/:id', hasPermission(PERMISSIONS.FEE_UPDATE), auditLogger('UPDATE', 'FEE'), async (req, res, next) => {
  try {
    const fee = await Fee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    res.json({
      success: true,
      message: MESSAGES.FEE_UPDATED,
      data: fee,
    });
  } catch (error) {
    next(error);
  }
});

// Record payment
router.post('/:id/payment', hasPermission(PERMISSIONS.FEE_PAYMENT), auditLogger('CREATE', 'FEE'), async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionId, bankDetails } = req.body;

    const fee = await Fee.findById(req.params.id);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    const receiptNumber = generateUniqueId('REC');

    fee.payments.push({
      transactionId: transactionId || generateUniqueId('TXN'),
      paymentMethod,
      amount,
      paymentDate: new Date(),
      receiptNumber,
      bankDetails,
      status: 'success',
      processedBy: req.user.id,
    });

    fee.paidAmount += amount;
    await fee.save();

    res.json({
      success: true,
      message: MESSAGES.PAYMENT_SUCCESS,
      data: {
        fee,
        receiptNumber,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
