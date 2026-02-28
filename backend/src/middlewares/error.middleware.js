const logger = require('../utils/logger');
const MESSAGES = require('../constants/messages');

/**
 * Enhanced Error Middleware with Advanced Logging and Monitoring
 * @version 3.2.0
 * @updated February 28, 2026
 * @author College ERP Security Team
 */

/**
 * Generate enhanced correlation ID with timestamp and source
 */
const generateCorrelationId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const source = process.env.SERVICE_NAME || 'backend';
  return `${source}-${timestamp}-${random}`;
};

/**
 * Enhanced request correlation middleware with performance tracking
 */
const correlationMiddleware = (req, res, next) => {
  req.startTime = process.hrtime();
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  req.requestId = req.correlationId; // Alias for backward compatibility
  
  // Set response headers for tracking
  res.setHeader('x-correlation-id', req.correlationId);
  res.setHeader('x-request-id', req.correlationId);
  res.setHeader('x-response-time', ''); // Will be filled by response middleware
  
  // Enhanced request logging
  logger.info(`Request initiated [${req.correlationId}]`, {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'content-type': req.headers['content-type'],
      'accept': req.headers.accept
    }
  });
  
  next();
};

/**
 * Enhanced error classification with severity levels
 */
const getErrorDetails = (err) => {
  const details = {
    type: 'UNKNOWN_ERROR',
    severity: 'ERROR',
    category: 'APPLICATION',
    isRetryable: false,
    httpStatus: 500
  };

  if (err.name === 'ValidationError') {
    return { ...details, type: 'VALIDATION_ERROR', severity: 'WARNING', category: 'INPUT', httpStatus: 400 };
  }
  
  if (err.code === 11000) {
    return { ...details, type: 'DUPLICATE_ERROR', severity: 'INFO', category: 'DATA', httpStatus: 409 };
  }
  
  if (err.name === 'CastError') {
    return { ...details, type: 'CAST_ERROR', severity: 'WARNING', category: 'INPUT', httpStatus: 400 };
  }
  
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return { ...details, type: 'AUTH_ERROR', severity: 'WARNING', category: 'SECURITY', httpStatus: 401 };
  }
  
  if (err.name === 'MulterError') {
    return { ...details, type: 'UPLOAD_ERROR', severity: 'WARNING', category: 'FILE', httpStatus: 400 };
  }
  
  if (err.statusCode === 429) {
    return { ...details, type: 'RATE_LIMIT_ERROR', severity: 'INFO', category: 'THROTTLING', httpStatus: 429, isRetryable: true };
  }
  
  if (err.statusCode >= 400 && err.statusCode < 500) {
    return { ...details, type: 'CLIENT_ERROR', severity: 'WARNING', category: 'REQUEST', httpStatus: err.statusCode };
  }
  
  if (err.statusCode >= 500) {
    return { ...details, type: 'SERVER_ERROR', severity: 'ERROR', category: 'SYSTEM', httpStatus: err.statusCode };
  }
  
  return details;
};

/**
 * Enhanced security context extraction
 */
const getSecurityContext = (req) => {
  return {
    userId: req.user?.id,
    userRole: req.user?.role,
    sessionId: req.session?.id,
    ipAddress: req.ip,
    forwarded: req.headers['x-forwarded-for'],
    userAgent: req.get('User-Agent'),
    origin: req.headers.origin,
    referer: req.headers.referer
  };
};

/**
 * Performance metrics calculation
 */
const getPerformanceMetrics = (req) => {
  if (!req.startTime) return {};
  
  const diff = process.hrtime(req.startTime);
  const responseTime = (diff[0] * 1000) + (diff[1] * 1e-6); // Convert to milliseconds
  
  return {
    responseTime: Math.round(responseTime * 100) / 100,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage ? process.cpuUsage() : null
  };
};

/**
 * Enhanced error handling middleware with comprehensive logging
 */
