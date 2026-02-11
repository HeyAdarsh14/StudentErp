const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetable.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Auto-generate timetable (Admin/Faculty)
router.post(
  '/auto-generate',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  timetableController.autoGenerateTimetable
);

// Create manual slot (Admin/Faculty)
router.post(
  '/slot',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  timetableController.createTimetableSlot
);

// Get timetable (All authenticated users)
router.get('/', authenticate, timetableController.getTimetable);

// Get faculty timetable
router.get('/faculty/:facultyId', authenticate, timetableController.getFacultyTimetable);

// Check availability
router.get('/check-availability', authenticate, timetableController.checkAvailability);

// Update slot (Admin/Faculty)
router.put(
  '/slot/:id',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  timetableController.updateTimetableSlot
);

// Delete slot (Admin/Faculty)
router.delete(
  '/slot/:id',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  timetableController.deleteTimetableSlot
);

// Swap slots (Admin/Faculty)
router.post(
  '/swap',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  timetableController.swapSlots
);

module.exports = router;
