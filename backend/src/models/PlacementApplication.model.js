const mongoose = require('mongoose');

/**
 * PlacementApplication Model - Student applications to job postings
 */
const placementApplicationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student is required'],
      index: true,
    },
    jobPosting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPosting',
      required: [true, 'Job posting is required'],
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true,
    },
    status: {
      type: String,
      enum: [
        'Applied',
        'Under Review',
        'Shortlisted',
        'Interview Scheduled',
        'Interview Completed',
        'Selected',
        'Rejected',
        'Offer Accepted',
        'Offer Rejected',
        'Joined',
        'Withdrawn',
      ],
      default: 'Applied',
      index: true,
    },
    resume: {
      url: {
        type: String,
        required: [true, 'Resume is required'],
      },
      publicId: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
    coverLetter: {
      url: String,
      publicId: String,
    },
    additionalDocuments: [
      {
        name: String,
        type: String, // "Marksheet", "Certificate", "Portfolio", etc.
        url: String,
        publicId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    answers: [
      {
        question: String,
        answer: String,
      },
    ],
    eligibilityCheck: {
      passed: {
        type: Boolean,
        required: true,
      },
      errors: [String],
      checkedAt: {
        type: Date,
        default: Date.now,
      },
    },
    interviews: [
      {
        round: String, // "Technical Round", "HR Round", etc.
        type: {
          type: String,
          enum: ['Online Test', 'Phone', 'Video', 'In-person', 'Group Discussion'],
        },
        scheduledAt: Date,
        duration: Number, // in minutes
        location: String,
        meetingLink: String,
        interviewers: [
          {
            name: String,
            designation: String,
            email: String,
          },
        ],
        status: {
          type: String,
          enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'],
          default: 'Scheduled',
        },
        result: {
          type: String,
          enum: ['Selected', 'Rejected', 'On Hold', 'Pending'],
        },
        feedback: String,
        rating: {
          type: Number,
          min: 0,
          max: 10,
        },
        completedAt: Date,
      },
    ],
    offer: {
      isOffered: {
        type: Boolean,
        default: false,
      },
      offeredAt: Date,
      offerLetter: {
        url: String,
        publicId: String,
      },
      package: {
        currency: {
          type: String,
          default: 'INR',
        },
        ctc: Number, // Cost to Company
        base: Number,
        bonus: Number,
        otherBenefits: String,
      },
      joiningDate: Date,
      location: String,
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
    },
    timeline: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        notes: String,
      },
    ],
    studentNotes: String, // Private notes by student
    placementOfficerNotes: String, // Notes by placement team
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
      submittedAt: Date,
    },
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

// Compound indexes
placementApplicationSchema.index(
  { student: 1, jobPosting: 1 },
  { unique: true }
); // One application per student per job
placementApplicationSchema.index({ student: 1, status: 1, isDeleted: 1 });
placementApplicationSchema.index({ jobPosting: 1, status: 1, isDeleted: 1 });
placementApplicationSchema.index({ company: 1, status: 1, isDeleted: 1 });
placementApplicationSchema.index({ createdAt: -1 });

// Pre-save middleware
placementApplicationSchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }

  // Add to timeline when status changes
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      changedAt: new Date(),
    });
  }

  next();
});

// Method to update status
placementApplicationSchema.methods.updateStatus = function (
  newStatus,
  userId,
  notes
) {
  this.status = newStatus;
  this.timeline.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: userId,
    notes,
  });
  return this.save();
};

// Method to schedule interview
placementApplicationSchema.methods.scheduleInterview = function (interviewData) {
  this.interviews.push(interviewData);
  if (this.status === 'Applied' || this.status === 'Under Review') {
    this.status = 'Interview Scheduled';
  }
  return this.save();
};

// Method to make offer
placementApplicationSchema.methods.makeOffer = function (offerData) {
  this.offer = {
    ...offerData,
    isOffered: true,
    offeredAt: new Date(),
  };
  this.status = 'Selected';
  return this.save();
};

// Method to accept offer
placementApplicationSchema.methods.acceptOffer = function () {
  if (!this.offer.isOffered) {
    throw new Error('No offer to accept');
  }
  this.offer.acceptedAt = new Date();
  this.status = 'Offer Accepted';
  return this.save();
};

// Method to reject offer
placementApplicationSchema.methods.rejectOffer = function (reason) {
  if (!this.offer.isOffered) {
    throw new Error('No offer to reject');
  }
  this.offer.rejectedAt = new Date();
  this.offer.rejectionReason = reason;
  this.status = 'Offer Rejected';
  return this.save();
};

// Soft delete method
placementApplicationSchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Query middleware - exclude deleted by default
placementApplicationSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const PlacementApplication = mongoose.model(
  'PlacementApplication',
  placementApplicationSchema
);

module.exports = PlacementApplication;
