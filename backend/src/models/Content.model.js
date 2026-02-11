const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    contentType: {
      type: String,
      enum: ['lecture-note', 'video', 'presentation', 'pdf', 'document', 'link', 'other'],
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
    },
    batch: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    fileUrl: String,
    fileName: String,
    fileSize: Number, // in bytes
    mimeType: String,
    externalLink: String, // for YouTube, Google Drive, etc.
    tags: [String],
    category: {
      type: String,
      enum: ['theory', 'practical', 'tutorial', 'reference', 'supplementary'],
      default: 'theory',
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    accessControl: {
      type: String,
      enum: ['public', 'students-only', 'specific-batch'],
      default: 'students-only',
    },
    version: {
      type: Number,
      default: 1,
    },
    versions: [
      {
        versionNumber: Number,
        fileUrl: String,
        fileName: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Faculty',
        },
        changeLog: String,
      },
    ],
    views: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    downloads: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        downloadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    metadata: {
      duration: String, // for videos
      pageCount: Number, // for PDFs
      resolution: String, // for videos
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
contentSchema.index({ subject: 1, isPublished: 1 });
contentSchema.index({ uploadedBy: 1 });
contentSchema.index({ contentType: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ batch: 1, department: 1 });

// Virtual for total views
contentSchema.virtual('totalViews').get(function () {
  return this.views?.length || 0;
});

// Virtual for total downloads
contentSchema.virtual('totalDownloads').get(function () {
  return this.downloads?.length || 0;
});

// Exclude soft-deleted by default
contentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// Method to add view
contentSchema.methods.addView = function (userId) {
  // Check if user already viewed in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentView = this.views.find(
    (v) => v.userId.toString() === userId.toString() && v.viewedAt > oneDayAgo
  );

  if (!recentView) {
    this.views.push({ userId, viewedAt: new Date() });
  }
};

// Method to add download
contentSchema.methods.addDownload = function (userId) {
  this.downloads.push({ userId, downloadedAt: new Date() });
};

// Method to create new version
contentSchema.methods.createNewVersion = function (fileData, uploadedBy, changeLog) {
  this.versions.push({
    versionNumber: this.version,
    fileUrl: this.fileUrl,
    fileName: this.fileName,
    uploadedAt: this.updatedAt || new Date(),
    uploadedBy: this.uploadedBy,
    changeLog: changeLog || 'Version updated',
  });

  this.version += 1;
  this.fileUrl = fileData.fileUrl;
  this.fileName = fileData.fileName;
  this.fileSize = fileData.fileSize;
  this.uploadedBy = uploadedBy;
};

module.exports = mongoose.model('Content', contentSchema);
