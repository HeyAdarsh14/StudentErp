const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

/**
 * Audit log middleware
 */
const auditLogger = (action, resourceType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = function (data) {
      // Restore original json
      res.json = originalJson;

      // Log only successful operations
      if (data.success) {
        // Don't wait for audit log to complete - fire and forget
        createAuditLog(req, action, resourceType, data)
          .catch((err) => logger.error(`Audit log error: ${err.message}`));
      }

      // Send response
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Create audit log entry
 */
const createAuditLog = async (req, action, resourceType, responseData) => {
  try {
    const auditEntry = {
      userId: req.user?.id,
      userRole: req.user?.role,
      action,
      resourceType,
      resourceId: responseData.data?._id || responseData.data?.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      method: req.method,
      endpoint: req.originalUrl,
      requestBody: sanitizeRequestBody(req.body),
      statusCode: res.statusCode,
      timestamp: new Date(),
    };

    await AuditLog.create(auditEntry);
  } catch (error) {
    logger.error(`Failed to create audit log: ${error.message}`);
  }
};

/**
 * Sanitize request body by removing sensitive fields
 */
const sanitizeRequestBody = (body) => {
  if (!body) return null;

  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'newPassword',
    'oldPassword',
    'confirmPassword',
    'token',
    'refreshToken',
    'accessToken',
    'secret',
    'apiKey',
  ];

  sensitiveFields.forEach((field) => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Get audit logs for a user
 */
const getUserAuditLogs = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      startDate,
      endDate,
      action,
      resourceType,
    } = options;

    const query = { userId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    if (action) query.action = action;
    if (resourceType) query.resourceType = resourceType;

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error(`Error fetching audit logs: ${error.message}`);
    throw error;
  }
};

module.exports = {
  auditLogger,
  createAuditLog,
  getUserAuditLogs,
};
