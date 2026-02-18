/**
 * Security Audit and Logging Configuration
 * Comprehensive logging for security events and audit trails
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Security Event Types
const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE', 
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  DATA_ACCESS: 'DATA_ACCESS',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
  ADMIN_ACTION: 'ADMIN_ACTION',
  API_KEY_USAGE: 'API_KEY_USAGE',
  BULK_OPERATION: 'BULK_OPERATION',
  FILE_UPLOAD: 'FILE_UPLOAD',
  EXPORT_DATA: 'EXPORT_DATA',
  CONFIG_CHANGE: 'CONFIG_CHANGE',
};

// Security Logger Configuration
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        correlationId: meta.correlationId,
        userId: meta.userId,
        userEmail: meta.userEmail,
        userRole: meta.userRole,
        ip: meta.ip,
        userAgent: meta.userAgent,
        eventType: meta.eventType,
        resource: meta.resource,
        action: meta.action,
        success: meta.success,
        details: meta.details,
        risk: meta.risk || 'low',
        location: meta.location,
        sessionId: meta.sessionId,
      });
    })
  ),
  transports: [
    // Security events log file
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
    }),
    // High-risk events separate log  
    new winston.transports.File({
      filename: path.join(logsDir, 'security-alerts.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV === 'development') {
  securityLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log security event
 */
const logSecurityEvent = (eventType, req, additionalData = {}) => {
  const securityEvent = {
    correlationId: req.correlationId,
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    eventType,
    resource: req.originalUrl || req.url,
    action: req.method,
    timestamp: new Date().toISOString(),
    sessionId: req.sessionID,
    ...additionalData,
  };

  // Determine log level based on event type
  let logLevel = 'info';
  let risk = 'low';

  switch (eventType) {
    case SECURITY_EVENTS.LOGIN_FAILURE:
    case SECURITY_EVENTS.UNAUTHORIZED_ACCESS:
    case SECURITY_EVENTS.PERMISSION_DENIED:
    case SECURITY_EVENTS.RATE_LIMIT_EXCEEDED:
      logLevel = 'warn';
      risk = 'medium';
      break;
    
    case SECURITY_EVENTS.SUSPICIOUS_ACTIVITY:
    case SECURITY_EVENTS.BULK_OPERATION:
      logLevel = 'error';
      risk = 'high';
      break;
      
    case SECURITY_EVENTS.ADMIN_ACTION:
    case SECURITY_EVENTS.CONFIG_CHANGE:
    case SECURITY_EVENTS.DATA_MODIFICATION:
      risk = 'medium';
      break;
  }

  securityEvent.risk = risk;
  
  securityLogger.log(logLevel, `Security Event: ${eventType}`, securityEvent);
  
  // Send alert for high-risk events
  if (risk === 'high') {
    sendSecurityAlert(securityEvent);
  }
};

/**
 * Middleware to log authentication events
 */
