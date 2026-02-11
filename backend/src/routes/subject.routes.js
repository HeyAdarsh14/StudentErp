const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const MESSAGES = require('../constants/messages');

router.use(authenticate);

// Get all subjects
router.get('/', async (req, res, next) => {
  try {
    const { department, year, semester, type } = req.query;
    
    const query = { isActive: true };
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);
    if (type) query.type = type;

    const subjects = await Subject.find(query)
      .populate('department', 'name code')
      .populate('faculty', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    next(error);
  }
});

// Get subject by ID
router.get('/:id', async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('department', 'name code')
      .populate('faculty', 'name email contactNumber')
      .populate('prerequisites', 'name code');

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.SUBJECT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
});

// Update subject
router.put('/:id', hasPermission(PERMISSIONS.SUBJECT_UPDATE), async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.SUBJECT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.SUBJECT_UPDATED,
      data: subject,
    });
  } catch (error) {
    next(error);
  }
});

// Delete subject
router.delete('/:id', hasPermission(PERMISSIONS.SUBJECT_DELETE), async (req, res, next) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
      }
    );

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.SUBJECT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.SUBJECT_DELETED,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
