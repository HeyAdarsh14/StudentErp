const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    rollNumber: {
      type: String,
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    batch: {
      type: String,
      required: true,
    },
    academicYear: {
      type: String,
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
    section: {
      type: String,
      required: true,
      uppercase: true,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    parentInfo: {
      fatherName: String,
      fatherContactNumber: String,
      fatherOccupation: String,
      motherName: String,
      motherContactNumber: String,
      motherOccupation: String,
      guardianName: String,
      guardianContactNumber: String,
      guardianRelation: String,
    },
    admissionDetails: {
      admissionDate: Date,
      admissionType: {
        type: String,
        enum: ['regular', 'lateral', 'transfer'],
        default: 'regular',
      },
      previousInstitution: String,
      previousPercentage: Number,
    },
    documents: [
      {
        documentType: {
          type: String,
          enum: [
            'photo',
            'aadhar',
            'marksheet_10th',
            'marksheet_12th',
            'transfer_certificate',
            'domicile',
            'other',
          ],
        },
        documentName: String,
        documentUrl: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    academicStatus: {
      type: String,
      enum: ['active', 'dropout', 'completed', 'detained', 'suspended'],
      default: 'active',
    },
    cgpa: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    sgpa: [
      {
        semester: Number,
        gpa: Number,
      },
    ],
    backlogCount: {
      type: Number,
      default: 0,
    },
    isHostelResident: {
      type: Boolean,
      default: false,
    },
    hostelDetails: {
      hostelName: String,
      roomNumber: String,
      blockNumber: String,
    },
    transportDetails: {
      usesTransport: {
        type: Boolean,
        default: false,
      },
      routeNumber: String,
      pickupPoint: String,
    },
    placementStatus: {
      isPlaced: {
        type: Boolean,
        default: false,
      },
      companyName: String,
      packageOffered: Number,
      placementDate: Date,
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
studentSchema.index({ registrationNumber: 1 });
studentSchema.index({ department: 1, year: 1, section: 1 });
studentSchema.index({ batch: 1, academicYear: 1 });
studentSchema.index({ academicStatus: 1, isDeleted: 1 });

// Compound index for unique roll number per department and year
studentSchema.index({ department: 1, year: 1, rollNumber: 1 }, { unique: true });

// Virtual populate user details
studentSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// Query middleware to exclude soft-deleted records
studentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// Auto-populate user details
studentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().skipPopulate) {
    this.populate({
      path: 'userId',
      select: 'name email contactNumber profileImage',
    });
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);
