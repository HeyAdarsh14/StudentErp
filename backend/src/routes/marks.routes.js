const express = require('express');
const router = express.Router();
const Marks = require('../models/Marks.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { uploadMarksValidation } = require('../middlewares/validation.middleware');
const { auditLogger } = require('../middlewares/audit.middleware');
const MESSAGES = require('../constants/messages');
const { getCurrentAcademicYear } = require('../utils/helpers');

router.use(authenticate);

// Upload marks
router.post('/', hasPermission(PERMISSIONS.MARKS_CREATE), uploadMarksValidation, auditLogger('CREATE', 'MARKS'), async (req, res, next) => {
  try {
    const { examId, subjectId, marksData } = req.body;

    const marks = marksData.map((record) => ({
      student: record.studentId,
      exam: examId,
      subject: subjectId,
      marksObtained: record.marks,
      totalMarks: record.totalMarks,
      isAbsent: record.isAbsent || false,
      uploadedBy: req.user.id,
      academicYear: getCurrentAcademicYear(),
      semester: record.semester,
    }));

    await Marks.insertMany(marks);

    res.status(201).json({
      success: true,
      message: MESSAGES.MARKS_UPLOADED,
    });
  } catch (error) {
    next(error);
  }
});

// Get marks
router.get('/', async (req, res, next) => {
  try {
    const { student, exam, subject, academicYear, semester } = req.query;

    const query = {};
    if (student) query.student = student;
    if (exam) query.exam = exam;
    if (subject) query.subject = subject;
    if (academicYear) query.academicYear = academicYear;
    if (semester) query.semester = parseInt(semester);

    const marks = await Marks.find(query)
      .populate('student', 'registrationNumber rollNumber')
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('exam', 'name type date')
      .populate('subject', 'name code credits')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
});

// Get marks by ID
router.get('/:id', async (req, res, next) => {
  try {
    const marks = await Marks.findById(req.params.id)
      .populate('student', 'registrationNumber rollNumber')
      .populate({
        path: 'student',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('exam', 'name type date totalMarks')
      .populate('subject', 'name code');

    if (!marks) {
      return res.status(404).json({
        success: false,
        message: 'Marks not found',
      });
    }

    res.json({
      success: true,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
});

// Update marks
router.put('/:id', hasPermission(PERMISSIONS.MARKS_UPDATE), auditLogger('UPDATE', 'MARKS'), async (req, res, next) => {
  try {
    const { marksObtained, remarks } = req.body;

    const marks = await Marks.findById(req.params.id);

    if (!marks) {
      return res.status(404).json({
        success: false,
        message: 'Marks not found',
      });
    }

    // Add to modification history
    marks.modificationHistory.push({
      previousMarks: marks.marksObtained,
      newMarks: marksObtained,
      modifiedBy: req.user.id,
      modifiedAt: new Date(),
      reason: remarks,
    });

    marks.marksObtained = marksObtained;
    marks.isModified = true;
    if (remarks) marks.remarks = remarks;

    await marks.save();

    res.json({
      success: true,
      message: MESSAGES.MARKS_UPDATED,
      data: marks,
    });
  } catch (error) {
    next(error);
  }
});

// Delete marks
router.delete('/:id', hasPermission(PERMISSIONS.MARKS_DELETE), auditLogger('DELETE', 'MARKS'), async (req, res, next) => {
  try {
    const marks = await Marks.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
      }
    );

    if (!marks) {
      return res.status(404).json({
        success: false,
        message: 'Marks not found',
      });
    }

    res.json({
      success: true,
      message: 'Marks deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
