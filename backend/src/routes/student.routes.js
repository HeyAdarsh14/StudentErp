const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission, isOwnerOrHasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { paginationValidation, idValidation, updateStudentValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/students
 * @desc    Get all students
 * @access  Private (Faculty, Admin)
 */
router.get(
  '/',
  hasPermission(PERMISSIONS.STUDENT_READ_ALL),
  paginationValidation,
  studentController.getAllStudents
);

/**
 * @route   GET /api/students/:id
 * @desc    Get student by ID
 * @access  Private (Student themselves, Faculty, Admin)
 */
router.get(
  '/:id',
  idValidation,
  studentController.getStudentById
);

/**
 * @route   PUT /api/students/:id
 * @desc    Update student
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  hasPermission(PERMISSIONS.STUDENT_UPDATE),
  idValidation,
  updateStudentValidation,
  auditLogger('UPDATE', 'STUDENT'),
  studentController.updateStudent
);

/**
 * @route   DELETE /api/students/:id
 * @desc    Delete student
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  hasPermission(PERMISSIONS.STUDENT_DELETE),
  idValidation,
  auditLogger('DELETE', 'STUDENT'),
  studentController.deleteStudent
);

/**
 * @route   GET /api/students/:id/attendance
 * @desc    Get student attendance
 * @access  Private
 */
router.get(
  '/:id/attendance',
  idValidation,
  studentController.getStudentAttendance
);

/**
 * @route   GET /api/students/:id/marks
 * @desc    Get student marks
 * @access  Private
 */
router.get(
  '/:id/marks',
  idValidation,
  studentController.getStudentMarks
);

/**
 * @route   GET /api/students/:id/fees
 * @desc    Get student fees
 * @access  Private
 */
router.get(
  '/:id/fees',
  idValidation,
  studentController.getStudentFees
);

module.exports = router;
