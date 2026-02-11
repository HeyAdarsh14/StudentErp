const express = require('express');
const router = express.Router();
const contentController = require('../controllers/content.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Create/upload content (Faculty/Admin)
router.post(
  '/',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.createContent
);

// List content with filters
router.get('/', authenticate, contentController.listContent);

// Get content by subject (grouped)
router.get('/subject/:subjectId', authenticate, contentController.getContentBySubject);

// Get single content
router.get('/:id', authenticate, contentController.getContent);

// Update content (Faculty/Admin)
router.put(
  '/:id',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.updateContent
);

// Delete content (Faculty/Admin)
router.delete(
  '/:id',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.deleteContent
);

// Track download
router.post('/:id/download', authenticate, contentController.trackDownload);

// Get statistics (Faculty/Admin)
router.get(
  '/:id/stats',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.getContentStats
);

// Upload new version (Faculty/Admin)
router.post(
  '/:id/version',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.uploadNewVersion
);

// Get version history (Faculty/Admin)
router.get(
  '/:id/versions',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  contentController.getVersionHistory
);

module.exports = router;
