const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Department name is required'],
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Department code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
    },
    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    establishedYear: {
      type: Number,
    },
    building: {
      type: String,
    },
    officeRoom: {
      type: String,
    },
    contactEmail: {
      type: String,
      lowercase: true,
    },
    contactPhone: {
      type: String,
    },
    totalSeats: {
      type: Number,
      default: 0,
    },
    programs: [
      {
        name: String,
        degree: {
          type: String,
          enum: ['B.Tech', 'M.Tech', 'MBA', 'MCA', 'Ph.D', 'Diploma'],
        },
        duration: Number, // in years
        totalSeats: Number,
      },
    ],
    laboratories: [
      {
        name: String,
        roomNumber: String,
        capacity: Number,
      },
    ],
    vision: {
      type: String,
    },
    mission: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
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
departmentSchema.index({ code: 1 });
departmentSchema.index({ name: 1 });
departmentSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for faculty count
departmentSchema.virtual('facultyCount', {
  ref: 'Faculty',
  localField: '_id',
  foreignField: 'department',
  count: true,
});

// Virtual for student count
departmentSchema.virtual('studentCount', {
  ref: 'Student',
  localField: '_id',
  foreignField: 'department',
  count: true,
});

// Query middleware to exclude soft-deleted records
departmentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Department', departmentSchema);
