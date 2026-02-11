const CommunicationPreference = require('../models/CommunicationPreference.model');
const MessageTemplate = require('../models/MessageTemplate.model');
const BroadcastMessage = require('../models/BroadcastMessage.model');
const User = require('../models/User.model');
const Student = require('../models/Student.model');
const asyncHandler = require('express-async-handler');
const { sendSMS, sendBulkSMS, getSMSBalance } = require('../services/sms.service');
const { sendWhatsAppMessage, sendBulkWhatsApp } = require('../services/whatsapp.service');
const { sendPushNotification, sendMulticastPushNotification } = require('../services/push.service');
const { sendEmail } = require('../services/email.service');

/**
 * ====================
 * PREFERENCES MANAGEMENT
 * ====================
 */

// @desc    Get user communication preferences
// @route   GET /api/communication/preferences
// @access  Private
exports.getPreferences = asyncHandler(async (req, res) => {
  const preferences = await CommunicationPreference.getOrCreate(req.user._id);

  res.json({
    success: true,
    data: preferences,
  });
});

// @desc    Update communication preferences
// @route   PUT /api/communication/preferences
// @access  Private
exports.updatePreferences = asyncHandler(async (req, res) => {
  let preferences = await CommunicationPreference.findOne({
    user: req.user._id,
  });

  if (!preferences) {
    preferences = await CommunicationPreference.create({
      user: req.user._id,
      ...req.body,
    });
  } else {
    Object.assign(preferences, req.body);
    await preferences.save();
  }

  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: preferences,
  });
});

// @desc    Add device token for push notifications
// @route   POST /api/communication/device-token
// @access  Private
exports.addDeviceToken = asyncHandler(async (req, res) => {
  const { token, platform } = req.body;

  if (!token || !platform) {
    res.status(400);
    throw new Error('Token and platform are required');
  }

  const preferences = await CommunicationPreference.getOrCreate(req.user._id);
  await preferences.addDeviceToken(token, platform);

  res.json({
    success: true,
    message: 'Device token added successfully',
  });
});

// @desc    Remove device token
// @route   DELETE /api/communication/device-token/:token
// @access  Private
exports.removeDeviceToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const preferences = await CommunicationPreference.findOne({
    user: req.user._id,
  });

  if (preferences) {
    await preferences.removeDeviceToken(token);
  }

  res.json({
    success: true,
    message: 'Device token removed successfully',
  });
});

/**
 * ====================
 * TEMPLATE MANAGEMENT
 * ====================
 */

// @desc    Create message template
// @route   POST /api/communication/templates
// @access  Private (Admin)
exports.createTemplate = asyncHandler(async (req, res) => {
  const template = await MessageTemplate.create({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Template created successfully',
    data: template,
  });
});

