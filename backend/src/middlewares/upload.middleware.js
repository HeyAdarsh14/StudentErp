const multer = require('multer');
const path = require('path');
const config = require('../config/env');

// Memory storage for cloud uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (config.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
  }
};

// Single file upload (for cloud)
const uploadSingle = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter,
}).single('file');

// Multiple files upload
const uploadMultiple = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter,
}).array('files', 10);

// Single file upload to disk
const uploadToDisk = multer({
  storage: diskStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter,
}).single('file');

// Profile image upload
const uploadProfileImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for profile images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for profile pictures.'), false);
    }
  },
}).single('profileImage');

// Document upload (PDF only)
const uploadDocument = multer({
  storage: memoryStorage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'), false);
    }
  },
}).single('document');

module.exports = {
  uploadSingle,
  uploadMultiple,
  uploadToDisk,
  uploadProfileImage,
  uploadDocument,
};
