/**
 * Winston Logger Configuration
 * 
 * Enhanced logging system for the College ERP application with:
 * - Structured JSON logging for production
 * - Colorized console output for development  
 * - Automatic log rotation and cleanup
 * - Performance monitoring integration
 * 
 * @module Logger
 * @version 3.0.1
 * @author College ERP Development Team
 * @since 2024-01-01
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

/**
 * Ensure logs directory exists
 */
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format with enhanced metadata
 * Includes timestamp, service info, and structured error handling
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ 
    format: 'YYYY-MM-DD HH:mm:ss.SSS' 
  }),
  winston.format.errors({ 
    stack: true 
  }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp']
  }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Development console format for better readability
 */
const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ 
    format: 'HH:mm:ss' 
  }),
  winston.format.printf(({ level, message, timestamp, correlationId, userId }) => {
    let logLine = `${timestamp} [${level}]`;
    
    if (correlationId) {
      logLine += ` [${correlationId.slice(-8)}]`;
    }
    
    if (userId) {
      logLine += ` [User:${userId}]`;
    }
    
    logLine += `: ${message}`;
    return logLine;
  })
);

/**
 * Production log transports with file rotation
 */
const productionTransports = [
  // Error logs - separate file for easier monitoring
  new winston.transports.File({ 
    filename: path.join(logsDir, 'error.log'), 
    level: 'error',
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    format: logFormat
  }),
  
  // Combined logs - all levels
  new winston.transports.File({ 
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 10,
    format: logFormat
  }),
  
  // Application-specific logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    level: 'info',
    maxsize: 15 * 1024 * 1024, // 15MB
    maxFiles: 7,
    format: logFormat
  })
];

/**
 * Development transports - console only with pretty formatting
 */
const developmentTransports = [
  new winston.transports.Console({
    level: 'debug',
    format: devFormat,
    handleExceptions: true
  })
];

/**
 * Main logger instance with environment-specific configuration
 */
const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { 
    service: 'college-erp-backend',
    version: process.env.npm_package_version || '3.0.1',
    environment: config.NODE_ENV,
    pid: process.pid
  },
  transports: config.NODE_ENV === 'production' 
    ? productionTransports 
    : developmentTransports,
    
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ],
  
  // Handle promise rejections
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3
    })
  ],
  
  // Exit on handled exception
  exitOnError: config.NODE_ENV === 'production'
});

/**
 * Structured logging helper for consistent log formatting
 * 
 * @param {string} level - Log level (error, warn, info, debug)
 * @param {string} message - Primary log message
 * @param {Object} metadata - Additional structured data
 * @param {string} [metadata.correlationId] - Request correlation ID
 * @param {string} [metadata.userId] - User ID associated with action
 * @param {string} [metadata.action] - Action being performed
 * @param {Object} [metadata.data] - Additional contextual data
 * @example
 * logWithContext('info', 'User login successful', {
 *   correlationId: 'req-123',
 *   userId: 'user-456', 
 *   action: 'authentication',
 *   data: { method: 'email', ip: '192.168.1.1' }
 * });
 */
const logWithContext = (level, message, metadata = {}) => {
  const logData = {
    timestamp: new Date().toISOString(),
    message,
    ...metadata
  };
  
  logger[level](message, logData);
};

/**
 * Performance logging helper
 * 
 * @param {string} operation - Name of the operation being measured
 * @param {number} startTime - High resolution time when operation started
 * @param {Object} [metadata] - Additional context
 * @example
 * const startTime = process.hrtime.bigint();
 * // ... perform operation
 * logPerformance('database-query', startTime, { query: 'findUsers' });
 */
const logPerformance = (operation, startTime, metadata = {}) => {
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
  
  logWithContext('info', `Performance: ${operation}`, {
    operation,
    duration: `${duration.toFixed(2)}ms`,
    ...metadata
  });
  
  // Warn on slow operations
  if (duration > 1000) {
    logWithContext('warn', `Slow operation detected: ${operation}`, {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      threshold: '1000ms',
      ...metadata
    });
  }
};

// Add console transport for production if DEBUG flag is set
if (config.NODE_ENV === 'production' && process.env.DEBUG) {
  logger.add(new winston.transports.Console({
    level: 'debug',
    format: devFormat
  }));
}

module.exports = logger;
module.exports.logWithContext = logWithContext;
module.exports.logPerformance = logPerformance;
