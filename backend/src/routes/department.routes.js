const express = require('express');
const router = express.Router();
const Department = require('../models/Department.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const MESSAGES = require('../constants/messages');

router.use(authenticate);

// Get all departments
router.get('/', async (req, res, next) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('hod', 'name email')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    next(error);
  }
});

// Get department by ID
router.get('/:id', async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('hod', 'name email contactNumber');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.DEPARTMENT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      data: department,
    });
  } catch (error) {
    next(error);
  }
});

// Update department
router.put('/:id', hasPermission(PERMISSIONS.DEPARTMENT_UPDATE), async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.DEPARTMENT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.DEPARTMENT_UPDATED,
      data: department,
    });
  } catch (error) {
    next(error);
  }
});

// Delete department
router.delete('/:id', hasPermission(PERMISSIONS.DEPARTMENT_DELETE), async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
        isActive: false,
      }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.DEPARTMENT_NOT_FOUND,
      });
    }

    res.json({
      success: true,
      message: MESSAGES.DEPARTMENT_DELETED,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
