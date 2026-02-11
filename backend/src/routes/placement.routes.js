const express = require('express');
const router = express.Router();
const {
  createCompany,
  getCompanies,
  getCompany,
  updateCompany,
  verifyCompany,
  toggleBlacklist,
  deleteCompany,
  createJobPosting,
  getJobPostings,
  getJobPosting,
  updateJobPosting,
  toggleJobStatus,
  deleteJobPosting,
  applyForJob,
  getApplications,
  getApplication,
  updateApplicationStatus,
  scheduleInterview,
  makeOffer,
  respondToOffer,
  withdrawApplication,
  getPlacementStatistics,
  getStudentPlacementProfile,
} = require('../controllers/placement.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const {
  PERMISSIONS: { PLACEMENT },
} = require('../constants/permissions');

// Apply authentication to all routes
router.use(authenticate);

/**
 * ============================================
 * COMPANY ROUTES
 * ============================================
 */

router
  .route('/companies')
  .post(
    hasPermission(PLACEMENT.CREATE_COMPANY),
    auditLogger('CREATE_COMPANY'),
    createCompany
  )
  .get(hasPermission(PLACEMENT.VIEW_COMPANIES), getCompanies);

router
  .route('/companies/:id')
  .get(hasPermission(PLACEMENT.VIEW_COMPANIES), getCompany)
  .put(
    hasPermission(PLACEMENT.UPDATE_COMPANY),
    auditLogger('UPDATE_COMPANY'),
    updateCompany
  )
  .delete(
    hasPermission(PLACEMENT.DELETE_COMPANY),
    auditLogger('DELETE_COMPANY'),
    deleteCompany
  );

router
  .route('/companies/:id/verify')
  .put(
    hasPermission(PLACEMENT.VERIFY_COMPANY),
    auditLogger('VERIFY_COMPANY'),
    verifyCompany
  );

router
  .route('/companies/:id/blacklist')
  .put(
    hasPermission(PLACEMENT.BLACKLIST_COMPANY),
    auditLogger('BLACKLIST_COMPANY'),
    toggleBlacklist
  );

/**
 * ============================================
 * JOB POSTING ROUTES
 * ============================================
 */

router
  .route('/jobs')
  .post(
    hasPermission(PLACEMENT.CREATE_JOB),
    auditLogger('CREATE_JOB_POSTING'),
    createJobPosting
  )
  .get(getJobPostings); // All authenticated users can view jobs

router
  .route('/jobs/:id')
  .get(getJobPosting) // All authenticated users can view job details
  .put(
    hasPermission(PLACEMENT.UPDATE_JOB),
    auditLogger('UPDATE_JOB_POSTING'),
    updateJobPosting
  )
  .delete(
    hasPermission(PLACEMENT.DELETE_JOB),
    auditLogger('DELETE_JOB_POSTING'),
    deleteJobPosting
  );

router
  .route('/jobs/:id/toggle')
  .put(
    hasPermission(PLACEMENT.UPDATE_JOB),
    auditLogger('TOGGLE_JOB_STATUS'),
    toggleJobStatus
  );

/**
 * ============================================
 * APPLICATION ROUTES
 * ============================================
 */

router
  .route('/applications')
  .post(
    hasPermission(PLACEMENT.APPLY_JOB),
    auditLogger('APPLY_FOR_JOB'),
    applyForJob
  )
  .get(getApplications); // Students see their own, officers see all

router
  .route('/applications/:id')
  .get(getApplication);

router
  .route('/applications/:id/status')
  .put(
    hasPermission(PLACEMENT.UPDATE_APPLICATION_STATUS),
    auditLogger('UPDATE_APPLICATION_STATUS'),
    updateApplicationStatus
  );

router
  .route('/applications/:id/interview')
  .post(
    hasPermission(PLACEMENT.SCHEDULE_INTERVIEW),
    auditLogger('SCHEDULE_INTERVIEW'),
    scheduleInterview
  );

router
  .route('/applications/:id/offer')
  .post(
    hasPermission(PLACEMENT.MAKE_OFFER),
    auditLogger('MAKE_OFFER'),
    makeOffer
  );

router
  .route('/applications/:id/offer/respond')
  .put(
    hasPermission(PLACEMENT.RESPOND_TO_OFFER),
    auditLogger('RESPOND_TO_OFFER'),
    respondToOffer
  );

router
  .route('/applications/:id/withdraw')
  .put(
    hasPermission(PLACEMENT.APPLY_JOB),
    auditLogger('WITHDRAW_APPLICATION'),
    withdrawApplication
  );

/**
 * ============================================
 * STATISTICS & PROFILE ROUTES
 * ============================================
 */

router
  .route('/statistics')
  .get(hasPermission(PLACEMENT.VIEW_STATISTICS), getPlacementStatistics);

router
  .route('/profile')
  .get(hasPermission(PLACEMENT.APPLY_JOB), getStudentPlacementProfile);

module.exports = router;
