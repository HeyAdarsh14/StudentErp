const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendar.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Create event (Admin/Faculty)
router.post(
  '/',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  calendarController.createEvent
);

// Get events
router.get('/', authenticate, calendarController.getEvents);

// Get upcoming events
router.get('/upcoming', authenticate, calendarController.getUpcomingEvents);

// Get holidays
router.get('/holidays', authenticate, calendarController.getHolidays);

// Get single event
router.get('/:id', authenticate, calendarController.getEvent);

// Update event (Admin/Faculty)
router.put(
  '/:id',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.FACULTY]),
  calendarController.updateEvent
);

// Delete event (Admin)
router.delete(
  '/:id',
  authenticate,
  hasRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  calendarController.deleteEvent
);

module.exports = router;
