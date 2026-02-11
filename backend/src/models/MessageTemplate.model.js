const mongoose = require('mongoose');

/**
 * MessageTemplate Model - Reusable message templates
 */
const messageTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Template code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'academic',
        'attendance',
        'marks',
        'fees',
        'notices',
        'placement',
        'lms',
        'events',
        'promotional',
        'system',
      ],
      required: [true, 'Category is required'],
      index: true,
    },
    channels: {
      email: {
        enabled: {
          type: Boolean,
          default: false,
        },
        subject: String,
        html: String,
        text: String,
      },
      sms: {
        enabled: {
          type: Boolean,
          default: false,
        },
        text: {
          type: String,
          maxlength: 160, // SMS character limit
        },
      },
      whatsapp: {
        enabled: {
          type: Boolean,
          default: false,
        },
        text: String,
        mediaUrl: String, // For images, videos, documents
        mediaType: {
          type: String,
          enum: ['image', 'video', 'document', 'audio'],
        },
      },
      push: {
        enabled: {
          type: Boolean,
          default: false,
        },
        title: String,
        body: String,
        icon: String,
        clickAction: String,
      },
    },
    variables: [
      {
        name: String, // e.g., "studentName", "courseName"
        description: String,
        example: String,
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedAt: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
  }
);

// Indexes
messageTemplateSchema.index({ code: 1, isDeleted: 1 });
messageTemplateSchema.index({ category: 1, isActive: 1 });
messageTemplateSchema.index({ isSystem: 1 });

// Pre-save middleware
messageTemplateSchema.pre('save', function (next) {
  if (this.isModified('isDeleted') && this.isDeleted) {
    this.deletedAt = new Date();
  }
  next();
});

// Method to interpolate variables
messageTemplateSchema.methods.render = function (channel, variables = {}) {
  if (!this.channels[channel] || !this.channels[channel].enabled) {
    throw new Error(`Channel ${channel} is not enabled for this template`);
  }

  const channelData = this.channels[channel];
  const rendered = {};

  // Helper function to replace variables
  const interpolate = (text) => {
    if (!text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  };

  // Render based on channel
  switch (channel) {
    case 'email':
      rendered.subject = interpolate(channelData.subject);
      rendered.html = interpolate(channelData.html);
      rendered.text = interpolate(channelData.text);
      break;

    case 'sms':
    case 'whatsapp':
      rendered.text = interpolate(channelData.text);
      if (channelData.mediaUrl) {
        rendered.mediaUrl = interpolate(channelData.mediaUrl);
        rendered.mediaType = channelData.mediaType;
      }
      break;

    case 'push':
      rendered.title = interpolate(channelData.title);
      rendered.body = interpolate(channelData.body);
      rendered.icon = channelData.icon;
      rendered.clickAction = interpolate(channelData.clickAction);
      break;
  }

  return rendered;
};

// Method to validate variables
messageTemplateSchema.methods.validateVariables = function (variables) {
  const errors = [];

  for (const variable of this.variables) {
    if (variable.required && !variables[variable.name]) {
      errors.push(`Required variable '${variable.name}' is missing`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Method to increment usage
messageTemplateSchema.methods.incrementUsage = function () {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Soft delete method
messageTemplateSchema.methods.softDelete = function (userId) {
  if (this.isSystem) {
    throw new Error('Cannot delete system templates');
  }
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Query middleware - exclude deleted by default
messageTemplateSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

const MessageTemplate = mongoose.model(
  'MessageTemplate',
  messageTemplateSchema
);

module.exports = MessageTemplate;
