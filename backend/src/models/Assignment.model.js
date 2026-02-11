const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    batch: { type: String },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    dueDate: { type: Date },
    maxMarks: { type: Number, default: 100 },
    attachments: [
      {
        fileName: String,
        url: String,
      },
    ],
    submissions: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
        submittedAt: Date,
        content: String,
        attachments: [
          {
            fileName: String,
            url: String,
          },
        ],
        marks: Number,
        gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
        gradedAt: Date,
        feedback: String,
      },
    ],

    // Soft delete
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
assignmentSchema.index({ subject: 1 });
assignmentSchema.index({ assignedBy: 1 });

// Exclude soft-deleted by default
assignmentSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
