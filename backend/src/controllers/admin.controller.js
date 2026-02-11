const User = require('../models/User.model');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const Department = require('../models/Department.model');
const Subject = require('../models/Subject.model');
const { hashPassword, sanitizeUser, generateUniqueId, paginate, formatPaginationResponse, getCurrentAcademicYear } = require('../utils/helpers');
const { sendWelcomeEmail } = require('../services/email.service');
const { createNotification } = require('../services/notification.service');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalDepartments,
      totalSubjects,
      activeStudents,
      activeFaculty,
    ] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Department.countDocuments(),
      Subject.countDocuments(),
      Student.countDocuments({ academicStatus: 'active' }),
      Faculty.countDocuments({ status: 'active' }),
    ]);

    // Get recent registrations (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentStudents = await Student.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const recentFaculty = await Faculty.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalFaculty,
          totalDepartments,
          totalSubjects,
          activeStudents,
          activeFaculty,
        },
        recent: {
          newStudents: recentStudents,
          newFaculty: recentFaculty,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new student
 */
const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      department,
      year,
      semester,
      section,
      batch,
      ...otherDetails
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.USER_ALREADY_EXISTS,
      });
    }

    // Create user account
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      contactNumber,
    });

    // Generate registration number
    const registrationNumber = generateUniqueId('STU');
    const academicYear = getCurrentAcademicYear();

    // Create student profile
    const student = await Student.create({
      userId: user._id,
      registrationNumber,
      rollNumber: otherDetails.rollNumber || registrationNumber,
      department,
      year,
      semester,
      section,
      batch: batch || academicYear,
      academicYear,
      ...otherDetails,
    });

    // Populate department
    await student.populate('department', 'name code');

    // Send welcome email
    try {
      await sendWelcomeEmail(user, password);
    } catch (error) {
      logger.error(`Welcome email failed: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      message: MESSAGES.STUDENT_CREATED,
      data: {
        user: sanitizeUser(user),
        student,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new faculty
 */
const createFaculty = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      contactNumber,
      department,
      designation,
      joiningDate,
      ...otherDetails
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.USER_ALREADY_EXISTS,
      });
    }

    // Create user account
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'faculty',
      contactNumber,
    });

    // Generate employee ID
    const employeeId = generateUniqueId('FAC');

    // Create faculty profile
    const faculty = await Faculty.create({
      userId: user._id,
      employeeId,
      department,
      designation,
      joiningDate: joiningDate || new Date(),
      ...otherDetails,
    });

    // Populate department
    await faculty.populate('department', 'name code');

    // Send welcome email
    try {
      await sendWelcomeEmail(user, password);
    } catch (error) {
      logger.error(`Welcome email failed: ${error.message}`);
    }

    res.status(201).json({
      success: true,
      message: MESSAGES.FACULTY_CREATED,
      data: {
        user: sanitizeUser(user),
        faculty,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users with filters
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, isActive, search } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const query = {};

    if (role) query.role = role;
    if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      ...formatPaginationResponse(users, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id })
        .populate('department', 'name code')
        .populate('subjects', 'name code');
    } else if (user.role === 'faculty') {
      roleData = await Faculty.findOne({ userId: user._id })
        .populate('department', 'name code')
        .populate('subjects', 'name code');
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        roleData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const allowedUpdates = ['name', 'contactNumber', 'isActive', 'address', 'dateOfBirth', 'gender'];
    
    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.USER_UPDATED,
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    // Also soft delete role-specific data
    if (user.role === 'student') {
      await Student.findOneAndUpdate(
        { userId: user._id },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id,
        }
      );
    } else if (user.role === 'faculty') {
      await Faculty.findOneAndUpdate(
        { userId: user._id },
        {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id,
        }
      );
    }

    res.json({
      success: true,
      message: MESSAGES.USER_DELETED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create department
 */
const createDepartment = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);

    res.status(201).json({
      success: true,
      message: MESSAGES.DEPARTMENT_CREATED,
      data: department,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create subject
 */
const createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create(req.body);
    await subject.populate('department', 'name code');

    res.status(201).json({
      success: true,
      message: MESSAGES.SUBJECT_CREATED,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all departments
 */
const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('hod', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all subjects
 */
const getAllSubjects = async (req, res, next) => {
  try {
    const { department, year, semester } = req.query;
    
    const query = { isActive: true };
    if (department) query.department = department;
    if (year) query.year = year;
    if (semester) query.semester = semester;

    const subjects = await Subject.find(query)
      .populate('department', 'name code')
      .populate('faculty', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  createStudent,
  createFaculty,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  createDepartment,
  createSubject,
  getAllDepartments,
  getAllSubjects,
};
