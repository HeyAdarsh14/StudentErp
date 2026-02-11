const Notification = require('../models/Notification.model');
const { getIO } = require('../config/socket');
const logger = require('../utils/logger');
const { sendEmail } = require('./email.service');

/**
 * Create notification
 */
const createNotification = async (notificationData) => {
  try {
    const notification = await Notification.create(notificationData);

    // Send real-time notification via socket
    if (notificationData.channels?.inApp !== false) {
      try {
        const io = getIO();
        io.to(`user:${notificationData.recipient}`).emit('notification', {
          type: 'new_notification',
          data: notification,
        });
      } catch (error) {
        logger.error(`Socket notification failed: ${error.message}`);
      }
    }

    // Send email if enabled
    if (notificationData.channels?.email) {
      try {
        await sendEmail({
          to: notificationData.recipientEmail,
          subject: notificationData.title,
          html: notificationData.message,
        });
        
        notification.deliveryStatus.email.status = 'sent';
        notification.deliveryStatus.email.sentAt = new Date();
        await notification.save();
      } catch (error) {
        logger.error(`Email notification failed: ${error.message}`);
        notification.deliveryStatus.email.status = 'failed';
        await notification.save();
      }
    }

    return notification;
  } catch (error) {
    logger.error(`Error creating notification: ${error.message}`);
    throw error;
  }
};

/**
 * Create bulk notifications
 */
const createBulkNotifications = async (recipients, notificationTemplate) => {
  try {
    const notifications = recipients.map((recipient) => ({
      ...notificationTemplate,
      recipient: recipient._id || recipient,
      recipientEmail: recipient.email,
    }));

    const createdNotifications = await Notification.insertMany(notifications);

    // Send real-time notifications
    try {
      const io = getIO();
      recipients.forEach((recipient, index) => {
        io.to(`user:${recipient._id || recipient}`).emit('notification', {
          type: 'new_notification',
          data: createdNotifications[index],
        });
      });
    } catch (error) {
      logger.error(`Bulk socket notification failed: ${error.message}`);
    }

    return createdNotifications;
  } catch (error) {
    logger.error(`Error creating bulk notifications: ${error.message}`);
    throw error;
  }
};

/**
 * Get user notifications
 */
const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      priority,
    } = options;

    const query = { recipient: userId };

    if (type) query.type = type;
    if (typeof isRead === 'boolean') query.isRead = isRead;
    if (priority) query.priority = priority;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('sender', 'name profileImage')
      .lean();

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    return {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error(`Error fetching notifications: ${error.message}`);
    throw error;
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await notification.markAsRead();

    // Emit updated unread count
    try {
      const io = getIO();
      const unreadCount = await Notification.getUnreadCount(userId);
      io.to(`user:${userId}`).emit('notification', {
        type: 'unread_count_update',
        data: { unreadCount },
      });
    } catch (error) {
      logger.error(`Socket emit failed: ${error.message}`);
    }

    return notification;
  } catch (error) {
    logger.error(`Error marking notification as read: ${error.message}`);
    throw error;
  }
};

/**
 * Mark all as read
 */
const markAllAsRead = async (userId) => {
  try {
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    // Emit updated unread count
    try {
      const io = getIO();
      io.to(`user:${userId}`).emit('notification', {
        type: 'unread_count_update',
        data: { unreadCount: 0 },
      });
    } catch (error) {
      logger.error(`Socket emit failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    logger.error(`Error marking all as read: ${error.message}`);
    throw error;
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (notificationId, userId) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId,
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return true;
  } catch (error) {
    logger.error(`Error deleting notification: ${error.message}`);
    throw error;
  }
};

/**
 * Send attendance alert
 */
const sendAttendanceAlert = async (student, attendanceData) => {
  return await createNotification({
    recipient: student.userId,
    recipientEmail: student.email,
    type: 'attendance',
    category: 'academic',
    title: 'Low Attendance Alert',
    message: `Your attendance in ${attendanceData.subject} is ${attendanceData.percentage}%. Minimum required is 75%.`,
    data: attendanceData,
    priority: 'high',
    channels: {
      inApp: true,
      email: true,
    },
  });
};

/**
 * Send fee reminder
 */
const sendFeeReminder = async (student, feeData) => {
  return await createNotification({
    recipient: student.userId,
    recipientEmail: student.email,
    type: 'fee',
    category: 'financial',
    title: 'Fee Payment Reminder',
    message: `Your fee payment of ₹${feeData.dueAmount} is due on ${new Date(feeData.dueDate).toLocaleDateString()}.`,
    data: feeData,
    link: '/fees',
    priority: 'high',
    channels: {
      inApp: true,
      email: true,
    },
  });
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendAttendanceAlert,
  sendFeeReminder,
};
