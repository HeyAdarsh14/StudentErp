const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../services/notification.service');

router.use(authenticate);

// Get user notifications
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, type, isRead, priority } = req.query;

    const result = await getUserNotifications(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      type,
      isRead: isRead ? isRead === 'true' : undefined,
      priority,
    });

    res.json({
      success: true,
      data: result.notifications,
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await markAsRead(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', async (req, res, next) => {
  try {
    await markAllAsRead(req.user.id);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteNotification(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
