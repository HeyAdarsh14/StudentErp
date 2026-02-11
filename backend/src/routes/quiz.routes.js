const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quiz.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasRole } = require('../middlewares/rbac.middleware');
const { ROLES } = require('../constants/roles');

// Create quiz (Faculty/Admin)
router.post(
  '/',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  quizController.createQuiz
);

// List quizzes
router.get('/', authenticate, quizController.listQuizzes);

// Get single quiz
router.get('/:id', authenticate, quizController.getQuiz);

// Update quiz (Faculty/Admin)
router.put(
  '/:id',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  quizController.updateQuiz
);

// Delete quiz (Faculty/Admin)
router.delete(
  '/:id',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  quizController.deleteQuiz
);

// Start quiz attempt (Student)
router.post(
  '/:id/start',
  authenticate,
  hasRole(ROLES.STUDENT),
  quizController.startQuizAttempt
);

// Submit quiz attempt (Student)
router.post(
  '/:id/submit',
  authenticate,
  hasRole(ROLES.STUDENT),
  quizController.submitQuizAttempt
);

// Get quiz results
router.get('/:id/results', authenticate, quizController.getQuizResults);

// Get quiz analytics (Faculty/Admin)
router.get(
  '/:id/analytics',
  authenticate,
  hasRole([ROLES.FACULTY, ROLES.ADMIN, ROLES.SUPER_ADMIN]),
  quizController.getQuizAnalytics
);

module.exports = router;
