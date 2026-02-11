const Quiz = require('../models/Quiz.model');
const Student = require('../models/Student.model');
const MESSAGES = require('../constants/messages');
const logger = require('../utils/logger');

/**
 * Create a new quiz (Faculty/Admin)
 */
const createQuiz = async (req, res, next) => {
  try {
    const quizData = {
      ...req.body,
      createdBy: req.user.id,
    };

    const quiz = await Quiz.create(quizData);

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List quizzes with filters
 */
const listQuizzes = async (req, res, next) => {
  try {
    const { subject, department, batch, isPublished, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (subject) filter.subject = subject;
    if (department) filter.department = department;
    if (batch) filter.batch = batch;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';

    // Students only see published quizzes
    if (req.user.role === 'student') {
      filter.isPublished = true;
      filter.startTime = { $lte: new Date() };
      filter.endTime = { $gte: new Date() };
    }

    const quizzes = await Quiz.find(filter)
      .select('-questions.options.isCorrect -questions.correctAnswer') // Hide answers in list
      .populate('subject', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await Quiz.countDocuments(filter);

    res.json({
      success: true,
      data: quizzes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single quiz (Faculty sees full quiz, Students see without answers)
 */
const getQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name')
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    // Students don't see correct answers until quiz is submitted
    if (req.user.role === 'student') {
      quiz.questions = quiz.questions.map((q) => {
        const question = { ...q };
        delete question.options?.forEach((opt) => delete opt.isCorrect);
        delete question.correctAnswer;
        delete question.explanation;
        return question;
      });
      delete quiz.attempts; // Students don't see other attempts
    }

    res.json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quiz (Faculty/Admin)
 */
const updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Quiz updated successfully',
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quiz (Soft delete)
 */
const deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true }
    );

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start quiz attempt (Student)
 */
const startQuizAttempt = async (req, res, next) => {
  try {
    const student = await Student.findOne({ userId: req.user.id });
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    // Check if quiz is published and active
    if (!quiz.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Quiz is not yet published',
      });
    }

    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      return res.status(400).json({
        success: false,
        message: 'Quiz has not started yet',
      });
    }

    if (quiz.endTime && now > quiz.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Quiz has ended',
      });
    }

    // Check for existing attempts
    const existingAttempts = quiz.attempts.filter(
      (a) => a.studentId.toString() === student._id.toString()
    );

    if (!quiz.allowMultipleAttempts && existingAttempts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already attempted this quiz',
      });
    }

    // Create new attempt
    const attempt = {
      studentId: student._id,
      startedAt: new Date(),
      answers: [],
    };

    quiz.attempts.push(attempt);
    await quiz.save();

    // Return quiz without answers
    const quizData = quiz.toObject();
    quizData.questions = quizData.questions.map((q) => ({
      question: q.question,
      questionType: q.questionType,
      options: q.options?.map((opt) => ({ text: opt.text })),
      marks: q.marks,
    }));

    res.json({
      success: true,
      message: 'Quiz attempt started',
      data: {
        quizId: quiz._id,
        attemptId: quiz.attempts[quiz.attempts.length - 1]._id,
        duration: quiz.duration,
        totalMarks: quiz.totalMarks,
        questions: quizData.questions,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit quiz attempt (Student)
 */
const submitQuizAttempt = async (req, res, next) => {
  try {
    const { attemptId, answers } = req.body;

    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    const attempt = quiz.attempts.id(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Attempt not found',
      });
    }

    if (attempt.submittedAt) {
      return res.status(400).json({
        success: false,
        message: 'Quiz already submitted',
      });
    }

    // Calculate time taken
    const timeTaken = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);

    // Save answers
    attempt.answers = answers;
    attempt.submittedAt = new Date();
    attempt.timeTaken = timeTaken;

    // Auto-grade
    const score = quiz.calculateScore(answers);
    const percentage = ((score / quiz.totalMarks) * 100).toFixed(2);

    attempt.score = score;
    attempt.percentage = percentage;
    attempt.isPassed = score >= quiz.passingMarks;
    attempt.isAutoGraded = true;

    // Update statistics
    quiz.updateStatistics();

    await quiz.save();

    // Build result with correct answers if allowed
    let result = {
      score,
      percentage,
      totalMarks: quiz.totalMarks,
      isPassed: attempt.isPassed,
      timeTaken,
    };

    if (quiz.showCorrectAnswers) {
      result.questions = quiz.questions.map((q, idx) => ({
        question: q.question,
        yourAnswer: answers.find((a) => a.questionIndex === idx),
        correctAnswer: q.options?.filter((opt) => opt.isCorrect).map((opt) => opt.text),
        explanation: q.explanation,
        marks: q.marks,
      }));
    }

    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      data: result,
    });
  } catch (error) {
    logger.error(`Quiz submission error: ${error.message}`);
    next(error);
  }
};

/**
 * Get quiz results/attempts (Student sees own, Faculty sees all)
 */
const getQuizResults = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('attempts.studentId', 'rollNumber')
      .populate({
        path: 'attempts.studentId',
        populate: { path: 'userId', select: 'name email' },
      })
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    let results;

    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.id });
      results = quiz.attempts.filter(
        (a) => a.studentId._id.toString() === student._id.toString()
      );
    } else {
      results = quiz.attempts;
    }

    res.json({
      success: true,
      data: {
        quizTitle: quiz.title,
        statistics: quiz.statistics,
        passRate: quiz.passRate,
        attempts: results,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz analytics (Faculty/Admin)
 */
const getQuizAnalytics = async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id).lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.NOT_FOUND,
      });
    }

    // Question-wise analysis
    const questionAnalysis = quiz.questions.map((q, idx) => {
      const correctAnswers = quiz.attempts.filter((attempt) => {
        const answer = attempt.answers.find((a) => a.questionIndex === idx);
        if (!answer) return false;

        if (q.questionType === 'mcq' || q.questionType === 'true-false') {
          const correctOption = q.options.findIndex((opt) => opt.isCorrect);
          return answer.selectedOptions && answer.selectedOptions[0] === correctOption;
        }
        return false;
      }).length;

      return {
        questionNumber: idx + 1,
        question: q.question,
        totalAttempts: quiz.attempts.length,
        correctAnswers,
        accuracy: quiz.attempts.length > 0 ? ((correctAnswers / quiz.attempts.length) * 100).toFixed(2) : 0,
        marks: q.marks,
      };
    });

    res.json({
      success: true,
      data: {
        quizTitle: quiz.title,
        statistics: quiz.statistics,
        passRate: ((quiz.statistics.passCount / (quiz.statistics.totalAttempts || 1)) * 100).toFixed(2),
        questionAnalysis,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createQuiz,
  listQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  startQuizAttempt,
  submitQuizAttempt,
  getQuizResults,
  getQuizAnalytics,
};
