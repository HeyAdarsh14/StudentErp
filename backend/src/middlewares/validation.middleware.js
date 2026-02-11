const { body, param, query, validationResult } = require('express-validator');
const MESSAGES = require('../constants/messages');

/**
 * Validation result checker
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: MESSAGES.VALIDATION_ERROR,
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Auth validations
 */
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('role').notEmpty().withMessage('Role is required'),
  validate,
];

const changePasswordValidation = [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
  validate,
];

/**
 * Student validations
 */
const createStudentValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('contactNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit contact number is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1 and 4'),
  body('section').notEmpty().withMessage('Section is required'),
  body('semester')
    .isInt({ min: 1, max: 8 })
    .withMessage('Semester must be between 1 and 8'),
  validate,
];

const updateStudentValidation = [
  param('id').isMongoId().withMessage('Invalid student ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('contactNumber')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit contact number is required'),
  validate,
];

/**
 * Faculty validations
 */
const createFacultyValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('contactNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Valid 10-digit contact number is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
  validate,
];

/**
 * Attendance validations
 */
const markAttendanceValidation = [
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('attendanceData').isArray().withMessage('Attendance data must be an array'),
  body('attendanceData.*.studentId')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  body('attendanceData.*.status')
    .isIn(['present', 'absent', 'late', 'excused'])
    .withMessage('Invalid attendance status'),
  validate,
];

/**
 * Marks validations
 */
const uploadMarksValidation = [
  body('examId').isMongoId().withMessage('Valid exam ID is required'),
  body('subjectId').isMongoId().withMessage('Valid subject ID is required'),
  body('marksData').isArray().withMessage('Marks data must be an array'),
  body('marksData.*.studentId')
    .isMongoId()
    .withMessage('Valid student ID is required'),
  body('marksData.*.marks')
    .isNumeric()
    .withMessage('Marks must be a number')
    .custom((value, { req }) => {
      if (value < 0) throw new Error('Marks cannot be negative');
      return true;
    }),
  validate,
];

/**
 * Fee validations
 */
const createFeeValidation = [
  body('studentId').isMongoId().withMessage('Valid student ID is required'),
  body('feeType').notEmpty().withMessage('Fee type is required'),
  body('amount').isNumeric().withMessage('Amount must be a number'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  validate,
];

/**
 * Notice validations
 */
const createNoticeValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('targetAudience')
    .isArray()
    .withMessage('Target audience must be an array')
    .notEmpty()
    .withMessage('At least one target audience is required'),
  validate,
];

/**
 * Pagination validation
 */
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

/**
 * ID param validation
 */
const idValidation = [
  param('id').isMongoId().withMessage('Invalid ID format'),
  validate,
];

module.exports = {
  validate,
  loginValidation,
  registerValidation,
  changePasswordValidation,
  createStudentValidation,
  updateStudentValidation,
  createFacultyValidation,
  markAttendanceValidation,
  uploadMarksValidation,
  createFeeValidation,
  createNoticeValidation,
  paginationValidation,
  idValidation,
};
