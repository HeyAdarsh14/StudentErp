const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission, hasRole } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { ROLES } = require('../constants/roles');
const {
  createStudentValidation,
  createFacultyValidation,
  paginationValidation,
  idValidation,
} = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');

// All routes require authentication and admin role
router.use(authenticate);
router.use(hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Private (Admin)
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route   POST /api/admin/students
 * @desc    Create new student
 * @access  Private (Admin)
 */
router.post(
  '/students',
  hasPermission(PERMISSIONS.STUDENT_CREATE),
  createStudentValidation,
  auditLogger('CREATE', 'STUDENT'),
  adminController.createStudent
);

/**
 * @route   POST /api/admin/faculty
 * @desc    Create new faculty
 * @access  Private (Admin)
 */
router.post(
  '/faculty',
  hasPermission(PERMISSIONS.FACULTY_CREATE),
  createFacultyValidation,
  auditLogger('CREATE', 'FACULTY'),
  adminController.createFaculty
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filters
 * @access  Private (Admin)
 */
router.get(
  '/users',
  hasPermission(PERMISSIONS.USER_READ_ALL),
  paginationValidation,
  adminController.getAllUsers
);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin)
 */
router.get(
  '/users/:id',
  hasPermission(PERMISSIONS.USER_READ),
  idValidation,
  adminController.getUserById
);

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put(
  '/users/:id',
  hasPermission(PERMISSIONS.USER_UPDATE),
  idValidation,
  auditLogger('UPDATE', 'USER'),
  adminController.updateUser
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/users/:id',
  hasPermission(PERMISSIONS.USER_DELETE),
  idValidation,
  auditLogger('DELETE', 'USER'),
  adminController.deleteUser
);

/**
 * @route   POST /api/admin/departments
 * @desc    Create department
 * @access  Private (Admin)
 */
router.post(
  '/departments',
  hasPermission(PERMISSIONS.DEPARTMENT_CREATE),
  auditLogger('CREATE', 'DEPARTMENT'),
  adminController.createDepartment
);

/**
 * @route   GET /api/admin/departments
 * @desc    Get all departments
 * @access  Private (Admin)
 */
router.get(
  '/departments',
  hasPermission(PERMISSIONS.DEPARTMENT_READ),
  adminController.getAllDepartments
);

/**
 * @route   POST /api/admin/subjects
 * @desc    Create subject
 * @access  Private (Admin)
 */
router.post(
  '/subjects',
  hasPermission(PERMISSIONS.SUBJECT_CREATE),
  auditLogger('CREATE', 'SUBJECT'),
  adminController.createSubject
);

/**
 * @route   GET /api/admin/subjects
 * @desc    Get all subjects
 * @access  Private (Admin)
 */
router.get(
  '/subjects',
  hasPermission(PERMISSIONS.SUBJECT_READ),
  adminController.getAllSubjects
);

module.exports = router;
