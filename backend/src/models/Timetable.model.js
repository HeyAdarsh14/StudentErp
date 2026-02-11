const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    year: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
    },
    section: {
      type: String,
      required: true,
      uppercase: true,
    },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
    },
    schedule: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          required: true,
        },
        slots: [
          {
            slotNumber: Number,
            startTime: {
              type: String,
              required: true,
            },
            endTime: {
              type: String,
              required: true,
            },
            subject: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Subject',
            },
            faculty: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'Faculty',
            },
            type: {
              type: String,
              enum: ['lecture', 'practical', 'tutorial', 'break', 'lunch'],
              default: 'lecture',
            },
            venue: {
              type: String,
            },
            roomNumber: {
              type: String,
            },
          },
        ],
      },
    ],
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    remarks: {
      type: String,
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
timetableSchema.index({ department: 1, year: 1, section: 1, academicYear: 1 });
timetableSchema.index({ status: 1, effectiveFrom: 1 });
timetableSchema.index({ 'schedule.slots.faculty': 1 });

// Query middleware
timetableSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Timetable', timetableSchema);
