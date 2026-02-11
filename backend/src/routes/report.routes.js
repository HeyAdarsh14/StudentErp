const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const { generateReportCard, generateFeeReceipt, generateTranscript } = require('../utils/generatePDF');

router.use(authenticate);
router.use(hasPermission(PERMISSIONS.REPORT_GENERATE));

// Generate student report card
router.get('/student/:id/report-card', async (req, res, next) => {
  try {
    const Student = require('../models/Student.model');
    const Marks = require('../models/Marks.model');

    const student = await Student.findById(req.params.id)
      .populate('userId', 'name')
      .populate('department', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const { academicYear, semester } = req.query;
    const marks = await Marks.find({
      student: student._id,
      academicYear: academicYear || student.academicYear,
      semester: semester || student.semester,
    }).populate('subject', 'name');

    const marksData = marks.map(m => ({
      subject: m.subject.name,
      totalMarks: m.totalMarks,
      obtainedMarks: m.marksObtained,
      percentage: m.percentage,
    }));

    const studentData = {
      name: student.userId.name,
      registrationNumber: student.registrationNumber,
      department: student.department.name,
      semester: student.semester,
      totalPercentage: student.cgpa ? (student.cgpa * 10).toFixed(2) : 0,
      result: student.backlogCount === 0 ? 'PASS' : 'BACKLOG',
    };

    const filePath = await generateReportCard(studentData, marksData);

    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

// Generate academic transcript
router.get('/student/:id/transcript', async (req, res, next) => {
  try {
    const Student = require('../models/Student.model');
    const Marks = require('../models/Marks.model');
    const Subject = require('../models/Subject.model');

    const student = await Student.findById(req.params.id)
      .populate('userId', 'name')
      .populate('department', 'name');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get all marks grouped by semester
    const allMarks = await Marks.find({ student: student._id })
      .populate('subject', 'name code credits')
      .sort({ semester: 1 });

    // Group by semester
    const semesterMap = new Map();
    allMarks.forEach((mark) => {
      if (!semesterMap.has(mark.semester)) {
        semesterMap.set(mark.semester, []);
      }
      semesterMap.get(mark.semester).push({
        code: mark.subject.code,
        name: mark.subject.name,
        credits: mark.subject.credits,
        grade: mark.grade,
        gradePoint: mark.gradePoint,
      });
    });

    const semesterWiseMarks = Array.from(semesterMap.entries()).map(([semester, subjects]) => {
      const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0);
      const totalGradePoints = subjects.reduce((sum, s) => sum + s.gradePoint * s.credits, 0);
      const sgpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

      return {
        semester,
        subjects,
        sgpa,
      };
    });

    const totalCredits = allMarks.reduce((sum, m) => sum + (m.subject?.credits || 0), 0);
    const classification = student.cgpa >= 8.5 ? 'First Class with Distinction' :
                          student.cgpa >= 6.5 ? 'First Class' :
                          student.cgpa >= 5.5 ? 'Second Class' : 'Pass Class';

    const studentData = {
      name: student.userId.name,
      registrationNumber: student.registrationNumber,
      department: student.department.name,
      program: 'B.Tech',
      admissionYear: student.admissionDetails?.session || new Date(student.createdAt).getFullYear(),
      batch: student.batch,
      cgpa: student.cgpa || 0,
      totalCredits,
      backlogCount: student.backlogCount || 0,
      classification,
    };

    const filePath = await generateTranscript(studentData, semesterWiseMarks);

    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

// Generate fee receipt
router.get('/fee/:id/receipt', async (req, res, next) => {
  try {
    const Fee = require('../models/Fee.model');

    const fee = await Fee.findById(req.params.id)
      .populate({
        path: 'student',
        populate: [
          { path: 'userId', select: 'name' },
          { path: 'department', select: 'name' },
        ],
      });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: 'Fee record not found',
      });
    }

    const lastPayment = fee.payments[fee.payments.length - 1];

    const receiptData = {
      receiptNumber: lastPayment.receiptNumber,
      transactionId: lastPayment.transactionId,
      date: lastPayment.paymentDate,
      studentName: fee.student.userId.name,
      registrationNumber: fee.student.registrationNumber,
      department: fee.student.department.name,
      feeType: 'Academic Fee',
      amount: lastPayment.amount,
      paymentMode: lastPayment.paymentMethod,
      status: lastPayment.status,
    };

    const filePath = await generateFeeReceipt(receiptData);

    res.download(filePath);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