// @desc    Get all templates
// @route   GET /api/communication/templates
// @access  Private
exports.getTemplates = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, category, isActive, search } = req.query;

  const query = {};

  if (category) query.category = category;
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [templates, total] = await Promise.all([
    MessageTemplate.find(query)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    MessageTemplate.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: templates,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single template
// @route   GET /api/communication/templates/:id
// @access  Private
exports.getTemplate = asyncHandler(async (req, res) => {
  const template = await MessageTemplate.findById(req.params.id);

  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  res.json({
    success: true,
    data: template,
  });
});

// @desc    Update template
// @route   PUT /api/communication/templates/:id
// @access  Private (Admin)
exports.updateTemplate = asyncHandler(async (req, res) => {
  let template = await MessageTemplate.findById(req.params.id);

  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  if (template.isSystem) {
    res.status(403);
    throw new Error('Cannot modify system templates');
  }

  template = await MessageTemplate.findByIdAndUpdate(
    req.params.id,
    {
      ...req.body,
      updatedBy: req.user._id,
    },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'Template updated successfully',
    data: template,
  });
});

// @desc    Delete template
// @route   DELETE /api/communication/templates/:id
// @access  Private (Admin)
exports.deleteTemplate = asyncHandler(async (req, res) => {
  const template = await MessageTemplate.findById(req.params.id);

  if (!template) {
    res.status(404);
    throw new Error('Template not found');
  }

  await template.softDelete(req.user._id);

  res.json({
    success: true,
    message: 'Template deleted successfully',
  });
});

/**
 * ====================
 * BROADCAST MANAGEMENT
 * ====================
 */

// @desc    Create broadcast message
// @route   POST /api/communication/broadcasts
// @access  Private (Admin, PlacementOfficer)
exports.createBroadcast = asyncHandler(async (req, res) => {
  // Calculate total recipients
  let recipientQuery = {};
  
  if (req.body.recipients.type === 'roles') {
    recipientQuery.role = { $in: req.body.recipients.roles };
  } else if (req.body.recipients.type === 'custom') {
    recipientQuery._id = { $in: req.body.recipients.userIds };
  }

  const totalRecipients = await User.countDocuments(recipientQuery);

  const broadcast = await BroadcastMessage.create({
    ...req.body,
    createdBy: req.user._id,
    'statistics.totalRecipients': totalRecipients,
  });

  // Estimate cost
  if (req.body.channels.includes('sms') || req.body.channels.includes('whatsapp')) {
    broadcast.estimateCost();
    await broadcast.save();
  }

  res.status(201).json({
    success: true,
    message: 'Broadcast created successfully',
    data: broadcast,
  });
});

// @desc    Get all broadcasts
// @route   GET /api/communication/broadcasts
// @access  Private (Admin, PlacementOfficer)
exports.getBroadcasts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;

  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [broadcasts, total] = await Promise.all([
    BroadcastMessage.find(query)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit)),
    BroadcastMessage.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: broadcasts,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Get single broadcast
// @route   GET /api/communication/broadcasts/:id
// @access  Private
exports.getBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await BroadcastMessage.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!broadcast) {
    res.status(404);
    throw new Error('Broadcast not found');
  }

  res.json({
    success: true,
    data: broadcast,
  });
});

// @desc    Approve and send broadcast
// @route   POST /api/communication/broadcasts/:id/approve
// @access  Private (Admin)
exports.approveBroadcast = asyncHandler(async (req, res) => {
  const broadcast = await BroadcastMessage.findById(req.params.id);

  if (!broadcast) {
    res.status(404);
    throw new Error('Broadcast not found');
  }

  await broadcast.approve(req.user._id);

  // If immediate, trigger sending
  if (broadcast.scheduling.type === 'immediate') {
    // Trigger async broadcast sending
    processBroadcast(broadcast._id).catch((error) => {
      console.error('Broadcast sending failed:', error);
    });
  }

  res.json({
    success: true,
    message: 'Broadcast approved successfully',
    data: broadcast,
  });
});

// @desc    Cancel broadcast
// @route   POST /api/communication/broadcasts/:id/cancel
// @access  Private (Admin)
exports.cancelBroadcast = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const broadcast = await BroadcastMessage.findById(req.params.id);

  if (!broadcast) {
    res.status(404);
    throw new Error('Broadcast not found');
  }

  await broadcast.cancel(req.user._id, reason);

  res.json({
    success: true,
    message: 'Broadcast cancelled successfully',
    data: broadcast,
  });
});

/**
 * ====================
 * DIRECT MESSAGING
 * ====================
 */

// @desc    Send SMS
// @route   POST /api/communication/send/sms
// @access  Private (Admin, PlacementOfficer)
exports.sendSMSDirect = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400);
    throw new Error('Phone and message are required');
  }

  const result = await sendSMS(phone, message);

  res.json({
    success: result.success,
    message: result.success ? 'SMS sent successfully' : 'SMS sending failed',
    data: result,
  });
});

// @desc    Send WhatsApp
// @route   POST /api/communication/send/whatsapp
// @access  Private (Admin, PlacementOfficer)
exports.sendWhatsAppDirect = asyncHandler(async (req, res) => {
  const { phone, message } = req.body;

  if (!phone || !message) {
    res.status(400);
    throw new Error('Phone and message are required');
  }

  const result = await sendWhatsAppMessage(phone, message);

  res.json({
    success: result.success,
    message: result.success
      ? 'WhatsApp sent successfully'
      : 'WhatsApp sending failed',
    data: result,
  });
});

