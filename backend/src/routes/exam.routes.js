const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { auditLogger } = require('../middlewares/audit.middleware');
const MESSAGES = require('../constants/messages');

router.use(authenticate);

// Create exam
router.post('/', hasPermission(PERMISSIONS.EXAM_CREATE), auditLogger('CREATE', 'EXAM'), async (req, res, next) => {
  try {
    const exam = await Exam.create(req.body);
    await exam.populate('subject', 'name code');

    res.status(201).json({
      success: true,
      message: MESSAGES.EXAM_CREATED,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
});

// Get all exams
router.get('/', async (req, res, next) => {
  try {
    const { department, year, semester, type, status, academicYear } = req.query;

    const query = {};
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);
    if (type) query.type = type;
    if (status) query.status = status;
    if (academicYear) query.academicYear = academicYear;

    const exams = await Exam.find(query)
      .populate('subject', 'name code')
      .populate('department', 'name code')
      .populate('invigilators', 'name email')
      .sort({ date: -1 });

    res.json({
      success: true,
      data: exams,
    });
  } catch (error) {
    next(error);
  }
});

// Get exam by ID
router.get('/:id', async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subject', 'name code')
      .populate('department', 'name code')
      .populate('invigilators', 'name email contactNumber');

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
});

// Update exam
router.put('/:id', hasPermission(PERMISSIONS.EXAM_UPDATE), auditLogger('UPDATE', 'EXAM'), async (req, res, next) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      message: MESSAGES.EXAM_UPDATED,
      data: exam,
    });
  } catch (error) {
    next(error);
  }
});

// Delete exam
router.delete('/:id', hasPermission(PERMISSIONS.EXAM_UPDATE), auditLogger('DELETE', 'EXAM'), async (req, res, next) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      }
    );

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
      });
    }

    res.json({
      success: true,
      message: 'Exam deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
