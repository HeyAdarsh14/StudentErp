const logger = require('../utils/logger');
const MESSAGES = require('../constants/messages');

/**
 * Generate correlation ID for request tracking
 */
const generateCorrelationId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request correlation middleware
 */
const correlationMiddleware = (req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateCorrelationId();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
};

/**
 * Error classification
 */
const getErrorType = (err) => {
  if (err.name === 'ValidationError') return 'VALIDATION_ERROR';
  if (err.code === 11000) return 'DUPLICATE_ERROR';
  if (err.name === 'CastError') return 'CAST_ERROR';
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return 'AUTH_ERROR';
  if (err.name === 'MulterError') return 'UPLOAD_ERROR';
  if (err.statusCode >= 400 && err.statusCode < 500) return 'CLIENT_ERROR';
  if (err.statusCode >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN_ERROR';
};

/**
 * Enhanced error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  const correlationId = req.correlationId || generateCorrelationId();
  const errorType = getErrorType(err);
  
  // Enhanced error logging
  logger.error(`Error [${correlationId}]: ${err.message}`, {
    correlationId,
    errorType,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query
  });

  const baseResponse = {
    success: false,
    correlationId,
    errorType,
    timestamp: new Date().toISOString(),
    path: req.path
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
        correlationId: req.correlationId
      };
      next(err);
    });
  };
};

module.exports = { errorHandler, notFound, asyncHandler, correlationMiddleware };
