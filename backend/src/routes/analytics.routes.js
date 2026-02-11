const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { hasPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../constants/permissions');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const Fee = require('../models/Fee.model');

router.use(authenticate);
router.use(hasPermission(PERMISSIONS.REPORT_READ));

// Get overall analytics
router.get('/overview', async (req, res, next) => {
  try {
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalAttendance,
      avgAttendance,
      totalFees,
      collectedFees,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ academicStatus: 'active' }),
      Faculty.countDocuments(),
      Faculty.countDocuments({ status: 'active' }),
      Attendance.countDocuments(),
      Attendance.aggregate([
        { $group: { _id: null, avg: { $avg: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } } } },
      ]),
      Fee.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Fee.aggregate([{ $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    ]);

    res.json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
        },
        faculty: {
          total: totalFaculty,
          active: activeFaculty,
        },
        attendance: {
          totalRecords: totalAttendance,
          averagePercentage: (avgAttendance[0]?.avg || 0) * 100,
        },
        fees: {
          total: totalFees[0]?.total || 0,
          collected: collectedFees[0]?.total || 0,
          pending: (totalFees[0]?.total || 0) - (collectedFees[0]?.total || 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get department-wise analytics
router.get('/departments', async (req, res, next) => {
  try {
    const studentsByDept = await Student.aggregate([
      { $match: { academicStatus: 'active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: '$department' },
      {
        $project: {
          departmentName: '$department.name',
          departmentCode: '$department.code',
          studentCount: '$count',
        },
      },
    ]);

    const facultyByDept = await Faculty.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: '$department' },
      {
        $project: {
          departmentName: '$department.name',
          departmentCode: '$department.code',
          facultyCount: '$count',
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        students: studentsByDept,
        faculty: facultyByDept,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get attendance analytics
router.get('/attendance', async (req, res, next) => {
  try {
    const { startDate, endDate, department } = req.query;

    const matchStage = {};
    if (startDate && endDate) {
      matchStage.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const attendanceStats = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalClasses = attendanceStats.reduce((sum, item) => sum + item.count, 0);
    const presentCount = attendanceStats.find(item => item._id === 'present')?.count || 0;
    const percentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

    res.json({
      success: true,
      data: {
        breakdown: attendanceStats,
        totalClasses,
        presentCount,
        percentage: percentage.toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get performance analytics
router.get('/performance', async (req, res, next) => {
  try {
    const { academicYear, semester } = req.query;

    const matchStage = {};
    if (academicYear) matchStage.academicYear = academicYear;
    if (semester) matchStage.semester = parseInt(semester);

    const performanceStats = await Marks.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const avgMarks = await Marks.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          avgPercentage: { $avg: '$percentage' },
          avgGradePoint: { $avg: '$gradePoint' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        gradeDistribution: performanceStats,
        averages: avgMarks[0] || { avgPercentage: 0, avgGradePoint: 0 },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Phase 9: Dashboard Widgets - Import controller
const analyticsController = require('../controllers/analytics.controller');

// Get user's dashboard widgets
router.get('/widgets', analyticsController.getUserWidgets);

// Create new widget
router.post('/widgets', analyticsController.createWidget);

// Update widget
router.put('/widgets/:id', analyticsController.updateWidget);

// Delete widget
router.delete('/widgets/:id', analyticsController.deleteWidget);

// Get widget data
router.get('/widgets/:id/data', analyticsController.getWidgetData);

// Export widget data to Excel
router.get('/widgets/:id/export', analyticsController.exportWidgetDataToExcel);

// Get comprehensive analytics report
router.get('/report', hasPermission(PERMISSIONS.REPORT_EXPORT), analyticsController.getAnalyticsReport);

// Get dropout risk prediction
router.get('/dropout-risk/:studentId', hasPermission(PERMISSIONS.REPORT_READ), analyticsController.getDropoutRiskPrediction);

module.exports = router;
