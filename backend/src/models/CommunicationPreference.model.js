const mongoose = require('mongoose');

/**
 * CommunicationPreference Model - User notification preferences
 */
const communicationPreferenceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    email: {
      enabled: {
        type: Boolean,
        default: true,
      },
      categories: {
        academic: {
          type: Boolean,
          default: true,
        },
        attendance: {
          type: Boolean,
          default: true,
        },
        marks: {
          type: Boolean,
          default: true,
        },
        fees: {
          type: Boolean,
          default: true,
        },
        notices: {
          type: Boolean,
          default: true,
        },
        placement: {
          type: Boolean,
          default: true,
        },
        lms: {
          type: Boolean,
          default: true,
        },
        events: {
          type: Boolean,
          default: true,
        },
        promotional: {
          type: Boolean,
          default: false,
        },
      },
      digestFrequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'never'],
        default: 'immediate',
      },
      digestTime: {
        type: String, // "09:00" format
        default: '09:00',
      },
    },
    sms: {
      enabled: {
        type: Boolean,
        default: true,
      },
      phoneNumber: {
        type: String,
        trim: true,
      },
      categories: {
        critical: {
          type: Boolean,
          default: true,
        },
        attendance: {
          type: Boolean,
          default: true,
        },
        fees: {
          type: Boolean,
          default: true,
        },
        exams: {
          type: Boolean,
          default: true,
        },
        placement: {
          type: Boolean,
          default: false,
        },
        promotional: {
          type: Boolean,
          default: false,
        },
      },
    },
    whatsapp: {
      enabled: {
        type: Boolean,
        default: false,
      },
      phoneNumber: {
        type: String,
        trim: true,
      },
      optInDate: Date,
      categories: {
        academic: {
          type: Boolean,
          default: true,
        },
        attendance: {
          type: Boolean,
          default: true,
        },
        notices: {
          type: Boolean,
          default: true,
        },
        events: {
          type: Boolean,
          default: true,
        },
        promotional: {
          type: Boolean,
          default: false,
        },
      },
    },
    push: {
      enabled: {
        type: Boolean,
        default: true,
      },
      deviceTokens: [
        {
          token: String,
          platform: {
            type: String,
            enum: ['web', 'android', 'ios'],
          },
          addedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      categories: {
        all: {
          type: Boolean,
          default: true,
        },
        critical: {
          type: Boolean,
          default: true,
        },
        updates: {
          type: Boolean,
          default: true,
        },
      },
    },
    inApp: {
      enabled: {
        type: Boolean,
        default: true,
      },
      sound: {
        type: Boolean,
        default: true,
      },
      badge: {
        type: Boolean,
        default: true,
      },
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startTime: {
        type: String, // "22:00" format
        default: '22:00',
      },
      endTime: {
        type: String, // "07:00" format
        default: '07:00',
      },
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'mr', 'ta', 'te', 'bn', 'gu', 'kn'],
      default: 'en',
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata',
    },
  },
  {
    timestamps: true,
  }
);

// Index
communicationPreferenceSchema.index({ user: 1 });

// Method to check if user accepts notifications at given time
communicationPreferenceSchema.methods.canSendAt = function (date = new Date()) {
  if (!this.quietHours.enabled) return true;

  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentTime = hour * 60 + minute;

  const [startHour, startMin] = this.quietHours.startTime.split(':').map(Number);
  const [endHour, endMin] = this.quietHours.endTime.split(':').map(Number);

  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle quiet hours that span midnight
  if (startTime > endTime) {
    return currentTime < startTime && currentTime >= endTime;
  }

  return currentTime < startTime || currentTime >= endTime;
};

// Method to add device token
communicationPreferenceSchema.methods.addDeviceToken = function (
  token,
  platform
) {
  // Remove existing token if present
  this.push.deviceTokens = this.push.deviceTokens.filter(
    (dt) => dt.token !== token
  );

  // Add new token
  this.push.deviceTokens.push({
    token,
    platform,
    addedAt: new Date(),
  });

  // Keep only last 5 tokens per user
  if (this.push.deviceTokens.length > 5) {
    this.push.deviceTokens = this.push.deviceTokens.slice(-5);
  }

  return this.save();
};

// Method to remove device token
communicationPreferenceSchema.methods.removeDeviceToken = function (token) {
  this.push.deviceTokens = this.push.deviceTokens.filter(
    (dt) => dt.token !== token
  );
  return this.save();
};

// Static method to get or create preferences
communicationPreferenceSchema.statics.getOrCreate = async function (userId) {
  let preferences = await this.findOne({ user: userId });

  if (!preferences) {
    preferences = await this.create({ user: userId });
  }

  return preferences;
};

const CommunicationPreference = mongoose.model(
  'CommunicationPreference',
  communicationPreferenceSchema
);

module.exports = CommunicationPreference;
