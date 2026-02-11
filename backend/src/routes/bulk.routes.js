const express = require('express');
const router = express.Router();
const { bulkImportStudents, bulkImportFaculty } = require('../controllers/bulk.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const multer = require('multer');
const { auditLogger } = require('../middlewares/audit.middleware');

// Multer configuration for CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/csv/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authenticate);

// Bulk import students
router.post(
  '/students',
  hasPermission(PERMISSIONS.STUDENT_CREATE),
  upload.single('csvFile'),
  auditLogger('CREATE', 'STUDENT'),
  bulkImportStudents
);

// Bulk import faculty
router.post(
  '/faculty',
  hasPermission(PERMISSIONS.FACULTY_CREATE),
  upload.single('csvFile'),
  auditLogger('CREATE', 'FACULTY'),
  bulkImportFaculty
);

module.exports = router;
