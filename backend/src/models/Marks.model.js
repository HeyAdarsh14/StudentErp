const mongoose = require('mongoose');

const marksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
    },
    percentage: {
      type: Number,
    },
    grade: {
      type: String,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F', 'AB'],
    },
    gradePoint: {
      type: Number,
      min: 0,
      max: 10,
    },
    status: {
      type: String,
      enum: ['pass', 'fail', 'absent'],
    },
    remarks: {
      type: String,
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    isModified: {
      type: Boolean,
      default: false,
    },
    modificationHistory: [
      {
        previousMarks: Number,
        newMarks: Number,
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
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate entries
marksSchema.index({ student: 1, exam: 1 }, { unique: true });
marksSchema.index({ student: 1, subject: 1, academicYear: 1, semester: 1 });
marksSchema.index({ exam: 1, status: 1 });

// Calculate percentage, grade, and status before saving
marksSchema.pre('save', function (next) {
  // Calculate percentage
  this.percentage = ((this.marksObtained / this.totalMarks) * 100).toFixed(2);

  // Determine grade based on percentage
  if (this.isAbsent) {
    this.grade = 'AB';
    this.status = 'absent';
    this.gradePoint = 0;
  } else {
    const percentage = this.percentage;
    
    if (percentage >= 90) {
      this.grade = 'O';
      this.gradePoint = 10;
      this.status = 'pass';
    } else if (percentage >= 80) {
      this.grade = 'A+';
      this.gradePoint = 9;
      this.status = 'pass';
    } else if (percentage >= 70) {
      this.grade = 'A';
      this.gradePoint = 8;
      this.status = 'pass';
    } else if (percentage >= 60) {
      this.grade = 'B+';
      this.gradePoint = 7;
      this.status = 'pass';
    } else if (percentage >= 50) {
      this.grade = 'B';
      this.gradePoint = 6;
      this.status = 'pass';
    } else if (percentage >= 40) {
      this.grade = 'C';
      this.gradePoint = 5;
      this.status = 'pass';
    } else if (percentage >= 35) {
      this.grade = 'P';
      this.gradePoint = 4;
      this.status = 'pass';
    } else {
      this.grade = 'F';
      this.gradePoint = 0;
      this.status = 'fail';
    }
  }

  next();
});

// Query middleware
marksSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Marks', marksSchema);
