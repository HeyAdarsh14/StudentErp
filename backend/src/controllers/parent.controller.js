const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const Fee = require('../models/Fee.model');
const Notice = require('../models/Notice.model');
const MESSAGES = require('../constants/messages');

// Get children (students linked to parent)
exports.getChildren = async (req, res, next) => {
  try {
    // Assuming parent's user ID is linked to students via parentInfo
    const students = await Student.find({
      $or: [
        { 'parentInfo.father.email': req.user.email },
        { 'parentInfo.mother.email': req.user.email },
        { 'parentInfo.guardian.email': req.user.email },
      ],
      isDeleted: false,
    })
      .populate('userId', 'name email profileImage')
      .populate('department', 'name code')
      .select('-documents -admissionDetails');

    res.json({
      success: true,
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

// Get child details
exports.getChildDetails = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.studentId)
      .populate('userId', 'name email profileImage contactNumber')
      .populate('department', 'name code')
      .populate('subjects', 'name code credits');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    // Verify parent access
    const parentEmail = req.user.email;
    const hasAccess =
      student.parentInfo?.father?.email === parentEmail ||
      student.parentInfo?.mother?.email === parentEmail ||
      student.parentInfo?.guardian?.email === parentEmail;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

// Get child attendance
exports.getChildAttendance = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { subject, startDate, endDate } = req.query;

    // Verify parent access
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const parentEmail = req.user.email;
    const hasAccess =
      student.parentInfo?.father?.email === parentEmail ||
      student.parentInfo?.mother?.email === parentEmail ||
      student.parentInfo?.guardian?.email === parentEmail;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const query = { student: studentId };
    if (subject) query.subject = subject;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendance = await Attendance.find(query)
      .populate('subject', 'name code')
      .sort({ date: -1 });

    const stats = await Attendance.calculateAttendance(studentId, subject);

    res.json({
      success: true,
      data: {
        attendance,
        statistics: stats,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get child marks
exports.getChildMarks = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester } = req.query;

    // Verify parent access
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const parentEmail = req.user.email;
    const hasAccess =
      student.parentInfo?.father?.email === parentEmail ||
      student.parentInfo?.mother?.email === parentEmail ||
      student.parentInfo?.guardian?.email === parentEmail;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const query = { student: studentId };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const marks = await Marks.find(query)
      .populate('exam', 'name type date')
      .populate('subject', 'name code credits')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
};

// Get child fees
exports.getChildFees = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { status, academicYear } = req.query;

    // Verify parent access
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const parentEmail = req.user.email;
    const hasAccess =
      student.parentInfo?.father?.email === parentEmail ||
      student.parentInfo?.mother?.email === parentEmail ||
      student.parentInfo?.guardian?.email === parentEmail;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const query = { student: studentId };
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;

    const fees = await Fee.find(query).sort({ dueDate: -1 });

    res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    next(error);
  }
};

// Get notices for child
exports.getChildNotices = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Verify parent access
    const student = await Student.findById(studentId).populate('department');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const parentEmail = req.user.email;
    const hasAccess =
      student.parentInfo?.father?.email === parentEmail ||
      student.parentInfo?.mother?.email === parentEmail ||
      student.parentInfo?.guardian?.email === parentEmail;

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const notices = await Notice.find({
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { targetAudience: 'parents' },
        { targetAudience: 'specific_department', departments: student.department._id },
        { targetAudience: 'specific_year', years: student.year },
      ],
    })
      .populate('createdBy', 'name')
      .sort({ isPinned: -1, publishDate: -1 })
      .limit(20);

    res.json({
      success: true,
      data: notices,
    });
  } catch (error) {
    next(error);
  }
};