const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || generateCorrelationId();
  const errorDetails = getErrorDetails(err);
  const securityContext = getSecurityContext(req);
  const performanceMetrics = getPerformanceMetrics(req);
  
  // Comprehensive error logging with structured data
  const errorLog = {
    correlationId,
    timestamp: new Date().toISOString(),
    error: {
      message: err.message,
      type: errorDetails.type,
      severity: errorDetails.severity,
      category: errorDetails.category,
      stack: err.stack,
      code: err.code,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      body: req.method !== 'GET' ? sanitizeRequestBody(req.body) : undefined,
      headers: sanitizeHeaders(req.headers)
    },
    security: securityContext,
    performance: performanceMetrics,
    environment: {
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      serviceVersion: process.env.npm_package_version
    }
  };

  // Log with appropriate level based on severity
  switch (errorDetails.severity) {
    case 'ERROR':
      logger.error(`Error [${correlationId}]: ${err.message}`, errorLog);
      break;
    case 'WARNING':
      logger.warn(`Warning [${correlationId}]: ${err.message}`, errorLog);
      break;
    case 'INFO':
      logger.info(`Info [${correlationId}]: ${err.message}`, errorLog);
      break;
    default:
      logger.error(`Unknown [${correlationId}]: ${err.message}`, errorLog);
  }

  // Send alert for critical errors
  if (errorDetails.severity === 'ERROR' && process.env.NODE_ENV === 'production') {
    sendErrorAlert(errorLog);
  }

  const baseResponse = {
    success: false,
    correlationId,
    errorType: errorDetails.type,
    errorCode: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
    path: req.path,
    isRetryable: errorDetails.isRetryable,
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        stack: err.stack,
        performance: performanceMetrics
      }
    })
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    return res.status(400).json({
      ...baseResponse,
      message: MESSAGES.VALIDATION_ERROR,
      errors,
      errorCode: 'VALIDATION_FAILED'
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const value = err.keyValue[field];
    return res.status(400).json({
      ...baseResponse,
      message: `${field} already exists`,
      errorCode: 'DUPLICATE_ENTRY',
      details: {
        field,
        value,
        constraint: 'unique'
      }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      ...baseResponse,
      message: 'Invalid ID format',
      errorCode: 'INVALID_ID_FORMAT',
      details: {
        field: err.path,
        value: err.value,
        expectedType: err.kind
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      ...baseResponse,
      message: MESSAGES.TOKEN_INVALID,
      errorCode: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      ...baseResponse,
      message: MESSAGES.TOKEN_EXPIRED,
      errorCode: 'EXPIRED_TOKEN',
      details: {
        expiredAt: err.expiredAt
      }
    });
  }

  // Multer errors (file upload)
  if (err.name === 'MulterError') {
    let errorCode = 'FILE_UPLOAD_ERROR';
    let message = `File upload error: ${err.message}`;
    
    if (err.code === 'LIMIT_FILE_SIZE') {
      errorCode = 'FILE_TOO_LARGE';
      message = 'File size exceeds limit';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      errorCode = 'TOO_MANY_FILES';
      message = 'Too many files uploaded';
    }

    return res.status(400).json({
      ...baseResponse,
      message,
      errorCode,
      details: {
        code: err.code,
        field: err.field
      }
    });
  }

  // Rate limit errors
  if (err.statusCode === 429) {
    return res.status(429).json({
      ...baseResponse,
      message: 'Too many requests. Please try again later.',
      errorCode: 'RATE_LIMIT_EXCEEDED',
      details: {
        retryAfter: err.retryAfter || 60
      }
    });
  }

  // Default error with enhanced details
  const statusCode = err.statusCode || 500;
  const message = err.message || MESSAGES.SERVER_ERROR;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'CLIENT_ERROR');

  res.status(statusCode).json({
    ...baseResponse,
    message,
    errorCode,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details 
    })
  });
};

/**
 * Enhanced 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const correlationId = req.correlationId || generateCorrelationId();
  
  logger.warn(`404 Not Found [${correlationId}]: ${req.originalUrl}`, {
    correlationId,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    message: MESSAGES.NOT_FOUND,
    errorCode: 'ENDPOINT_NOT_FOUND',
    correlationId,
    errorType: 'CLIENT_ERROR',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    suggestions: [
      'Check the API documentation',
      'Verify the endpoint URL',
      'Ensure you are using the correct HTTP method'
    ]
  });
};

/**
 * Async handler wrapper with enhanced error context
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Add request context to error
      err.requestContext = {
        path: req.path,
        method: req.method,
        correlationId: req.correlationId,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      };
      next(err);
    });
  };
};

/**
 * Data sanitization utilities
 */
const sanitizeRequestBody = (body) => {
  if (!body) return undefined;
  
  const sensitiveFields = ['password', 'secret', 'token', 'key', 'authorization'];
  const sanitized = { ...body };
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

const sanitizeHeaders = (headers) => {
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  const sanitized = { ...headers };
  
  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

/**
 * Error alert system
 */
const sendErrorAlert = async (errorLog) => {
  try {
    // Implementation for sending alerts (Slack, Email, etc.)
    if (process.env.SLACK_WEBHOOK_URL) {
      // Send Slack notification for critical errors
      console.log('ALERT: Critical error detected', {
        service: 'College ERP Backend',
        correlationId: errorLog.correlationId,
        error: errorLog.error.message,
        severity: errorLog.error.severity
      });
    }
    
    // Log alert attempt
    logger.info(`Error alert sent for correlation ID: ${errorLog.correlationId}`);
  } catch (alertError) {
    logger.error('Failed to send error alert:', alertError);
  }
};

/**
 * Enhanced response time middleware
 */
const responseTimeMiddleware = (req, res, next) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1000) + (diff[1] * 1e-6);
    
    res.setHeader('x-response-time', `${responseTime.toFixed(2)}ms`);
    
    // Log slow requests
    if (responseTime > 1000) { // Requests slower than 1 second
      logger.warn(`Slow request detected [${req.correlationId}]`, {
        correlationId: req.correlationId,
        method: req.method,
        url: req.originalUrl,
        responseTime: `${responseTime.toFixed(2)}ms`,
        statusCode: res.statusCode,
        userId: req.user?.id
      });
    }
  });
  
  next();
};

module.exports = { 
  errorHandler, 
  notFound, 
  asyncHandler, 
  correlationMiddleware,
  responseTimeMiddleware,
  sanitizeRequestBody,
  sanitizeHeaders
};
