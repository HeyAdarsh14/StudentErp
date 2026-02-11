const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['internal', 'external', 'mid_sem', 'end_sem', 'quiz', 'practical', 'viva'],
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
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
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    passingMarks: {
      type: Number,
      required: true,
    },
    venue: {
      type: String,
    },
    roomNumber: {
      type: String,
    },
    invigilators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
      },
    ],
    instructions: [String],
    syllabus: {
      units: [Number],
      chapters: [String],
    },
    status: {
      type: String,
      enum: ['scheduled', 'ongoing', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    marksUploadDeadline: {
      type: Date,
    },
    isMarksUploaded: {
      type: Boolean,
      default: false,
    },
    marksUploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    marksUploadedAt: {
      type: Date,
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
examSchema.index({ subject: 1, date: 1 });
examSchema.index({ department: 1, year: 1, semester: 1, academicYear: 1 });
examSchema.index({ date: 1, status: 1 });
examSchema.index({ type: 1, academicYear: 1 });

// Query middleware
examSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Exam', examSchema);