const authenticationLogger = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log based on response
    if (req.originalUrl?.includes('/auth/login')) {
      const eventType = data.success ? 
        SECURITY_EVENTS.LOGIN_SUCCESS : 
        SECURITY_EVENTS.LOGIN_FAILURE;
        
      logSecurityEvent(eventType, req, {
        success: data.success,
        details: data.success ? 'User logged in successfully' : data.message,
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to log data access events
 */
const dataAccessLogger = (req, res, next) => {
  // Log sensitive data access
  if (req.method === 'GET' && req.originalUrl?.includes('/users')) {
    logSecurityEvent(SECURITY_EVENTS.DATA_ACCESS, req, {
      resource: 'User Data',
      details: `Accessed user data: ${req.originalUrl}`,
    });
  }
  
  // Log data modifications
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    logSecurityEvent(SECURITY_EVENTS.DATA_MODIFICATION, req, {
      resource: req.originalUrl,
      details: `${req.method} operation on ${req.originalUrl}`,
      payload: req.body ? Object.keys(req.body) : [],
    });
  }
  
  next();
};

/**
 * Middleware to detect suspicious activity
 */
const suspiciousActivityDetector = (req, res, next) => {
  const suspicious = [];
  
  // Check for SQL injection patterns
  const sqlPatterns = /'|"|;|--|\*|union|select|insert|update|delete|drop/i;
  if (JSON.stringify(req.body).match(sqlPatterns)) {
    suspicious.push('SQL injection pattern detected');
  }
  
  // Check for XSS patterns
  const xssPatterns = /<script|javascript:|onload=|onclick=/i;
  if (JSON.stringify(req.body).match(xssPatterns)) {
    suspicious.push('XSS pattern detected');
  }
  
  // Check for path traversal
  if (JSON.stringify(req.body).match(/\.\.\/|\.\.\\|%2e%2e/i)) {
    suspicious.push('Path traversal pattern detected');
  }
  
  // Check for unusual request patterns
  if (req.headers['user-agent']?.length > 1000) {
    suspicious.push('Unusually long user agent');
  }
  
  if (suspicious.length > 0) {
    logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, req, {
      details: suspicious.join(', '),
      risk: 'high',
    });
  }
  
  next();
};

/**
 * Send security alert (email, Slack, etc.)
 */
const sendSecurityAlert = async (securityEvent) => {
  try {
    // In a real implementation, integrate with your alerting system
    console.warn('🚨 SECURITY ALERT:', {
      eventType: securityEvent.eventType,
      userId: securityEvent.userId,
      ip: securityEvent.ip,
      timestamp: securityEvent.timestamp,
      details: securityEvent.details,
    });
    
    // Example: Send to Slack webhook
    if (process.env.SLACK_WEBHOOK_URL) {
      const message = {
        text: `🚨 Security Alert: ${securityEvent.eventType}`,
        attachments: [{
          color: 'danger',
          fields: [
            { title: 'User', value: securityEvent.userEmail || 'Unknown', short: true },
            { title: 'IP Address', value: securityEvent.ip, short: true },  
            { title: 'Resource', value: securityEvent.resource, short: true },
            { title: 'Details', value: securityEvent.details, short: false },
          ],
          timestamp: Math.floor(Date.now() / 1000),
        }],
      };
      
      // Send webhook (implementation depends on your setup)
      // await sendSlackMessage(message);
    }
    
    // Example: Send email alert
    if (process.env.SECURITY_ALERT_EMAIL) {
      // await sendSecurityAlertEmail(securityEvent);
    }
    
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
};

/**
 * Security dashboard metrics
 */
const getSecurityMetrics = async (timeframe = '24h') => {
  try {
    // In a real implementation, analyze log files or database
    return {
      loginAttempts: {
        successful: 150,
        failed: 12,
        total: 162,
      },
      suspiciousActivity: 3,
      blockedRequests: 25,
      unauthorizedAccess: 8,
      topIPs: [
        { ip: '192.168.1.100', requests: 150 },
        { ip: '10.0.0.5', requests: 89 },
      ],
      riskLevel: 'medium',
      alerts: 2,
    };
  } catch (error) {
    console.error('Failed to get security metrics:', error);
    return null;
  }
};

/**
 * Security audit report generator
 */
const generateSecurityReport = async (startDate, endDate) => {
  try {
    // Generate comprehensive security report
    const report = {
      period: { startDate, endDate },
      summary: {
        totalEvents: 0,
        criticalEvents: 0,
        uniqueUsers: 0,
        uniqueIPs: 0,
      },
      events: [],
      recommendations: [],
      trends: {},
    };
    
    return report;
  } catch (error) {
    console.error('Failed to generate security report:', error);
    return null;
  }
};

module.exports = {
  SECURITY_EVENTS,
  logSecurityEvent,
  authenticationLogger,
  dataAccessLogger,
  suspiciousActivityDetector,
  getSecurityMetrics,
  generateSecurityReport,
  securityLogger,
};