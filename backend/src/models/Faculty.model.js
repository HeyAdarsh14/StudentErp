const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    qualification: [
      {
        degree: String,
        institution: String,
        year: Number,
        specialization: String,
      },
    ],
    experience: {
      total: {
        type: Number,
        default: 0,
      },
      teaching: {
        type: Number,
        default: 0,
      },
      industry: {
        type: Number,
        default: 0,
      },
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    specialization: [String],
    joiningDate: {
      type: Date,
      required: true,
    },
    employmentType: {
      type: String,
      enum: ['permanent', 'contract', 'visiting', 'guest'],
      default: 'permanent',
    },
    workload: {
      lecturesPerWeek: {
        type: Number,
        default: 0,
      },
      practicalPerWeek: {
        type: Number,
        default: 0,
      },
      totalHours: {
        type: Number,
        default: 0,
      },
    },
    classesAssigned: [
      {
        department: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
        },
        year: Number,
        section: String,
        subject: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Subject',
        },
      },
    ],
    publications: [
      {
        title: String,
        journal: String,
        year: Number,
        authors: [String],
        doi: String,
        type: {
          type: String,
          enum: ['journal', 'conference', 'book', 'patent'],
        },
      },
    ],
    certifications: [
      {
        name: String,
        issuingOrganization: String,
        issueDate: Date,
        expiryDate: Date,
        credentialId: String,
        credentialUrl: String,
      },
    ],
    researchInterests: [String],
    achievements: [
      {
        title: String,
        description: String,
        date: Date,
        category: String,
      },
    ],
    leaveBalance: {
      casual: {
        type: Number,
        default: 12,
      },
      sick: {
        type: Number,
        default: 6,
      },
      earned: {
        type: Number,
        default: 15,
      },
    },
    performanceRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    officeHours: [
      {
        day: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
        startTime: String,
        endTime: String,
      },
    ],
    status: {
      type: String,
      enum: ['active', 'on_leave', 'retired', 'resigned', 'terminated'],
      default: 'active',
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
facultySchema.index({ employeeId: 1 });
facultySchema.index({ department: 1, status: 1 });
facultySchema.index({ designation: 1, isDeleted: 1 });

// Virtual populate user details
facultySchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Query middleware to exclude soft-deleted records
facultySchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// Auto-populate user details
facultySchema.pre(/^find/, function (next) {
  if (!this.getOptions().skipPopulate) {
    this.populate({
      path: 'userId',
      select: 'name email contactNumber profileImage',
    });
  }
  next();
});

module.exports = mongoose.model('Faculty', facultySchema);
