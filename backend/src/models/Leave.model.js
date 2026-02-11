const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
      index: true,
    },
    leaveType: {
      type: String,
      enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'compensatory', 'unpaid'],
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
    totalDays: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedDate: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    document: {
      type: String, // Cloudinary URL for medical certificate, etc.
    },
    coveringFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    remarks: {
      type: String,
      trim: true,
    },
    academicYear: {
      type: String,
    },
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
leaveSchema.index({ faculty: 1, startDate: -1 });
leaveSchema.index({ status: 1, appliedDate: -1 });
leaveSchema.index({ isDeleted: 1 });

// Calculate total days before save
leaveSchema.pre('save', function (next) {
  if (this.isModified('startDate') || this.isModified('endDate')) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  next();
});

// Static method to get leave summary
leaveSchema.statics.getLeaveSummary = async function (facultyId, academicYear) {
  const leaves = await this.find({
    faculty: facultyId,
    academicYear,
    status: 'approved',
    isDeleted: false,
  });

  const summary = {
    casual: 0,
    sick: 0,
    earned: 0,
    maternity: 0,
    paternity: 0,
    compensatory: 0,
    unpaid: 0,
    total: 0,
  };

  leaves.forEach((leave) => {
    summary[leave.leaveType] += leave.totalDays;
    summary.total += leave.totalDays;
  });

  return summary;
};

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
