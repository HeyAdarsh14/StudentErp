const Leave = require('../models/Leave.model');
const Faculty = require('../models/Faculty.model');
const MESSAGES = require('../constants/messages');
const { getCurrentAcademicYear } = require('../utils/helpers');

// Apply for leave
exports.applyLeave = async (req, res, next) => {
  try {
    const { facultyId, leaveType, startDate, endDate, reason, coveringFaculty, document } = req.body;

    // Check if faculty exists
    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    // Check leave balance
    const leaveSummary = await Leave.getLeaveSummary(facultyId, getCurrentAcademicYear());
    const leaveBalance = faculty.leaveBalance[leaveType] || 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (leaveBalance - leaveSummary[leaveType] < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${leaveType} leave balance`,
      });
    }

    const leave = await Leave.create({
      faculty: facultyId,
      leaveType,
      startDate: start,
      endDate: end,
      reason,
      coveringFaculty,
      document,
      academicYear: getCurrentAcademicYear(),
    });

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Get all leaves (admin/HOD)
exports.getAllLeaves = async (req, res, next) => {
  try {
    const { status, leaveType, faculty, startDate, endDate } = req.query;

    const query = { isDeleted: false };
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (faculty) query.faculty = faculty;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate) };
      query.endDate = { $lte: new Date(endDate) };
    }

    const leaves = await Leave.find(query)
      .populate('faculty', 'employeeId')
      .populate({
        path: 'faculty',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('approvedBy', 'name')
      .populate('coveringFaculty', 'name')
      .sort({ appliedDate: -1 });

    res.json({
      success: true,
      data: leaves,
    });
  } catch (error) {
    next(error);
  }
};

// Get leave by ID
exports.getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('faculty', 'employeeId')
      .populate({
        path: 'faculty',
        populate: { path: 'userId', select: 'name email contactNumber' },
      })
      .populate('approvedBy', 'name email')
      .populate('coveringFaculty', 'employeeId')
      .populate({
        path: 'coveringFaculty',
        populate: { path: 'userId', select: 'name email' },
      });

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found',
      });
    }

    res.json({
      success: true,
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Approve/Reject leave
exports.updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, remarks } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found',
      });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Leave has already been processed',
      });
    }

    leave.status = status;
    leave.approvedBy = req.user.id;
    leave.approvedDate = new Date();

    if (status === 'rejected' && rejectionReason) {
      leave.rejectionReason = rejectionReason;
    }

    if (remarks) {
      leave.remarks = remarks;
    }

    await leave.save();

    res.json({
      success: true,
      message: `Leave ${status} successfully`,
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel leave
exports.cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave not found',
      });
    }

    if (leave.status === 'approved' && new Date() >= leave.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel leave that has already started',
      });
    }

    leave.status = 'cancelled';
    await leave.save();

    res.json({
      success: true,
      message: 'Leave cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Get leave balance
exports.getLeaveBalance = async (req, res, next) => {
  try {
    const { facultyId } = req.params;

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found',
      });
    }

    const usedLeaves = await Leave.getLeaveSummary(facultyId, getCurrentAcademicYear());

    const balance = {
      casual: faculty.leaveBalance.casual - usedLeaves.casual,
      sick: faculty.leaveBalance.sick - usedLeaves.sick,
      earned: faculty.leaveBalance.earned - usedLeaves.earned,
    };

    res.json({
      success: true,
      data: {
        allocated: faculty.leaveBalance,
        used: usedLeaves,
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
};
