const Fee = require('../models/Fee.model');
const Student = require('../models/Student.model');
const { getCurrentAcademicYear } = require('../utils/helpers');
const { sendEmail } = require('../services/email.service');
const { createBulkNotifications } = require('../services/notification.service');
const MESSAGES = require('../constants/messages');

// Bulk create fees for a batch/department
exports.bulkCreateFees = async (req, res, next) => {
  try {
    const {
      department,
      year,
      semester,
      academicYear,
      feeStructure,
      dueDate,
      section,
    } = req.body;

    const query = {
      academicStatus: 'active',
    };

    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (section) query.section = section;

    const students = await Student.find(query);

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No students found matching criteria',
      });
    }

    const fees = students.map((student) => ({
      student: student._id,
      academicYear: academicYear || getCurrentAcademicYear(),
      semester: semester || student.semester,
      feeStructure,
      dueDate: new Date(dueDate),
      status: 'pending',
    }));

    const createdFees = await Fee.insertMany(fees);

    res.status(201).json({
      success: true,
      message: `Fees created for ${createdFees.length} students`,
      data: {
        count: createdFees.length,
        students: students.map((s) => ({
          id: s._id,
          registrationNumber: s.registrationNumber,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Apply scholarship/discount
exports.applyScholarship = async (req, res, next) => {
  try {
    const { feeId, discountType, discountValue, reason, approvedBy } = req.body;

    const fee = await Fee.findById(feeId);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    let appliedAmount = 0;
    if (discountType === 'percentage') {
      appliedAmount = (fee.totalAmount * discountValue) / 100;
    } else {
      appliedAmount = discountValue;
    }

    fee.discount = {
      type: discountType,
      value: discountValue,
      reason,
      approvedBy: approvedBy || req.user.id,
      appliedAmount,
    };

    fee.scholarship = appliedAmount;
    await fee.save();

    res.json({
      success: true,
      message: 'Scholarship/discount applied successfully',
      data: {
        originalAmount: fee.totalAmount,
        discountAmount: appliedAmount,
        finalDueAmount: fee.dueAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Apply late fee
exports.applyLateFee = async (req, res, next) => {
  try {
    const { feeId, lateFeeAmount } = req.body;

    const fee = await Fee.findById(feeId);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    fee.lateFee = lateFeeAmount;
    await fee.save();

    res.json({
      success: true,
      message: 'Late fee applied',
      data: {
        totalAmount: fee.totalAmount,
        lateFee: fee.lateFee,
        totalDue: fee.dueAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Send fee reminders
exports.sendFeeReminders = async (req, res, next) => {
  try {
    const { department, year, status = 'pending' } = req.query;

    const query = { status };
    if (department) query.student = { $in: await getStudentsByDepartment(department) };

    const overdueFees = await Fee.find({
      ...query,
      dueDate: { $lt: new Date() },
    })
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' },
      })
      .limit(100);

    let sentCount = 0;
    const errors = [];

    for (const fee of overdueFees) {
      try {
        await sendEmail({
          to: fee.student.userId.email,
          subject: 'Fee Payment Reminder - Overdue',
          text: `Dear ${fee.student.userId.name},\n\nThis is a reminder that your fee payment of ₹${fee.dueAmount} is overdue.\n\nDue Date: ${fee.dueDate.toLocaleDateString()}\nPlease make the payment at your earliest convenience.\n\nThank you.`,
          html: `<p>Dear ${fee.student.userId.name},</p><p>This is a reminder that your fee payment of <strong>₹${fee.dueAmount}</strong> is overdue.</p><p><strong>Due Date:</strong> ${fee.dueDate.toLocaleDateString()}</p><p>Please make the payment at your earliest convenience.</p><p>Thank you.</p>`,
        });

        fee.remindersSent.push({
          sentAt: new Date(),
          method: 'email',
        });
        await fee.save();

        sentCount++;
      } catch (error) {
        errors.push({
          studentId: fee.student._id,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Fee reminders sent to ${sentCount} students`,
      data: {
        sent: sentCount,
        failed: errors.length,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get fee defaulters
exports.getFeeDefaulters = async (req, res, next) => {
  try {
    const { department, year, minAmount = 0 } = req.query;

    const query = {
      status: { $in: ['pending', 'partially_paid', 'overdue'] },
      dueAmount: { $gt: minAmount },
      dueDate: { $lt: new Date() },
    };

    const defaulters = await Fee.find(query)
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name email contactNumber' },
          { path: 'department', select: 'name code' },
        ],
      })
      .sort({ dueDate: 1 });

    // Filter by department/year if provided
    let filteredDefaulters = defaulters;
    if (department) {
      filteredDefaulters = filteredDefaulters.filter(
        (fee) => fee.student.department._id.toString() === department
      );
    }
    if (year) {
      filteredDefaulters = filteredDefaulters.filter(
        (fee) => fee.student.year === parseInt(year)
      );
    }

    const summary = {
      totalDefaulters: filteredDefaulters.length,
      totalOutstanding: filteredDefaulters.reduce((sum, fee) => sum + fee.dueAmount, 0),
    };

    res.json({
      success: true,
      data: {
        summary,
        defaulters: filteredDefaulters.map((fee) => ({
          studentName: fee.student.userId.name,
          registrationNumber: fee.student.registrationNumber,
          department: fee.student.department.name,
          year: fee.student.year,
          contactNumber: fee.student.userId.contactNumber,
          email: fee.student.userId.email,
          dueAmount: fee.dueAmount,
          dueDate: fee.dueDate,
          daysPastDue: Math.floor((new Date() - fee.dueDate) / (1000 * 60 * 60 * 24)),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get fee collection report
exports.getFeeCollectionReport = async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const report = await Fee.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          dueAmount: { $sum: '$dueAmount' },
        },
      },
    ]);

    const overall = {
      totalFees: report.reduce((sum, item) => sum + item.count, 0),
      totalExpected: report.reduce((sum, item) => sum + item.totalAmount, 0),
      totalCollected: report.reduce((sum, item) => sum + item.paidAmount, 0),
      totalPending: report.reduce((sum, item) => sum + item.dueAmount, 0),
    };

    res.json({
      success: true,
      data: {
        overall,
        breakdown: report,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Mark fee as waived
exports.waiveFee = async (req, res, next) => {
  try {
    const { feeId, reason } = req.body;

    const fee = await Fee.findById(feeId);

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    fee.status = 'waived';
    fee.remarks = reason;
    await fee.save();

    res.json({
      success: true,
      message: 'Fee waived successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Helper function
async function getStudentsByDepartment(departmentId) {
  const students = await Student.find({
    department: departmentId,
    academicStatus: 'active',
  }).select('_id');
  return students.map((s) => s._id);
}

module.exports = exports;
