const express = require('express');
const router = express.Router();
const {
  bulkCreateFees,
  applyScholarship,
  applyLateFee,
  sendFeeReminders,
  getFeeDefaulters,
  getFeeCollectionReport,
  waiveFee,
} = require('../controllers/feeManagement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { auditLogger } = require('../middlewares/audit.middleware');

router.use(authenticate);

// Bulk create fees (admin only)
router.post(
  '/bulk-create',
  hasPermission(PERMISSIONS.FEE_CREATE),
  auditLogger('CREATE', 'FEE'),
  bulkCreateFees
);

// Apply scholarship/discount
router.post(
  '/scholarship',
  hasPermission(PERMISSIONS.FEE_UPDATE),
  auditLogger('UPDATE', 'FEE'),
  applyScholarship
);

// Apply late fee
router.post(
  '/late-fee',
  hasPermission(PERMISSIONS.FEE_UPDATE),
  auditLogger('UPDATE', 'FEE'),
  applyLateFee
);

// Send fee reminders
router.post(
  '/send-reminders',
  hasPermission(PERMISSIONS.FEE_READ_ALL),
  sendFeeReminders
);

// Get fee defaulters
router.get(
  '/defaulters',
  hasPermission(PERMISSIONS.FEE_READ_ALL),
  getFeeDefaulters
);

// Get fee collection report
router.get(
  '/collection-report',
  hasPermission(PERMISSIONS.REPORT_READ),
  getFeeCollectionReport
);

// Waive fee
router.post(
  '/waive',
  hasPermission(PERMISSIONS.FEE_UPDATE),
  auditLogger('UPDATE', 'FEE'),
  waiveFee
);

module.exports = router;
