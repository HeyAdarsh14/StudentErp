const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler, notFound, correlationMiddleware } = require('./middlewares/error.middleware');
const { performanceMonitor, metricsEndpoint, resetEndpoint } = require('./middlewares/performance.middleware');
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

// Request correlation for tracking
app.use(correlationMiddleware);

// Performance monitoring
app.use(performanceMonitor);

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

// API versioning middleware
const APIVersion = (version) => {
  return (req, res, next) => {
    req.apiVersion = version;
    next();
  };
};

// Health check route
app.get('/health', async (req, res) => {
  const healthData = {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV,
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
    },
    version: '3.0.0',
    node_version: process.version
  };

  // Database connectivity check
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      healthData.database = { status: 'connected', name: mongoose.connection.name };
    } else {
      healthData.database = { status: 'disconnected' };
      res.status(503);
    }
  } catch (error) {
    healthData.database = { status: 'error', message: error.message };
    res.status(503);
  }

  res.json(healthData);
});

// Detailed health check for monitoring systems
app.get('/health/detailed', async (req, res) => {
  const mongoose = require('mongoose');
  const os = require('os');
  
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      service: 'college-erp-backend',
      version: '3.0.0',
      status: 'healthy',
      checks: {
        database: {
          status: mongoose.connection.readyState === 1 ? 'pass' : 'fail',
          componentType: 'datastore',
          time: new Date().toISOString()
        },
        memory: {
          status: process.memoryUsage().heapUsed < 1024 * 1024 * 1024 ? 'pass' : 'warn', // 1GB threshold
          componentType: 'system',
          observedValue: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          observedUnit: 'MB',
          threshold: 1024
        },
        uptime: {
          status: 'pass',
          componentType: 'system',
          observedValue: Math.round(process.uptime()),
          observedUnit: 'seconds'
        }
      },
      system: {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        loadavg: os.loadavg(),
        freemem: Math.round(os.freemem() / 1024 / 1024),
        totalmem: Math.round(os.totalmem() / 1024 / 1024)
      }
    };

    // Check if any check failed
    const hasFailures = Object.values(checks.checks).some(check => check.status === 'fail');
    if (hasFailures) {
      checks.status = 'unhealthy';
      return res.status(503).json(checks);
    }

    res.json(checks);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Performance metrics endpoint
app.get('/metrics', metricsEndpoint);

// Performance metrics reset endpoint (protected in production)
if (config.NODE_ENV !== 'production') {
  app.post('/metrics/reset', resetEndpoint);
}

// API v1 routes
const v1Router = express.Router();
app.use('/api/v1', APIVersion('v1'), v1Router);

// Mount all routes on v1
v1Router.use('/auth', require('./routes/auth.routes'));
v1Router.use('/admin', require('./routes/admin.routes'));
v1Router.use('/students', require('./routes/student.routes'));
v1Router.use('/faculty', require('./routes/faculty.routes'));
v1Router.use('/departments', require('./routes/department.routes'));
v1Router.use('/subjects', require('./routes/subject.routes'));
v1Router.use('/attendance', require('./routes/attendance.routes'));
v1Router.use('/exams', require('./routes/exam.routes'));
v1Router.use('/marks', require('./routes/marks.routes'));
v1Router.use('/fees', require('./routes/fee.routes'));
v1Router.use('/notices', require('./routes/notice.routes'));
v1Router.use('/timetable', require('./routes/timetable.routes'));
v1Router.use('/calendar', require('./routes/calendar.routes'));
v1Router.use('/notifications', require('./routes/notification.routes'));
v1Router.use('/reports', require('./routes/report.routes'));
v1Router.use('/analytics', require('./routes/analytics.routes'));

// Phase 5 LMS routes
v1Router.use('/assignments', require('./routes/assignment.routes'));
v1Router.use('/quizzes', require('./routes/quiz.routes'));
v1Router.use('/content', require('./routes/content.routes'));
v1Router.use('/gradebook', require('./routes/gradebook.routes'));

// Phase 3 routes
v1Router.use('/leave', require('./routes/leave.routes'));
v1Router.use('/documents', require('./routes/document.routes'));
v1Router.use('/parent', require('./routes/parent.routes'));
v1Router.use('/bulk', require('./routes/bulk.routes'));
v1Router.use('/performance', require('./routes/performance.routes'));

// Phase 4 routes - Payment Gateway
v1Router.use('/payment', require('./routes/payment.routes'));
v1Router.use('/fee-management', require('./routes/feeManagement.routes'));

// Phase 7 routes - Placement Module
v1Router.use('/placement', require('./routes/placement.routes'));

// Phase 8 routes - Communications Hub
v1Router.use('/communication', require('./routes/communication.routes'));

// Phase 10 routes - AI Features
v1Router.use('/ai', require('./routes/ai.routes'));

// Backward compatibility - keep existing /api routes
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
    version: '3.0.0',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      v1: '/api/v1',
      auth: '/api/v1/auth (also /api/auth for backward compatibility)',
      students: '/api/v1/students',
      faculty: '/api/v1/faculty',
      admin: '/api/v1/admin'
    },
    deprecation: {
      message: 'Non-versioned endpoints (/api/*) are deprecated. Please use /api/v1/* instead.',
      sunset: '2026-12-31'
    }
  });
});

// API v1 root endpoint
v1Router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'College ERP API v1',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    features: ['Authentication', 'Student Management', 'Faculty Management', 'LMS', 'Payments', 'Analytics']
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
