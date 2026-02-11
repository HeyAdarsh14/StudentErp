const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { markAttendanceValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const MESSAGES = require('../constants/messages');
const { getCurrentAcademicYear } = require('../utils/helpers');

router.use(authenticate);

// Mark attendance
router.post('/', hasPermission(PERMISSIONS.ATTENDANCE_MARK), markAttendanceValidation, auditLogger('CREATE', 'ATTENDANCE'), async (req, res, next) => {
  try {
    const { subjectId, date, attendanceData } = req.body;

    const attendanceRecords = attendanceData.map((record) => ({
      student: record.studentId,
      subject: subjectId,
      faculty: req.user.id,
      date: new Date(date),
      status: record.status,
      markedBy: req.user.id,
      academicYear: getCurrentAcademicYear(),
      semester: record.semester,
    }));

    await Attendance.insertMany(attendanceRecords);

    res.status(201).json({
      success: true,
      message: MESSAGES.ATTENDANCE_MARKED,
    });
  } catch (error) {
    next(error);
  }
});

// Get attendance by filters
router.get('/', hasPermission(PERMISSIONS.ATTENDANCE_READ_ALL), async (req, res, next) => {
  try {
    const { student, subject, date, startDate, endDate } = req.query;

    const query = {};
    if (student) query.student = student;
    if (subject) query.subject = subject;
    if (date) query.date = new Date(date);
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'registrationNumber rollNumber')
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('subject', 'name code')
      .populate('faculty', 'name')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

// Get attendance statistics
router.get('/statistics', authenticate, async (req, res, next) => {
  try {
    const { studentId, subjectId } = req.query;

    const stats = await Attendance.calculateAttendance(studentId, subjectId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Update attendance
router.put('/:id', hasPermission(PERMISSIONS.ATTENDANCE_UPDATE), auditLogger('UPDATE', 'ATTENDANCE'), async (req, res, next) => {
  try {
    const { status, remarks } = req.body;

    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.ATTENDANCE_NOT_FOUND,
      });
    }

    // Add to modification history
    attendance.modificationHistory.push({
      previousStatus: attendance.status,
      newStatus: status,
      modifiedBy: req.user.id,
      modifiedAt: new Date(),
      reason: remarks,
    });

    attendance.status = status;
    attendance.isModified = true;
    if (remarks) attendance.remarks = remarks;

    await attendance.save();

    res.json({
      success: true,
      message: MESSAGES.ATTENDANCE_UPDATED,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
