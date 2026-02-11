const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { createNoticeValidation, paginationValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const { createBulkNotifications } = require('../services/notification.service');
const User = require('../models/User.model');
const MESSAGES = require('../constants/messages');
const { paginate, formatPaginationResponse } = require('../utils/helpers');

router.use(authenticate);

// Create notice
router.post('/', hasPermission(PERMISSIONS.NOTICE_CREATE), createNoticeValidation, auditLogger('CREATE', 'NOTICE'), async (req, res, next) => {
  try {
    const notice = await Notice.create({
      ...req.body,
      createdBy: req.user.id,
    });

    // Send notifications to target audience
    try {
      const query = {};
      if (notice.targetAudience.includes('specific_department') && notice.departments.length > 0) {
        query.role = { $in: ['student', 'faculty'] };
        // Add department filter logic if needed
      } else {
        const roleMap = {
          'students': 'student',
          'faculty': 'faculty',
          'admin': 'admin',
          'parents': 'parent',
        };
        const roles = notice.targetAudience.map(a => roleMap[a]).filter(Boolean);
        if (roles.length > 0) query.role = { $in: roles };
      }

      if (!notice.targetAudience.includes('all') && Object.keys(query).length > 0) {
        const users = await User.find(query).select('_id email');
        await createBulkNotifications(users, {
          type: 'notice',
          category: 'administrative',
          title: notice.title,
          message: notice.description,
          link: `/notices/${notice._id}`,
          priority: notice.priority === 'urgent' ? 'high' : 'normal',
          channels: {
            inApp: true,
            email: notice.priority === 'urgent',
          },
        });
      }
    } catch (error) {
      console.error('Error sending notice notifications:', error);
    }

    res.status(201).json({
      success: true,
      message: MESSAGES.NOTICE_CREATED,
      data: notice,
    });
  } catch (error) {
    next(error);
  }
});

// Get all notices
router.get('/', paginationValidation, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, priority } = req.query;
    const { skip, limit: limitNum } = paginate(page, limit);

    const query = { isActive: true };
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const [notices, total] = await Promise.all([
      Notice.find(query)
        .populate('createdBy', 'name email')
        .populate('departments', 'name code')
        .sort({ isPinned: -1, publishDate: -1 })
        .skip(skip)
        .limit(limitNum),
      Notice.countDocuments(query),
    ]);

    res.json({
      success: true,
      ...formatPaginationResponse(notices, total, page, limit),
    });
  } catch (error) {
    next(error);
  }
});

// Get notice by ID
router.get('/:id', async (req, res, next) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('departments', 'name code');

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    // Increment view count
    notice.viewCount += 1;
    notice.viewedBy.push({
      user: req.user.id,
      viewedAt: new Date(),
    });
    await notice.save();

    res.json({
      success: true,
      data: notice,
    });
  } catch (error) {
    next(error);
  }
});

// Update notice
router.put('/:id', hasPermission(PERMISSIONS.NOTICE_UPDATE), auditLogger('UPDATE', 'NOTICE'), async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    res.json({
      success: true,
      message: MESSAGES.NOTICE_UPDATED,
      data: notice,
    });
  } catch (error) {
    next(error);
  }
});

// Delete notice
router.delete('/:id', hasPermission(PERMISSIONS.NOTICE_DELETE), auditLogger('DELETE', 'NOTICE'), async (req, res, next) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
      }
    );

    if (!notice) {
      return res.status(404).json({
        success: false,
        message: 'Notice not found',
      });
    }

    res.json({
      success: true,
      message: MESSAGES.NOTICE_DELETED,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
