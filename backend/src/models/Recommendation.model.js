const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'course',
        'subject',
        'internship',
        'project',
        'study_material',
        'skill',
        'career_path',
        'mentor',
        'event',
        'scholarship',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    metadata: {
      source: {
        type: String,
        enum: ['ai', 'manual', 'collaborative_filtering', 'content_based'],
        default: 'ai',
      },
      algorithm: String,
      confidence: Number,
      relatedTo: [
        {
          type: mongoose.Schema.Types.ObjectId,
          refPath: 'metadata.relatedModel',
        },
      ],
      relatedModel: String,
    },
    factors: [
      {
        name: String,
        weight: Number,
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'viewed', 'accepted', 'rejected', 'completed'],
      default: 'pending',
    },
    interactionDate: Date,
    expiresAt: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    tags: [String],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
recommendationSchema.index({ user: 1, status: 1, score: -1 });
recommendationSchema.index({ type: 1, status: 1 });
recommendationSchema.index({ expiresAt: 1 });
recommendationSchema.index({ createdAt: -1 });

// Virtual for isExpired
recommendationSchema.virtual('isExpired').get(function () {
  return this.expiresAt && this.expiresAt < new Date();
});

// Static method to get user recommendations
recommendationSchema.statics.getUserRecommendations = async function (
  userId,
  filters = {}
) {
  const query = {
    user: userId,
    isDeleted: false,
    status: { $in: ['pending', 'viewed'] },
    ...filters,
  };

  // Exclude expired recommendations
  if (!filters.includeExpired) {
    query.$or = [{ expiresAt: { $gte: new Date() } }, { expiresAt: null }];
  }

  return this.find(query).sort({ score: -1, createdAt: -1 }).lean();
};

// Static method to get recommendations by type
recommendationSchema.statics.getByType = async function (userId, type, limit = 5) {
  return this.find({
    user: userId,
    type,
    status: { $in: ['pending', 'viewed'] },
    isDeleted: false,
  })
    .sort({ score: -1 })
    .limit(limit)
    .lean();
};

// Method to mark as viewed
recommendationSchema.methods.markAsViewed = function () {
  if (this.status === 'pending') {
    this.status = 'viewed';
    this.interactionDate = new Date();
  }
  return this.save();
};

// Method to accept recommendation
recommendationSchema.methods.accept = function () {
  this.status = 'accepted';
  this.interactionDate = new Date();
  return this.save();
};

// Method to reject recommendation
recommendationSchema.methods.reject = function () {
  this.status = 'rejected';
  this.interactionDate = new Date();
  return this.save();
};

// Method to mark as completed
recommendationSchema.methods.complete = function () {
  this.status = 'completed';
  this.interactionDate = new Date();
  return this.save();
};

// Method to soft delete
recommendationSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

module.exports = Recommendation;
