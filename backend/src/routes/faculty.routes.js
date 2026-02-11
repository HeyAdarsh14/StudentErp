const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { paginationValidation, idValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/faculty
 * @desc    Get all faculty
 * @access  Private (Admin, Faculty)
 */
router.get(
  '/',
  hasPermission(PERMISSIONS.FACULTY_READ_ALL),
  paginationValidation,
  facultyController.getAllFaculty
);

/**
 * @route   GET /api/faculty/:id
 * @desc    Get faculty by ID
 * @access  Private
 */
router.get(
  '/:id',
  idValidation,
  facultyController.getFacultyById
);

/**
 * @route   PUT /api/faculty/:id
 * @desc    Update faculty
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  hasPermission(PERMISSIONS.FACULTY_UPDATE),
  idValidation,
  auditLogger('UPDATE', 'FACULTY'),
  facultyController.updateFaculty
);

/**
 * @route   DELETE /api/faculty/:id
 * @desc    Delete faculty
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  hasPermission(PERMISSIONS.FACULTY_DELETE),
  idValidation,
  auditLogger('DELETE', 'FACULTY'),
  facultyController.deleteFaculty
);

/**
 * @route   GET /api/faculty/:id/workload
 * @desc    Get faculty workload
 * @access  Private
 */
router.get(
  '/:id/workload',
  idValidation,
  facultyController.getFacultyWorkload
);

module.exports = router;
