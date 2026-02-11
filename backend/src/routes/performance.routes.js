const express = require('express');
const router = express.Router();
const Student = require('../models/Student.model');
const Marks = require('../models/Marks.model');
const Attendance = require('../models/Attendance.model');
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authenticate);
router.use(hasPermission(PERMISSIONS.REPORT_READ));

// Get student performance trends
router.get('/student/:id/performance', async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Get semester-wise performance
    const semesterPerformance = await Marks.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: '$semester',
          avgPercentage: { $avg: '$percentage' },
          avgGradePoint: { $avg: '$gradePoint' },
          totalSubjects: { $sum: 1 },
          passed: {
            $sum: { $cond: [{ $eq: ['$status', 'pass'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'fail'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get attendance trend
    const attendanceTrend = await Attendance.aggregate([
      { $match: { student: student._id } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          month: '$_id.month',
          year: '$_id.year',
          totalClasses: 1,
          presentClasses: 1,
          percentage: {
            $multiply: [{ $divide: ['$presentClasses', '$totalClasses'] }, 100],
          },
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    // Get subject-wise performance
    const subjectPerformance = await Marks.aggregate([
      { $match: { student: student._id } },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subject',
          foreignField: '_id',
          as: 'subject',
        },
      },
      { $unwind: '$subject' },
      {
        $group: {
          _id: '$subject._id',
          subjectName: { $first: '$subject.name' },
          subjectCode: { $first: '$subject.code' },
          avgPercentage: { $avg: '$percentage' },
          avgGradePoint: { $avg: '$gradePoint' },
          examsAttempted: { $sum: 1 },
        },
      },
      { $sort: { avgPercentage: -1 } },
    ]);

    res.json({
      success: true,
      data: {
        semesterPerformance,
        attendanceTrend,
        subjectPerformance,
        overall: {
          cgpa: student.cgpa,
          sgpa: student.sgpa,
          backlogCount: student.backlogCount,
          academicStatus: student.academicStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get students at risk (low attendance, low marks)
router.get('/at-risk-students', async (req, res, next) => {
  try {
    const { department, year } = req.query;

    // Get students with low CGPA
    const query = {
      academicStatus: 'active',
      $or: [{ cgpa: { $lt: 6.0 } }, { backlogCount: { $gt: 0 } }],
    };

    if (department) query.department = department;
    if (year) query.year = parseInt(year);

    const atRiskStudents = await Student.find(query)
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .select('registrationNumber rollNumber cgpa backlogCount year semester');

    // Get attendance data for these students
    const studentsWithAttendance = await Promise.all(
      atRiskStudents.map(async (student) => {
        const attendanceStats = await Attendance.calculateAttendance(student._id);
        return {
          ...student.toObject(),
          attendancePercentage: attendanceStats.percentage,
          riskFactors: [],
        };
      })
    );

    // Identify risk factors
    studentsWithAttendance.forEach((student) => {
      if (student.cgpa < 5.0) student.riskFactors.push('Very Low CGPA');
      else if (student.cgpa < 6.0) student.riskFactors.push('Low CGPA');

      if (student.backlogCount > 3) student.riskFactors.push('Multiple Backlogs');
      else if (student.backlogCount > 0) student.riskFactors.push('Active Backlogs');

      if (student.attendancePercentage < 65) student.riskFactors.push('Low Attendance');
      else if (student.attendancePercentage < 75) student.riskFactors.push('Below Average Attendance');
    });

    res.json({
      success: true,
      data: studentsWithAttendance,
    });
  } catch (error) {
    next(error);
  }
});

// Get top performers
router.get('/top-performers', async (req, res, next) => {
  try {
    const { department, year, limit = 10 } = req.query;

    const query = {
      academicStatus: 'active',
      cgpa: { $gte: 8.0 },
    };

    if (department) query.department = department;
    if (year) query.year = parseInt(year);

    const topPerformers = await Student.find(query)
      .populate('userId', 'name email')
      .populate('department', 'name code')
      .select('registrationNumber rollNumber cgpa backlogCount year semester')
      .sort({ cgpa: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: topPerformers,
    });
  } catch (error) {
    next(error);
  }
});

// Get comparative analysis (department-wise, year-wise)
router.get('/comparative-analysis', async (req, res, next) => {
  try {
    const { groupBy = 'department' } = req.query;

    let groupField = '$department';
    if (groupBy === 'year') groupField = '$year';

    const analysis = await Student.aggregate([
      { $match: { academicStatus: 'active' } },
      {
        $group: {
          _id: groupField,
          avgCGPA: { $avg: '$cgpa' },
          totalStudents: { $sum: 1 },
          studentsWithBacklogs: {
            $sum: { $cond: [{ $gt: ['$backlogCount', 0] }, 1, 0] },
          },
          highPerformers: {
            $sum: { $cond: [{ $gte: ['$cgpa', 8.0] }, 1, 0] },
          },
          lowPerformers: {
            $sum: { $cond: [{ $lt: ['$cgpa', 6.0] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: groupBy === 'department' ? 'departments' : null,
          localField: '_id',
          foreignField: '_id',
          as: 'details',
        },
      },
      {
        $project: {
          name: groupBy === 'department' ? { $arrayElemAt: ['$details.name', 0] } : '$_id',
          avgCGPA: { $round: ['$avgCGPA', 2] },
          totalStudents: 1,
          studentsWithBacklogs: 1,
          highPerformers: 1,
          lowPerformers: 1,
          backlogRate: {
            $multiply: [{ $divide: ['$studentsWithBacklogs', '$totalStudents'] }, 100],
          },
        },
      },
      { $sort: { avgCGPA: -1 } },
    ]);

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
