const User = require('../models/User.model');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const { hashPassword, comparePassword, sanitizeUser, generateOTP } = require('../utils/helpers');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { sendWelcomeEmail, sendPasswordResetEmail, sendOTPEmail } = require('../services/email.service');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Register new user
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, contactNumber } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: MESSAGES.USER_ALREADY_EXISTS,
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      contactNumber,
    });

    // Generate tokens
    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user, password);
    } catch (error) {
      logger.error(`Welcome email failed: ${error.message}`);
    }

    // Log login history
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: MESSAGES.USER_CREATED,
      data: {
        user: sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email, isActive: true }).select('+password');

    if (!user) {
      logger.warn(`Failed login attempt - user not found: ${email} from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Failed login attempt - invalid password: ${email} from IP: ${req.ip}`);
      return res.status(401).json({
        success: false,
        message: MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // Update refresh token and last login
    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();

    // Add to login history
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Keep only last 10 login records
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(-10);
    }

    await user.save();

    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id })
        .populate('department', 'name code')
        .lean();
    } else if (user.role === 'faculty') {
      roleData = await Faculty.findOne({ userId: user._id })
        .populate('department', 'name code')
        .lean();
    }

    res.json({
      success: true,
      message: MESSAGES.LOGIN_SUCCESS,
      data: {
        user: sanitizeUser(user),
        roleData,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.TOKEN_INVALID,
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findOne({
      _id: decoded.id,
      refreshToken,
      isActive: true,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.TOKEN_INVALID,
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    // Remove refresh token
    await User.findByIdAndUpdate(req.user.id, {
      $unset: { refreshToken: 1 },
    });

    res.json({
      success: true,
      message: MESSAGES.LOGOUT_SUCCESS,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    // Get role-specific data
    let roleData = null;
    if (user.role === 'student') {
      roleData = await Student.findOne({ userId: user._id })
        .populate('department', 'name code')
        .populate('subjects', 'name code')
        .lean();
    } else if (user.role === 'faculty') {
      roleData = await Faculty.findOne({ userId: user._id })
        .populate('department', 'name code')
        .populate('subjects', 'name code')
        .lean();
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        roleData,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = [
      'name',
      'contactNumber',
      'alternateContactNumber',
      'address',
      'dateOfBirth',
      'gender',
    ];

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.USER_UPDATED,
      data: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    // Verify old password
    const isPasswordValid = await comparePassword(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Old password is incorrect',
      });
    }

    // Hash new password
    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isActive: true });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent',
      });
    }

    // Generate reset token
    const resetToken = generateOTP(6);
    user.passwordResetToken = await hashPassword(resetToken);
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    try {
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user, resetUrl);
    } catch (error) {
      logger.error(`Password reset email failed: ${error.message}`);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'Error sending reset email',
      });
    }

    res.json({
      success: true,
      message: 'Password reset link sent to email',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    // Find user with valid reset token
    const users = await User.find({
      passwordResetExpires: { $gt: Date.now() },
      isActive: true,
    }).select('+passwordResetToken');

    let user = null;
    for (const u of users) {
      if (await comparePassword(token, u.passwordResetToken)) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Set new password
    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP
 */
const sendOTP = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.USER_NOT_FOUND,
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    user.otp = {
      code: await hashPassword(otp),
      expires: Date.now() + 600000, // 10 minutes
    };
    await user.save();

    // Send OTP email
    try {
      await sendOTPEmail(user, otp);
    } catch (error) {
      logger.error(`OTP email failed: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Error sending OTP',
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.user.id).select('+otp');

    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired',
      });
    }

    // Check if OTP expired
    if (user.otp.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP expired',
      });
    }

    // Verify OTP
    const isOTPValid = await comparePassword(otp, user.otp.code);

    if (!isOTPValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Clear OTP
    user.otp = undefined;
    user.isEmailVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
};
