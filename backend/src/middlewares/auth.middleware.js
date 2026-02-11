const { verifyAccessToken } = require('../utils/jwt');
const { sanitizeUser } = require('../utils/helpers');
const logger = require('../utils/logger');
const MESSAGES = require('../constants/messages');

/**
 * Authentication middleware
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.UNAUTHORIZED,
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: MESSAGES.TOKEN_INVALID,
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = verifyAccessToken(token);
      req.user = {
        id: decoded.id,
        role: decoded.role,
        email: decoded.email,
      };
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

module.exports = { authenticate, optionalAuth };
