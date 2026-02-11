const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
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
    credits: {
      type: Number,
      required: true,
      min: 1,
    },
    type: {
      type: String,
      enum: ['theory', 'practical', 'both'],
      default: 'theory',
    },
    category: {
      type: String,
      enum: ['core', 'elective', 'open_elective', 'minor'],
      default: 'core',
    },
    totalLectures: {
      type: Number,
      default: 0,
    },
    totalPracticals: {
      type: Number,
      default: 0,
    },
    faculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
      },
    ],
    syllabus: {
      description: String,
      units: [
        {
          unitNumber: Number,
          title: String,
          topics: [String],
          hours: Number,
        },
      ],
      books: [
        {
          title: String,
          author: String,
          publisher: String,
          type: {
            type: String,
            enum: ['textbook', 'reference', 'journal'],
          },
        },
      ],
    },
    evaluation: {
      internal: {
        marks: Number,
        components: [
          {
            name: String,
            marks: Number,
          },
        ],
      },
      external: {
        marks: Number,
        duration: Number, // in minutes
      },
      totalMarks: Number,
      passingMarks: Number,
    },
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    courseOutcomes: [
      {
        outcome: String,
        bloomsLevel: {
          type: String,
          enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
        },
      },
    ],
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

// Compound index for unique subject per department, year, and semester
subjectSchema.index({ code: 1 });
subjectSchema.index({ department: 1, year: 1, semester: 1 });
subjectSchema.index({ isActive: 1, isDeleted: 1 });

// Query middleware to exclude soft-deleted records
subjectSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Subject', subjectSchema);
