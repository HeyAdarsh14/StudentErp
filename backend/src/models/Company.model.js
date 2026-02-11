const mongoose = require('mongoose');

/**
 * Company Model - Organizations visiting for campus placements
 */
const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL',
      },
    },
    logo: {
      url: String,
      publicId: String, // Cloudinary public ID
    },
    industry: {
      type: String,
      enum: [
        'IT/Software',
        'ITES/BPO',
        'Banking/Finance',
        'Consulting',
        'Manufacturing',
        'Automobile',
        'E-commerce',
        'Telecommunications',
        'Healthcare',
        'Education',
        'Government',
        'Startup',
        'Other',
      ],
      required: [true, 'Industry is required'],
    },
    companySize: {
      type: String,
      enum: [
        '1-50',
        '51-200',
        '201-500',
        '501-1000',
        '1001-5000',
        '5001-10000',
        '10000+',
      ],
    },
    headquarters: {
      city: String,
      state: String,
      country: {
        type: String,
        default: 'India',
      },
    },
    contactPerson: {
      name: {
        type: String,
        required: [true, 'Contact person name is required'],
      },
      designation: String,
      email: {
        type: String,
        required: [true, 'Contact email is required'],
        lowercase: true,
        trim: true,
      },
      phone: {
        type: String,
        required: [true, 'Contact phone is required'],
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationDate: {
      type: Date,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: String,
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    totalHires: {
      type: Number,
      default: 0,
    },
    lastVisitDate: Date,
    notes: String,
    documents: [
      {
        name: String,
        url: String,
        publicId: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
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
companySchema.index({ name: 1, isDeleted: 1 });
companySchema.index({ industry: 1, isDeleted: 1 });
companySchema.index({ isVerified: 1, isBlacklisted: 1, isDeleted: 1 });
companySchema.index({ 'contactPerson.email': 1 });

// Virtual: Active job postings
companySchema.virtual('activeJobs', {
  ref: 'JobPosting',
  localField: '_id',
  foreignField: 'company',
  match: { isActive: true, isDeleted: false },
});

// Pre-save middleware
companySchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }
  next();
});

// Soft delete method
companySchema.methods.softDelete = function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Query middleware - exclude deleted by default
companySchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
