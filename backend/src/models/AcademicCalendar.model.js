const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    eventType: {
      type: String,
      enum: [
        'holiday',
        'exam',
        'vacation',
        'semester-start',
        'semester-end',
        'registration',
        'orientation',
        'convocation',
        'sports-day',
        'cultural-event',
        'other',
      ],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    year: Number,
    isHoliday: {
      type: Boolean,
      default: false,
    },
    affectedGroups: {
      type: String,
      enum: ['all', 'specific-department', 'specific-year', 'faculty-only', 'students-only'],
      default: 'all',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    color: {
      type: String,
      default: '#3B82F6', // Blue
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
      },
      interval: Number,
      endDate: Date,
    },
    // Soft delete
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
academicCalendarSchema.index({ startDate: 1, endDate: 1 });
academicCalendarSchema.index({ eventType: 1 });
academicCalendarSchema.index({ academicYear: 1, semester: 1 });
academicCalendarSchema.index({ department: 1, year: 1 });

// Exclude soft-deleted by default
academicCalendarSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// Validate dates
academicCalendarSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);
