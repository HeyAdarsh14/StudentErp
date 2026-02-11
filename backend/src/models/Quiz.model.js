const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
      default: 30,
    },
    totalMarks: {
      type: Number,
      required: true,
      default: 100,
    },
    passingMarks: {
      type: Number,
      default: 40,
    },
    startTime: Date,
    endTime: Date,
    instructions: String,
    isPublished: {
      type: Boolean,
      default: false,
    },
    allowMultipleAttempts: {
      type: Boolean,
      default: false,
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    questions: [
      {
        question: {
          type: String,
          required: true,
        },
        questionType: {
          type: String,
          enum: ['mcq', 'multiple-select', 'true-false', 'short-answer'],
          required: true,
        },
        options: [
          {
            text: String,
            isCorrect: Boolean,
          },
        ],
        correctAnswer: String, // For short-answer type
        marks: {
          type: Number,
          required: true,
          default: 1,
        },
        explanation: String,
      },
    ],
    attempts: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
        },
        startedAt: Date,
        submittedAt: Date,
        timeTaken: Number, // in seconds
        answers: [
          {
            questionIndex: Number,
            selectedOptions: [Number], // indices of selected options
            textAnswer: String, // for short-answer
          },
        ],
        score: Number,
        percentage: Number,
        isPassed: Boolean,
        isAutoGraded: {
          type: Boolean,
          default: true,
        },
      },
    ],
    statistics: {
      totalAttempts: {
        type: Number,
        default: 0,
      },
      averageScore: {
        type: Number,
        default: 0,
      },
      highestScore: {
        type: Number,
        default: 0,
      },
      lowestScore: Number,
      passCount: {
        type: Number,
        default: 0,
      },
      failCount: {
        type: Number,
        default: 0,
      },
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
quizSchema.index({ subject: 1, isPublished: 1 });
quizSchema.index({ createdBy: 1 });
quizSchema.index({ startTime: 1, endTime: 1 });
quizSchema.index({ 'attempts.studentId': 1 });

// Virtual for pass rate
quizSchema.virtual('passRate').get(function () {
  if (this.statistics.totalAttempts === 0) return 0;
  return ((this.statistics.passCount / this.statistics.totalAttempts) * 100).toFixed(2);
});

// Exclude soft-deleted by default
quizSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

// Method to calculate auto-graded score
quizSchema.methods.calculateScore = function (answers) {
  let score = 0;
  const totalQuestions = this.questions.length;

  answers.forEach((answer) => {
    const question = this.questions[answer.questionIndex];
    if (!question) return;

    if (question.questionType === 'mcq') {
      // Single correct answer
      const correctOption = question.options.findIndex((opt) => opt.isCorrect);
      if (answer.selectedOptions && answer.selectedOptions[0] === correctOption) {
        score += question.marks;
      }
    } else if (question.questionType === 'multiple-select') {
      // Multiple correct answers
      const correctIndices = question.options
        .map((opt, idx) => (opt.isCorrect ? idx : -1))
        .filter((idx) => idx !== -1);
      const selectedSet = new Set(answer.selectedOptions || []);
      const correctSet = new Set(correctIndices);

      // Check if selected matches correct exactly
      if (
        selectedSet.size === correctSet.size &&
        [...selectedSet].every((val) => correctSet.has(val))
      ) {
        score += question.marks;
      }
    } else if (question.questionType === 'true-false') {
      const correctOption = question.options.findIndex((opt) => opt.isCorrect);
      if (answer.selectedOptions && answer.selectedOptions[0] === correctOption) {
        score += question.marks;
      }
    } else if (question.questionType === 'short-answer') {
      // Short answer requires manual grading or exact match
      if (
        answer.textAnswer &&
        question.correctAnswer &&
        answer.textAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
      ) {
        score += question.marks;
      }
    }
  });

  return score;
};

// Method to update statistics
quizSchema.methods.updateStatistics = function () {
  const attempts = this.attempts;
  if (attempts.length === 0) return;

  const scores = attempts.map((a) => a.score).filter((s) => s !== undefined);
  this.statistics.totalAttempts = attempts.length;
  this.statistics.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  this.statistics.highestScore = Math.max(...scores);
  this.statistics.lowestScore = Math.min(...scores);
  this.statistics.passCount = attempts.filter((a) => a.isPassed).length;
  this.statistics.failCount = attempts.filter((a) => !a.isPassed).length;
};

module.exports = mongoose.model('Quiz', quizSchema);