// @desc    Send Push Notification
// @route   POST /api/communication/send/push
// @access  Private (Admin)
exports.sendPushDirect = asyncHandler(async (req, res) => {
  const { userId, title, body, data, clickAction } = req.body;

  if (!userId || !title || !body) {
    res.status(400);
    throw new Error('userId, title, and body are required');
  }

  const preferences = await CommunicationPreference.findOne({ user: userId });

  if (!preferences || !preferences.push.enabled) {
    res.status(400);
    throw new Error('User has not enabled push notifications');
  }

  const tokens = preferences.push.deviceTokens.map((dt) => dt.token);

  if (tokens.length === 0) {
    res.status(400);
    throw new Error('User has no registered devices');
  }

  const result = await sendMulticastPushNotification(tokens, {
    title,
    body,
    data,
    clickAction,
  });

  res.json({
    success: result.success,
    message: result.success
      ? 'Push notification sent successfully'
      : 'Push notification failed',
    data: result,
  });
});

/**
 * ====================
 * ANALYTICS & STATS
 * ====================
 */

// @desc    Get SMS balance
// @route   GET /api/communication/balance/sms
// @access  Private (Admin)
exports.getSMSBalanceInfo = asyncHandler(async (req, res) => {
  const balance = await getSMSBalance();

  res.json({
    success: true,
    data: balance,
  });
});

