const express = require('express');
const router = express.Router();
const {
  getChildren,
  getChildDetails,
  getChildAttendance,
  getChildMarks,
  getChildFees,
  getChildNotices,
} = require('../controllers/parent.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

router.use(authenticate);
router.use(hasRole([ROLES.PARENT]));

// Get all children linked to parent
router.get('/children', getChildren);

// Get child details
router.get('/children/:studentId', getChildDetails);

// Get child attendance
router.get('/children/:studentId/attendance', getChildAttendance);

// Get child marks
router.get('/children/:studentId/marks', getChildMarks);

// Get child fees
router.get('/children/:studentId/fees', getChildFees);

// Get child notices
router.get('/children/:studentId/notices', getChildNotices);

module.exports = router;
