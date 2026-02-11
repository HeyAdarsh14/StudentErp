const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['student', 'faculty', 'admin'],
      required: true,
    },
    documentType: {
      type: String,
      enum: [
        'id_card',
        'certificate',
        'marksheet',
        'transcript',
        'resume',
        'photo',
        'signature',
        'aadhar',
        'pan',
        'passport',
        'driving_license',
        'birth_certificate',
        'transfer_certificate',
        'migration_certificate',
        'degree_certificate',
        'experience_letter',
        'offer_letter',
        'appointment_letter',
        'other',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String, // Cloudinary public ID for deletion
      required: true,
    },
    fileType: {
      type: String, // pdf, jpg, png, doc, etc.
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    expiryDate: {
      type: Date, // For documents like ID cards, passports
    },
    isExpired: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: Map,
      of: String,
    },
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
documentSchema.index({ owner: 1, documentType: 1 });
documentSchema.index({ ownerType: 1, verificationStatus: 1 });
documentSchema.index({ isDeleted: 1 });

// Check expiry before save
documentSchema.pre('save', function (next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.isExpired = true;
  }
  next();
});

const Document = mongoose.model('Document', documentSchema);

module.exports = Document;
