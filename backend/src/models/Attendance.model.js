const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    session: {
      type: String,
      enum: ['lecture', 'practical', 'tutorial'],
      default: 'lecture',
    },
    sessionNumber: {
      type: Number,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused', 'on_leave'],
      required: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ['manual', 'qr_code', 'biometric', 'geo_fence'],
      default: 'manual',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: [Number], // [longitude, latitude]
    },
    deviceInfo: {
      deviceId: String,
      ipAddress: String,
    },
    remarks: {
      type: String,
    },
    isModified: {
      type: Boolean,
      default: false,
    },
    modificationHistory: [
      {
        previousStatus: String,
        newStatus: String,
        modifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        modifiedAt: Date,
        reason: String,
      },
    ],
    academicYear: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
attendanceSchema.index({ student: 1, subject: 1, date: 1 }, { unique: true });
attendanceSchema.index({ student: 1, academicYear: 1, semester: 1 });
attendanceSchema.index({ subject: 1, date: 1 });
attendanceSchema.index({ faculty: 1, date: 1 });
attendanceSchema.index({ date: 1, status: 1 });

// Geospatial index for location-based queries
attendanceSchema.index({ location: '2dsphere' });

// Static method to calculate attendance percentage
attendanceSchema.statics.calculateAttendance = async function (studentId, subjectId, options = {}) {
  const query = {
    student: studentId,
  };

  if (subjectId) {
    query.subject = subjectId;
  }

  if (options.startDate && options.endDate) {
    query.date = {
      $gte: options.startDate,
      $lte: options.endDate,
    };
  }

  if (options.academicYear) {
    query.academicYear = options.academicYear;
  }

  if (options.semester) {
    query.semester = options.semester;
  }

  const totalClasses = await this.countDocuments(query);
  const presentClasses = await this.countDocuments({
    ...query,
    status: { $in: ['present', 'late'] },
  });

  const percentage = totalClasses > 0 ? (presentClasses / totalClasses) * 100 : 0;

  return {
    totalClasses,
    presentClasses,
    absentClasses: totalClasses - presentClasses,
    percentage: percentage.toFixed(2),
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
