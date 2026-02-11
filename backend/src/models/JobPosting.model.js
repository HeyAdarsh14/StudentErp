const mongoose = require('mongoose');

/**
 * JobPosting Model - Job opportunities posted by companies
 */
const jobPostingSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    jobType: {
      type: String,
      enum: ['Full-time', 'Internship', 'Part-time', 'Contract'],
      required: [true, 'Job type is required'],
    },
    jobRole: {
      type: String,
      enum: [
        'Software Developer',
        'Data Scientist',
        'Business Analyst',
        'Consultant',
        'Product Manager',
        'DevOps Engineer',
        'QA Engineer',
        'UI/UX Designer',
        'System Administrator',
        'Network Engineer',
        'Database Administrator',
        'Sales Executive',
        'Marketing Executive',
        'HR Executive',
        'Finance Analyst',
        'Operations Manager',
        'Other',
      ],
      required: [true, 'Job role is required'],
    },
    locations: [
      {
        city: String,
        state: String,
        country: {
          type: String,
          default: 'India',
        },
      },
    ],
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    eligibilityCriteria: {
      minCGPA: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      maxBacklogs: {
        type: Number,
        min: 0,
        default: 0,
      },
      allowedYears: [
        {
          type: Number,
          enum: [1, 2, 3, 4],
        },
      ],
      allowedGenders: [
        {
          type: String,
          enum: ['Male', 'Female', 'Other'],
        },
      ],
      requiredSkills: [String],
      preferredSkills: [String],
    },
    package: {
      currency: {
        type: String,
        default: 'INR',
      },
      minSalary: {
        type: Number,
        required: [true, 'Minimum salary is required'],
      },
      maxSalary: Number,
      otherBenefits: String,
    },
    stipend: {
      // For internships
      amount: Number,
      currency: {
        type: String,
        default: 'INR',
      },
      duration: String, // "3 months", "6 months"
    },
    vacancies: {
      type: Number,
      required: [true, 'Number of vacancies is required'],
      min: 1,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: 'Deadline must be in the future',
      },
    },
    selectionProcess: [
      {
        round: String, // "Online Test", "Technical Interview", "HR Interview"
        description: String,
        date: Date,
      },
    ],
    requiredDocuments: [
      {
        type: String,
        enum: [
          'Resume',
          'Cover Letter',
          'Marksheets',
          'ID Proof',
          'Portfolio',
          'Certificates',
          'Other',
        ],
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    totalApplications: {
      type: Number,
      default: 0,
    },
    shortlistedCount: {
      type: Number,
      default: 0,
    },
    selectedCount: {
      type: Number,
      default: 0,
    },
    rejectedCount: {
      type: Number,
      default: 0,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastDateToApply: Date,
    contactEmail: String,
    contactPhone: String,
    additionalInfo: String,
    attachments: [
      {
        name: String,
        url: String,
        publicId: String,
      },
    ],
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
jobPostingSchema.index({ company: 1, isActive: 1, isDeleted: 1 });
jobPostingSchema.index({ jobType: 1, isActive: 1, isDeleted: 1 });
jobPostingSchema.index({ applicationDeadline: 1, isActive: 1 });
jobPostingSchema.index({ 'eligibilityCriteria.minCGPA': 1 });
jobPostingSchema.index({ departments: 1 });

// Virtual: Applications
jobPostingSchema.virtual('applications', {
  ref: 'PlacementApplication',
  localField: '_id',
  foreignField: 'jobPosting',
});

// Pre-save middleware
jobPostingSchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }
  
  // Set lastDateToApply same as applicationDeadline if not provided
  if (!this.lastDateToApply && this.applicationDeadline) {
    this.lastDateToApply = this.applicationDeadline;
  }
  
  next();
});

// Method to check if student is eligible
jobPostingSchema.methods.checkEligibility = function (student) {
  const criteria = this.eligibilityCriteria;
  const errors = [];

  // Check CGPA
  if (student.academicInfo?.cgpa < criteria.minCGPA) {
    errors.push(`Minimum CGPA required: ${criteria.minCGPA}`);
  }

  // Check backlogs
  const backlogs = student.academicInfo?.backlogs || 0;
  if (backlogs > criteria.maxBacklogs) {
    errors.push(`Maximum ${criteria.maxBacklogs} backlogs allowed`);
  }

  // Check year
  if (
    criteria.allowedYears?.length > 0 &&
    !criteria.allowedYears.includes(student.currentYear)
  ) {
    errors.push(
      `Only ${criteria.allowedYears.join(', ')} year students allowed`
    );
  }

  // Check gender
  if (
    criteria.allowedGenders?.length > 0 &&
    !criteria.allowedGenders.includes(student.personalInfo?.gender)
  ) {
    errors.push(`Gender restriction applies`);
  }

  // Check department
  if (
    this.departments?.length > 0 &&
    !this.departments.some((d) => d.toString() === student.department.toString())
  ) {
    errors.push(`Not open for your department`);
  }

  return {
    eligible: errors.length === 0,
    errors,
  };
};

// Method to check if deadline passed
jobPostingSchema.methods.isExpired = function () {
  return new Date() > this.applicationDeadline;
};

// Soft delete method
jobPostingSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.isActive = false;
  return this.save();
};

// Query middleware - exclude deleted by default
jobPostingSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

module.exports = JobPosting;
