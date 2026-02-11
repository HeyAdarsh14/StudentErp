const express = require('express');
const router = express.Router();
const {
  uploadDocument,
  getAllDocuments,
  getDocumentById,
  verifyDocument,
  deleteDocument,
} = require('../controllers/document.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { uploadSingle } = require('../middlewares/upload.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');

router.use(authenticate);

// Upload document
router.post('/', uploadSingle, auditLogger('CREATE', 'DOCUMENT'), uploadDocument);

// Get all documents
router.get('/', getAllDocuments);

// Get document by ID
router.get('/:id', getDocumentById);

// Verify document (admin only)
router.patch('/:id/verify', hasPermission(PERMISSIONS.USER_UPDATE), auditLogger('UPDATE', 'DOCUMENT'), verifyDocument);

// Delete document
router.delete('/:id', auditLogger('DELETE', 'DOCUMENT'), deleteDocument);

module.exports = router;
