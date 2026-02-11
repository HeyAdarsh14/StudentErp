const Faculty = require('../models/Faculty.model');
const User = require('../models/User.model');
const { paginate, formatPaginationResponse } = require('../utils/helpers');
const MESSAGES = require('../constants/messages');

/**
 * Get all faculty
 */
const getAllFaculty = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, designation, status, search } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const query = {};
    if (department) query.department = department;
    if (designation) query.designation = designation;
    if (status) query.status = status;

    if (search) {
      const users = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ],
        role: 'faculty',
      }).select('_id');
      
      const userIds = users.map(u => u._id);
      query.$or = [
        { userId: { $in: userIds } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    const [faculty, total] = await Promise.all([
      Faculty.find(query)
        .populate('userId', 'name email contactNumber profileImage')
        .populate('department', 'name code')
        .populate('subjects', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Faculty.countDocuments(query),
    ]);

    res.json({
      success: true,
      ...formatPaginationResponse(faculty, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get faculty by ID
 */
const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate('userId', 'name email contactNumber profileImage address dateOfBirth gender')
      .populate('department', 'name code')
      .populate('subjects', 'name code credits')
      .populate('classesAssigned.department', 'name code')
      .populate('classesAssigned.subject', 'name code');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.FACULTY_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: faculty,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update faculty
 */
const updateFaculty = async (req, res, next) => {
  try {
    const { userId, ...facultyUpdates } = req.body;

    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      facultyUpdates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email contactNumber')
     .populate('department', 'name code');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.FACULTY_NOT_FOUND,
      });
    }

    // Update user if userId data provided
    if (userId) {
      await User.findByIdAndUpdate(
        faculty.userId._id,
        userId,
        { runValidators: true }
      );
    }

    res.json({
      success: true,
      message: MESSAGES.FACULTY_UPDATED,
      data: faculty,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete faculty (soft delete)
 */
const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        status: 'resigned',
      }
    );

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.FACULTY_NOT_FOUND,
      });
    }

    // Also deactivate user account
    await User.findByIdAndUpdate(faculty.userId, {
      isActive: false,
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: MESSAGES.FACULTY_DELETED,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get faculty workload
 */
const getFacultyWorkload = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate('subjects', 'name code')
      .populate('classesAssigned.subject', 'name code');

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.FACULTY_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: {
        workload: faculty.workload,
        classesAssigned: faculty.classesAssigned,
        subjects: faculty.subjects,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllFaculty,
  getFacultyById,
  updateFaculty,
  deleteFaculty,
  getFacultyWorkload,
};
