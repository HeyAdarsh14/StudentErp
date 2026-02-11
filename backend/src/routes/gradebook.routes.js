const express = require('express');
const router = express.Router();
const gradebookController = require('../controllers/gradebook.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Get student gradebook (Student sees own, Faculty/Admin can see any)
router.get('/student/:studentId', authenticate, gradebookController.getStudentGradebook);

// Get class gradebook (Faculty/Admin only)
router.get(
  '/class',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  gradebookController.getClassGradebook
);

// Export gradebook (Faculty/Admin only)
router.get(
  '/export',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  gradebookController.exportGradebook
);

module.exports = router;
