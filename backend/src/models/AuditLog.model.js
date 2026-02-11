const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE',
        'READ',
        'UPDATE',
        'DELETE',
        'LOGIN',
        'LOGOUT',
        'EXPORT',
        'IMPORT',
        'APPROVE',
        'REJECT',
      ],
    },
    resourceType: {
      type: String,
      required: true,
      enum: [
        'USER',
        'STUDENT',
        'FACULTY',
        'DEPARTMENT',
        'SUBJECT',
        'ATTENDANCE',
        'MARKS',
        'FEE',
        'NOTICE',
        'TIMETABLE',
        'EXAM',
        'PLACEMENT',
        'LMS',
        'SETTINGS',
      ],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    endpoint: {
      type: String,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    statusCode: {
      type: Number,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index to auto-delete old logs (90 days)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
