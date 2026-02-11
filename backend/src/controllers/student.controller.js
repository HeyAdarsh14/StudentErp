const Student = require('../models/Student.model');
const User = require('../models/User.model');
const { paginate, formatPaginationResponse, sanitizeUser } = require('../utils/helpers');
const MESSAGES = require('../constants/messages');

/**
 * Get all students
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, year, semester, section, search, academicStatus } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const query = {};
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);
    if (section) query.section = section.toUpperCase();
    if (academicStatus) query.academicStatus = academicStatus;

    if (search) {
      // Search in student's user details
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
        role: 'student',
      }).select('_id');
      
      const userIds = users.map(u => u._id);
      query.$or = [
        { userId: { $in: userIds } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('userId', 'name email contactNumber profileImage')
        .populate('department', 'name code')
        .populate('subjects', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Student.countDocuments(query),
    ]);

    res.json({
      success: true,
      ...formatPaginationResponse(students, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student by ID
 */
const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('userId', 'name email contactNumber profileImage address dateOfBirth gender')
      .populate('department', 'name code')
      .populate('subjects', 'name code credits');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
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

/**
 * Update student
 */
const updateStudent = async (req, res, next) => {
  try {
    const { userId, ...studentUpdates } = req.body;

    // Update student profile
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      studentUpdates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email contactNumber')
     .populate('department', 'name code');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    // Update user if userId data provided
    if (userId) {
      await User.findByIdAndUpdate(
        student.userId._id,
        userId,
        { runValidators: true }
      );
    }

    res.json({
      success: true,
      message: MESSAGES.STUDENT_UPDATED,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete student (soft delete)
 */
const deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        academicStatus: 'dropout',
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    // Also deactivate user account
    await User.findByIdAndUpdate(student.userId, {
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: MESSAGES.STUDENT_DELETED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student attendance summary
 */
const getStudentAttendance = async (req, res, next) => {
  try {
    const Attendance = require('../models/Attendance.model');
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const { subjectId, startDate, endDate } = req.query;

    // Calculate attendance
    const attendanceStats = await Attendance.calculateAttendance(student._id, subjectId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      academicYear: student.academicYear,
      semester: student.semester,
    });

    res.json({
      success: true,
      data: attendanceStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student marks
 */
const getStudentMarks = async (req, res, next) => {
  try {
    const Marks = require('../models/Marks.model');
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const { academicYear, semester } = req.query;

    const query = { student: student._id };
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const marks = await Marks.find(query)
      .populate('subject', 'name code credits')
      .populate('exam', 'name type date totalMarks')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student fees
 */
const getStudentFees = async (req, res, next) => {
  try {
    const Fee = require('../models/Fee.model');
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.STUDENT_NOT_FOUND,
      });
    }

    const { academicYear, status } = req.query;

    const query = { student: student._id };
    if (academicYear) query.academicYear = academicYear;
    if (status) query.status = status;

    const fees = await Fee.find(query).sort({ dueDate: -1 });

    res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentAttendance,
  getStudentMarks,
  getStudentFees,
};
