const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getAllLeaves,
  getLeaveById,
  updateLeaveStatus,
  cancelLeave,
  getLeaveBalance,
} = require('../controllers/leave.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission, hasAnyPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { auditLogger } = require('../middlewares/audit.middleware');

router.use(authenticate);

// Apply for leave
router.post('/', hasAnyPermission([PERMISSIONS.FACULTY_UPDATE]), auditLogger('CREATE', 'LEAVE'), applyLeave);

// Get all leaves (admin/HOD)
router.get('/', hasAnyPermission([PERMISSIONS.FACULTY_READ_ALL, PERMISSIONS.USER_READ_ALL]), getAllLeaves);

// Get leave balance
router.get('/balance/:facultyId', getLeaveBalance);

// Get leave by ID
router.get('/:id', getLeaveById);

// Approve/Reject leave
router.patch('/:id/status', hasPermission(PERMISSIONS.FACULTY_UPDATE), auditLogger('UPDATE', 'LEAVE'), updateLeaveStatus);

// Cancel leave
router.patch('/:id/cancel', cancelLeave);

module.exports = router;
