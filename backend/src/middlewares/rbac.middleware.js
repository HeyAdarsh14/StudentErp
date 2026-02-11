const { ROLE_PERMISSIONS } = require('../constants/permissions');
const { ROLE_HIERARCHY } = require('../constants/roles');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Check if user has required permission
 */
const hasPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      if (userPermissions.includes(requiredPermission)) {
        return next();
      }

      logger.warn(
        `Permission denied: User ${req.user.id} (${userRole}) attempted ${requiredPermission}`
      );

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`RBAC error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user has any of the required permissions
 */
const hasAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      const hasAccess = requiredPermissions.some((permission) =>
        userPermissions.includes(permission)
      );

      if (hasAccess) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`RBAC error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user has all required permissions
 */
const hasAllPermissions = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      const hasAccess = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (hasAccess) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`RBAC error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user has required role
 */
const hasRole = (requiredRoles) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (roles.includes(userRole)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`Role check error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user has minimum role hierarchy level
 */
const hasMinimumRole = (minimumRole) => {
  return (req, res, next) => {
    try {
      const userRole = req.user.role;
      const userLevel = ROLE_HIERARCHY[userRole] || 0;
      const minimumLevel = ROLE_HIERARCHY[minimumRole] || 0;

      if (userLevel >= minimumLevel) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`Role hierarchy error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user is accessing their own resource
 */
const isOwner = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    try {
      const requestUserId = req.user.id;
      const resourceUserId =
        req.params[resourceUserIdField] ||
        req.body[resourceUserIdField] ||
        req.query[resourceUserIdField];

      if (requestUserId === resourceUserId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`Ownership check error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

/**
 * Check if user is owner or has permission
 */
const isOwnerOrHasPermission = (resourceUserIdField, requiredPermission) => {
  return (req, res, next) => {
    try {
      const requestUserId = req.user.id;
      const resourceUserId =
        req.params[resourceUserIdField] ||
        req.body[resourceUserIdField] ||
        req.query[resourceUserIdField];

      // Check if owner
      if (requestUserId === resourceUserId) {
        return next();
      }

      // Check if has permission
      const userRole = req.user.role;
      const userPermissions = ROLE_PERMISSIONS[userRole] || [];

      if (userPermissions.includes(requiredPermission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: MESSAGES.FORBIDDEN,
      });
    } catch (error) {
      logger.error(`Authorization error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: MESSAGES.SERVER_ERROR,
      });
    }
  };
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasMinimumRole,
  isOwner,
  isOwnerOrHasPermission,
};
