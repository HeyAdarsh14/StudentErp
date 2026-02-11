const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');
const logger = require('./utils/logger');

// Create Express app
const app = express();

// Security middleware
app.use(helmet()); // Set security headers
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize()); // Against NoSQL injection
app.use(xss()); // Against XSS attacks
app.use(hpp()); // Against parameter pollution

// Logging middleware
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// Apply rate limiting to all routes
app.use('/api/', apiLimiter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/students', require('./routes/student.routes'));
app.use('/api/faculty', require('./routes/faculty.routes'));
app.use('/api/departments', require('./routes/department.routes'));
app.use('/api/subjects', require('./routes/subject.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/exams', require('./routes/exam.routes'));
app.use('/api/marks', require('./routes/marks.routes'));
app.use('/api/fees', require('./routes/fee.routes'));
app.use('/api/notices', require('./routes/notice.routes'));
app.use('/api/timetable', require('./routes/timetable.routes'));
app.use('/api/calendar', require('./routes/calendar.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/reports', require('./routes/report.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));

// Phase 5 LMS routes
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/quizzes', require('./routes/quiz.routes'));
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/gradebook', require('./routes/gradebook.routes'));

// Phase 3 routes
app.use('/api/leave', require('./routes/leave.routes'));
app.use('/api/documents', require('./routes/document.routes'));
app.use('/api/parent', require('./routes/parent.routes'));
app.use('/api/bulk', require('./routes/bulk.routes'));
app.use('/api/performance', require('./routes/performance.routes'));

// Phase 4 routes - Payment Gateway
app.use('/api/payment', require('./routes/payment.routes'));
app.use('/api/fee-management', require('./routes/feeManagement.routes'));

// Phase 7 routes - Placement Module
app.use('/api/placement', require('./routes/placement.routes'));

// Phase 8 routes - Communications Hub
app.use('/api/communication', require('./routes/communication.routes'));

// Phase 10 routes - AI Features
app.use('/api/ai', require('./routes/ai.routes'));

// API root route - Status endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'College ERP API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      students: '/api/student',
      faculty: '/api/faculty',
      admin: '/api/admin'
    }
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
