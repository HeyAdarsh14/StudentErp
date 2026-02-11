const express = require('express');
const router = express.Router();
const assignmentCtrl = require('../controllers/assignment.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Create assignment (faculty/admin)
router.post('/', authenticate, rbac.hasRole([ROLES.FACULTY, ROLES.ADMIN]), assignmentCtrl.createAssignment);

// List assignments
router.get('/', authenticate, assignmentCtrl.listAssignments);

// Get assignment
router.get('/:id', authenticate, assignmentCtrl.getAssignment);

// Update assignment (faculty/admin)
router.put('/:id', authenticate, rbac.hasRole([ROLES.FACULTY, ROLES.ADMIN]), assignmentCtrl.updateAssignment);

// Delete assignment (faculty/admin)
router.delete('/:id', authenticate, rbac.hasRole([ROLES.FACULTY, ROLES.ADMIN]), assignmentCtrl.deleteAssignment);

// Student submit
router.post('/:id/submit', authenticate, rbac.hasRole(ROLES.STUDENT), assignmentCtrl.submitAssignment);

// Grade submission (faculty)
router.post('/:id/grade/:submissionId', authenticate, rbac.hasRole([ROLES.FACULTY, ROLES.ADMIN]), assignmentCtrl.gradeSubmission);

module.exports = router;
