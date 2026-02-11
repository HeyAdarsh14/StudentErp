const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: [
        'info',
        'success',
        'warning',
        'error',
        'attendance',
        'marks',
        'fee',
        'exam',
        'notice',
        'placement',
        'assignment',
        'announcement',
      ],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['system', 'academic', 'financial', 'administrative', 'personal'],
      default: 'system',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
    },
    link: {
      type: String,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    channels: {
      inApp: {
        type: Boolean,
        default: true,
      },
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
      push: {
        type: Boolean,
        default: false,
      },
    },
    deliveryStatus: {
      inApp: {
        status: {
          type: String,
          enum: ['pending', 'delivered', 'failed'],
          default: 'delivered',
        },
        deliveredAt: Date,
      },
      email: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed', 'bounced'],
        },
        sentAt: Date,
        deliveredAt: Date,
      },
      sms: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
        },
        sentAt: Date,
        deliveredAt: Date,
      },
      push: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed'],
        },
        sentAt: Date,
        deliveredAt: Date,
      },
    },
    expiresAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });
notificationSchema.index({ createdAt: -1 });

// TTL index to auto-delete old notifications (30 days for read, 90 days for unread)
notificationSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { isRead: false },
  }
);

notificationSchema.index(
  { readAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60,
    partialFilterExpression: { isRead: true },
  }
);

// Method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// Static method to mark multiple as read
notificationSchema.statics.markMultipleAsRead = async function (notificationIds, userId) {
  return await this.updateMany(
    {
      _id: { $in: notificationIds },
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function (userId) {
  return await this.countDocuments({
    recipient: userId,
    isRead: false,
  });
};

module.exports = mongoose.model('Notification', notificationSchema);