// @desc    Get broadcast statistics
// @route   GET /api/communication/statistics
// @access  Private (Admin)
exports.getCommunicationStatistics = asyncHandler(async (req, res) => {
  const [
    totalBroadcasts,
    sentBroadcasts,
    scheduledBroadcasts,
    totalTemplates,
    activeTemplates,
  ] = await Promise.all([
    BroadcastMessage.countDocuments({ isDeleted: false }),
    BroadcastMessage.countDocuments({ status: 'sent', isDeleted: false }),
    BroadcastMessage.countDocuments({ status: 'scheduled', isDeleted: false }),
    MessageTemplate.countDocuments({ isDeleted: false }),
    MessageTemplate.countDocuments({ isActive: true, isDeleted: false }),
  ]);

  // Get recent broadcasts stats
  const recentBroadcasts = await BroadcastMessage.find({
    status: 'sent',
    isDeleted: false,
  })
    .sort({ completedAt: -1 })
    .limit(10)
    .select('statistics sentAt completedAt');

  const stats = {
    broadcasts: {
      total: totalBroadcasts,
      sent: sentBroadcasts,
      scheduled: scheduledBroadcasts,
    },
    templates: {
      total: totalTemplates,
      active: activeTemplates,
    },
    recent: recentBroadcasts,
  };

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * ====================
 * HELPER FUNCTIONS
 * ====================
 */

// Process broadcast message (async)
const processBroadcast = async (broadcastId) => {
  try {
    const broadcast = await BroadcastMessage.findById(broadcastId).populate(
      'template'
    );

    if (!broadcast) return;

    // Get recipients based on criteria
    const recipients = await getRecipientsForBroadcast(broadcast);

    // Send through each channel
    for (const channel of broadcast.channels) {
      if (channel === 'email') {
        await sendEmailBroadcast(broadcast, recipients);
      } else if (channel === 'sms') {
        await sendSMSBroadcast(broadcast, recipients);
      } else if (channel === 'whatsapp') {
        await sendWhatsAppBroadcast(broadcast, recipients);
      } else if (channel === 'push') {
        await sendPushBroadcast(broadcast, recipients);
      }
    }

    broadcast.status = 'sent';
    await broadcast.save();
  } catch (error) {
    console.error('Broadcast processing error:', error);
    const broadcast = await BroadcastMessage.findById(broadcastId);
    if (broadcast) {
      broadcast.status = 'failed';
      broadcast.failureReason = error.message;
      await broadcast.save();
    }
  }
};

// Get recipients based on broadcast criteria
const getRecipientsForBroadcast = async (broadcast) => {
  const query = {};

  if (broadcast.recipients.type === 'all') {
    // All users
    query.isDeleted = false;
  } else if (broadcast.recipients.type === 'roles') {
    query.role = { $in: broadcast.recipients.roles };
  } else if (broadcast.recipients.type === 'departments') {
    const students = await Student.find({
      department: { $in: broadcast.recipients.departments },
      isDeleted: false,
    });
    query._id = { $in: students.map((s) => s.user) };
  } else if (broadcast.recipients.type === 'custom') {
    query._id = { $in: broadcast.recipients.userIds };
  }

  const users = await User.find(query).select('email name role');

  // Get communication preferences
  const preferences = await CommunicationPreference.find({
    user: { $in: users.map((u) => u._id) },
  });

  const preferenceMap = new Map();
  preferences.forEach((p) => {
    preferenceMap.set(p.user.toString(), p);
  });

  return users.map((user) => ({
    user,
    preferences: preferenceMap.get(user._id.toString()),
  }));
};

// Send email broadcast
const sendEmailBroadcast = async (broadcast, recipients) => {
  for (const recipient of recipients) {
    try {
      if (
        recipient.preferences?.email?.enabled &&
        recipient.user.email
      ) {
        await sendEmail({
          to: recipient.user.email,
          subject: broadcast.message.email.subject,
          text: broadcast.message.email.text,
          html: broadcast.message.email.html,
        });

        await broadcast.updateStats('email', 'sent');
      }
    } catch (error) {
      await broadcast.updateStats('email', 'failed');
    }
  }
};

// Send SMS broadcast
const sendSMSBroadcast = async (broadcast, recipients) => {
  const smsRecipients = [];

  for (const recipient of recipients) {
    if (
      recipient.preferences?.sms?.enabled &&
      recipient.preferences.sms.phoneNumber
    ) {
      smsRecipients.push({
        phone: recipient.preferences.sms.phoneNumber,
        message: broadcast.message.sms.text,
      });
    }
  }

  if (smsRecipients.length > 0) {
    const results = await sendBulkSMS(smsRecipients);
    broadcast.statistics.sent.sms += results.sent;
    broadcast.statistics.failed.sms += results.failed;
    await broadcast.save();
  }
};

// Send WhatsApp broadcast
const sendWhatsAppBroadcast = async (broadcast, recipients) => {
  const whatsappRecipients = [];

  for (const recipient of recipients) {
    if (
      recipient.preferences?.whatsapp?.enabled &&
      recipient.preferences.whatsapp.phoneNumber
    ) {
      whatsappRecipients.push({
        phone: recipient.preferences.whatsapp.phoneNumber,
        message: broadcast.message.whatsapp.text,
      });
    }
  }

  if (whatsappRecipients.length > 0) {
    const results = await sendBulkWhatsApp(whatsappRecipients);
    broadcast.statistics.sent.whatsapp += results.sent;
    broadcast.statistics.failed.whatsapp += results.failed;
    await broadcast.save();
  }
};

// Send push notification broadcast
const sendPushBroadcast = async (broadcast, recipients) => {
  const tokens = [];

  for (const recipient of recipients) {
    if (
      recipient.preferences?.push?.enabled &&
      recipient.preferences.push.deviceTokens.length > 0
    ) {
      tokens.push(...recipient.preferences.push.deviceTokens.map((dt) => dt.token));
    }
  }

  if (tokens.length > 0) {
    const result = await sendMulticastPushNotification(tokens, {
      title: broadcast.message.push.title,
      body: broadcast.message.push.body,
      icon: broadcast.message.push.icon,
      clickAction: broadcast.message.push.clickAction,
    });

    broadcast.statistics.sent.push += result.successCount;
    broadcast.statistics.failed.push += result.failureCount;
    await broadcast.save();
  }
};

module.exports = exports;
