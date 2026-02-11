const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true,
    },
    metadata: {
      model: String,
      tokensUsed: Number,
      responseTime: Number,
      intent: String,
      confidence: Number,
    },
    context: {
      currentModule: String,
      relatedEntities: [
        {
          type: String,
          id: mongoose.Schema.Types.ObjectId,
        },
      ],
    },
    feedback: {
      helpful: Boolean,
      rating: {
        type: Number,
        min: 1,
        max: 5,
      },
      comment: String,
    },
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
chatMessageSchema.index({ user: 1, sessionId: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Static method to get conversation history
chatMessageSchema.statics.getConversationHistory = async function (
  sessionId,
  limit = 10
) {
  return this.find({ sessionId, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get user's recent sessions
chatMessageSchema.statics.getUserSessions = async function (userId, limit = 5) {
  const sessions = await this.aggregate([
    { $match: { user: userId, isDeleted: false } },
    {
      $group: {
        _id: '$sessionId',
        lastMessage: { $last: '$message' },
        lastMessageDate: { $last: '$createdAt' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { lastMessageDate: -1 } },
    { $limit: limit },
  ]);

  return sessions;
};

// Method to mark as deleted (soft delete)
chatMessageSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

module.exports = ChatMessage;
