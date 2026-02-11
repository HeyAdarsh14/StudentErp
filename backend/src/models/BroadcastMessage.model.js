const mongoose = require('mongoose');

/**
 * BroadcastMessage Model - Mass messaging to multiple users
 */
const broadcastMessageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Broadcast title is required'],
      trim: true,
    },
    template: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MessageTemplate',
      index: true,
    },
    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'whatsapp', 'push'],
        required: true,
      },
    ],
    message: {
      email: {
        subject: String,
        html: String,
        text: String,
      },
      sms: {
        text: String,
      },
      whatsapp: {
        text: String,
        mediaUrl: String,
        mediaType: {
          type: String,
          enum: ['image', 'video', 'document', 'audio'],
        },
      },
      push: {
        title: String,
        body: String,
        icon: String,
        clickAction: String,
      },
    },
    recipients: {
      type: {
        type: String,
        enum: ['all', 'roles', 'departments', 'years', 'custom'],
        required: true,
      },
      roles: [
        {
          type: String,
          enum: [
            'SuperAdmin',
            'Admin',
            'Faculty',
            'Student',
            'Parent',
            'Accountant',
            'PlacementOfficer',
          ],
        },
      ],
      departments: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
        },
      ],
      years: [
        {
          type: Number,
          enum: [1, 2, 3, 4],
        },
      ],
      userIds: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
    },
    filters: {
      minCGPA: Number,
      maxBacklogs: Number,
      placementStatus: {
        type: String,
        enum: ['placed', 'not-placed', 'applied', 'all'],
      },
      attendancePercentage: {
        min: Number,
        max: Number,
      },
    },
    scheduling: {
      type: {
        type: String,
        enum: ['immediate', 'scheduled', 'recurring'],
        default: 'immediate',
      },
      scheduledAt: Date,
      recurrence: {
        enabled: {
          type: Boolean,
          default: false,
        },
        pattern: {
          type: String,
          enum: ['daily', 'weekly', 'monthly'],
        },
        interval: {
          type: Number,
          default: 1,
        },
        endDate: Date,
        maxOccurrences: Number,
      },
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    statistics: {
      totalRecipients: {
        type: Number,
        default: 0,
      },
      sent: {
        email: { type: Number, default: 0 },
        sms: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        push: { type: Number, default: 0 },
      },
      failed: {
        email: { type: Number, default: 0 },
        sms: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        push: { type: Number, default: 0 },
      },
      delivered: {
        email: { type: Number, default: 0 },
        sms: { type: Number, default: 0 },
        whatsapp: { type: Number, default: 0 },
        push: { type: Number, default: 0 },
      },
      opened: {
        email: { type: Number, default: 0 },
        push: { type: Number, default: 0 },
      },
      clicked: {
        email: { type: Number, default: 0 },
        push: { type: Number, default: 0 },
      },
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    estimatedCost: {
      sms: Number,
      whatsapp: Number,
      total: Number,
    },
    actualCost: {
      sms: Number,
      whatsapp: Number,
      total: Number,
    },
    sentAt: Date,
    completedAt: Date,
    failureReason: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancelledAt: Date,
    cancellationReason: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
broadcastMessageSchema.index({ status: 1, 'scheduling.scheduledAt': 1 });
broadcastMessageSchema.index({ createdBy: 1, status: 1 });
broadcastMessageSchema.index({ 'recipients.type': 1 });
broadcastMessageSchema.index({ createdAt: -1 });

// Pre-save middleware
broadcastMessageSchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }

  // Set sentAt when status changes to sending or sent
  if (this.isModified('status') && this.status === 'sending' && !this.sentAt) {
    this.sentAt = new Date();
  }

  // Set completedAt when status changes to sent or failed
  if (
    this.isModified('status') &&
    ['sent', 'failed'].includes(this.status) &&
    !this.completedAt
  ) {
    this.completedAt = new Date();
  }

  next();
});

// Virtual for success rate
broadcastMessageSchema.virtual('successRate').get(function () {
  if (this.statistics.totalRecipients === 0) return 0;

  const totalSent = Object.values(this.statistics.sent).reduce(
    (sum, val) => sum + val,
    0
  );
  return ((totalSent / this.statistics.totalRecipients) * 100).toFixed(2);
});

// Method to estimate cost
broadcastMessageSchema.methods.estimateCost = function (
  smsRate = 0.5,
  whatsappRate = 0.3
) {
  const cost = {
    sms: 0,
    whatsapp: 0,
    total: 0,
  };

  if (this.channels.includes('sms')) {
    cost.sms = this.statistics.totalRecipients * smsRate;
  }

  if (this.channels.includes('whatsapp')) {
    cost.whatsapp = this.statistics.totalRecipients * whatsappRate;
  }

  cost.total = cost.sms + cost.whatsapp;
  this.estimatedCost = cost;

  return cost;
};

// Method to update statistics
broadcastMessageSchema.methods.updateStats = function (
  channel,
  status,
  count = 1
) {
  if (this.statistics[status] && this.statistics[status][channel] !== undefined) {
    this.statistics[status][channel] += count;
  }
  return this.save();
};

// Method to cancel broadcast
broadcastMessageSchema.methods.cancel = function (userId, reason) {
  if (!['draft', 'scheduled'].includes(this.status)) {
    throw new Error('Can only cancel draft or scheduled broadcasts');
  }

  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;

  return this.save();
};

// Method to approve broadcast
broadcastMessageSchema.methods.approve = function (userId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft broadcasts can be approved');
  }

  this.approvedBy = userId;
  this.approvedAt = new Date();

  if (this.scheduling.type === 'immediate') {
    this.status = 'sending';
  } else {
    this.status = 'scheduled';
  }

  return this.save();
};

// Soft delete method
broadcastMessageSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Query middleware - exclude deleted by default
broadcastMessageSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const BroadcastMessage = mongoose.model(
  'BroadcastMessage',
  broadcastMessageSchema
);

module.exports = BroadcastMessage;
