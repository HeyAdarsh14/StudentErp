const DashboardWidget = require('../models/DashboardWidget.model');
const analyticsService = require('../services/analytics.service');
const exportService = require('../services/export.service');
const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const Fee = require('../models/Fee.model');
const Notice = require('../models/Notice.model');
const { paginate, formatPaginationResponse } = require('../utils/helpers');
const logger = require('../utils/logger');

/**
 * Get user's dashboard widgets
 */
const getUserWidgets = async (req, res, next) => {
  try {
    const { _id: userId, role } = req.user;

    let widgets = await DashboardWidget.find({ user: userId, isDeleted: false })
      .sort({ 'position.row': 1, 'position.col': 1 });

    // If no widgets exist, create defaults for user's role
    if (widgets.length === 0) {
      const defaultWidgets = DashboardWidget.getDefaultWidgets(role);
      const createdWidgets = await DashboardWidget.insertMany(
        defaultWidgets.map((w) => ({ ...w, user: userId }))
      );
      widgets = createdWidgets;
    }

    res.json({
      success: true,
      data: widgets,
    });
  } catch (error) {
    logger.error('Error in getUserWidgets:', error);
    next(error);
  }
};

/**
 * Create a new widget
 */
const createWidget = async (req, res, next) => {
  try {
    const { _id: userId } = req.user;
    const widgetData = { ...req.body, user: userId };

    const widget = await DashboardWidget.create(widgetData);

    res.status(201).json({
      success: true,
      message: 'Widget created successfully',
      data: widget,
    });
  } catch (error) {
    logger.error('Error in createWidget:', error);
    next(error);
  }
};

/**
 * Update widget
 */
const updateWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id: userId } = req.user;

    const widget = await DashboardWidget.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found',
      });
    }

    Object.assign(widget, req.body);
    await widget.save();

    res.json({
      success: true,
      message: 'Widget updated successfully',
      data: widget,
    });
  } catch (error) {
    logger.error('Error in updateWidget:', error);
    next(error);
  }
};

/**
 * Delete widget
 */
const deleteWidget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id: userId } = req.user;

    const widget = await DashboardWidget.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found',
      });
    }

    widget.isDeleted = true;
    await widget.save();

    res.json({
      success: true,
      message: 'Widget deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteWidget:', error);
    next(error);
  }
};

/**
 * Get widget data based on widget type
 */
const getWidgetData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id: userId, role } = req.user;

    const widget = await DashboardWidget.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found',
      });
    }

    // Check if data needs refresh
    if (!widget.needsRefresh() && widget.cachedData) {
      return res.json({
        success: true,
        data: widget.cachedData,
        cached: true,
      });
    }

    // Fetch fresh data based on widget type
    let data;
    const config = widget.config || {};

    switch (widget.widgetType) {
      case 'attendance_summary':
        data = await getAttendanceSummaryData(userId, role, config);
        break;

      case 'marks_overview':
        data = await getMarksOverviewData(userId, role, config);
        break;

      case 'fee_status':
        data = await getFeeStatusData(userId, role, config);
        break;

      case 'upcoming_events':
        data = await getUpcomingEventsData(config);
        break;

      case 'recent_notices':
        data = await getRecentNoticesData(config);
        break;

      case 'class_performance':
        data = await getClassPerformanceData(userId, role, config);
        break;

      case 'student_at_risk':
        data = await analyticsService.detectAtRiskStudents(config);
        break;

      case 'placement_stats':
        data = await getPlacementStatsData(config);
        break;

      case 'timetable_today':
        data = await getTimetableTodayData(userId, role);
        break;

      case 'pending_assignments':
        data = await getPendingAssignmentsData(userId, role);
        break;

      case 'recent_activity':
        data = await getRecentActivityData(userId, role);
        break;

      case 'department_comparison':
        data = await analyticsService.getDepartmentComparison();
        break;

      case 'yearly_trends':
        data = await analyticsService.getYearOverYearTrends(
          config.years || 3
        );
        break;

      case 'faculty_workload':
        data = await getFacultyWorkloadData(config);
        break;

      case 'custom_chart':
        data = await getCustomChartData(config);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid widget type',
        });
    }

    // Update cache
    await widget.updateCache(data);

    res.json({
      success: true,
      data,
      cached: false,
    });
  } catch (error) {
    logger.error('Error in getWidgetData:', error);
    next(error);
  }
};

/**
 * Get attendance summary data
 */
const getAttendanceSummaryData = async (userId, role, config) => {
  const filters = { ...config.filters };

  if (role === 'student') {
    const student = await Student.findOne({ user: userId });
    if (student) filters.student = student._id;
  }

  const data = await analyticsService.getAttendanceTrends(filters);

  // Calculate overall stats
  const totalRecords = await Attendance.countDocuments({
    ...filters,
    isDeleted: false,
  });
  const presentRecords = await Attendance.countDocuments({
    ...filters,
    status: 'Present',
    isDeleted: false,
  });

  return {
    trends: data.trends,
    summary: {
      totalClasses: totalRecords,
      present: presentRecords,
      absent: totalRecords - presentRecords,
      percentage:
        totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(2) : 0,
    },
  };
};

/**
 * Get marks overview data
 */
const getMarksOverviewData = async (userId, role, config) => {
  const filters = { ...config.filters };

  if (role === 'student') {
    const student = await Student.findOne({ user: userId });
    if (student) filters.student = student._id;
  }

  const marks = await Marks.find({ ...filters, isDeleted: false })
    .populate('subject', 'name')
    .populate('exam', 'name')
    .sort({ createdAt: -1 })
    .limit(10);

  const analysis = await analyticsService.getMarksAnalysis(filters);

  return {
    recentMarks: marks,
    analysis: analysis.analysis,
    distribution: analysis.distribution,
  };
};

/**
 * Get fee status data
 */
const getFeeStatusData = async (userId, role, config) => {
  const filters = { ...config.filters };

  if (role === 'student') {
    const student = await Student.findOne({ user: userId });
    if (student) filters.student = student._id;
  }

  const feeAnalytics = await analyticsService.getFeeCollectionAnalytics(filters);

  const pendingFees = await Fee.find({
    ...filters,
    status: { $in: ['Pending', 'Overdue'] },
    isDeleted: false,
  })
    .populate('student', 'personalInfo.name registrationNumber')
    .limit(10);

  return {
    summary: feeAnalytics.summary,
    trends: feeAnalytics.monthlyTrends,
    pendingFees,
  };
};

/**
 * Get upcoming events data
 */
const getUpcomingEventsData = async (config) => {
  const limit = config.limit || 5;

  // Fetch from calendar/events model (assuming it exists)
  // For now, return mock structure
  const events = [];

  return {
    events,
    count: events.length,
  };
};

/**
 * Get recent notices data
 */
const getRecentNoticesData = async (config) => {
  const limit = config.limit || 10;

  const notices = await Notice.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('createdBy', 'name')
    .lean();

  return {
    notices,
    count: notices.length,
  };
};

/**
 * Get class performance data
 */
const getClassPerformanceData = async (userId, role, config) => {
  const filters = { ...config.filters };

  if (role === 'faculty') {
    // Get subjects taught by this faculty
    const faculty = await require('../models/Faculty.model')
      .findOne({ user: userId })
      .populate('subjects');
    if (faculty) filters.subject = { $in: faculty.subjects.map((s) => s._id) };
  }

  const performanceData = await analyticsService.getMarksAnalysis(filters);

  return performanceData;
};

/**
 * Get placement stats data
 */
const getPlacementStatsData = async (config) => {
  const PlacementApplication = require('../models/PlacementApplication.model');
  const Company = require('../models/Company.model');
  const JobPosting = require('../models/JobPosting.model');

  const [totalApplications, selectedStudents, activeJobs, activeCompanies] =
    await Promise.all([
      PlacementApplication.countDocuments({ isDeleted: false }),
      PlacementApplication.countDocuments({
        status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
        isDeleted: false,
      }),
      JobPosting.countDocuments({ status: 'Active', isDeleted: false }),
      Company.countDocuments({ isVerified: true, isDeleted: false }),
    ]);

  // Get recent placements
  const recentPlacements = await PlacementApplication.find({
    status: { $in: ['Selected', 'Offer Accepted'] },
    isDeleted: false,
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate('student', 'personalInfo.name registrationNumber')
    .populate('company', 'name')
    .populate('job', 'role package');

  // Calculate average package
  const placedApplications = await PlacementApplication.find({
    status: { $in: ['Offer Accepted', 'Joined'] },
    'offer.package.ctc': { $exists: true },
    isDeleted: false,
  }).select('offer.package.ctc');

  const avgPackage =
    placedApplications.length > 0
      ? placedApplications.reduce((sum, app) => sum + app.offer.package.ctc, 0) /
        placedApplications.length
      : 0;

  return {
    summary: {
      totalApplications,
      selectedStudents,
      activeJobs,
      activeCompanies,
      placementRate:
        totalApplications > 0
          ? ((selectedStudents / totalApplications) * 100).toFixed(2)
          : 0,
      avgPackage: (avgPackage / 100000).toFixed(2), // Convert to LPA
    },
    recentPlacements,
  };
};

/**
 * Get timetable today data
 */
const getTimetableTodayData = async (userId, role) => {
  const Timetable = require('../models/Timetable.model');
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

  const filters = { dayOfWeek: today, isDeleted: false };

  if (role === 'student') {
    const student = await Student.findOne({ user: userId });
    if (student) {
      filters.$or = [
        { class: student.currentYear },
        { department: student.department },
      ];
    }
  }

  const schedule = await Timetable.find(filters)
    .populate('subject', 'name code')
    .populate('faculty', 'personalInfo.name')
    .sort({ startTime: 1 });

  return {
    day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      today
    ],
    schedule,
  };
};

/**
 * Get pending assignments data
 */
const getPendingAssignmentsData = async (userId, role) => {
  // Assuming Assignment model from LMS module
  const Assignment = require('../models/Assignment.model');

  const filters = { isDeleted: false, deadline: { $gte: new Date() } };

  if (role === 'student') {
    const student = await Student.findOne({ user: userId });
    if (student) {
      // Get assignments where student hasn't submitted yet
      const submissions = await require('../models/AssignmentSubmission.model').find({
        student: student._id,
      }).select('assignment');

      const submittedIds = submissions.map((s) => s.assignment);
      filters._id = { $nin: submittedIds };
    }
  }

  const assignments = await Assignment.find(filters)
    .populate('course', 'name')
    .sort({ deadline: 1 })
    .limit(10);

  return {
    assignments,
    count: assignments.length,
  };
};

/**
 * Get recent activity data
 */
const getRecentActivityData = async (userId, role) => {
  const AuditLog = require('../models/AuditLog.model');

  const filters = { user: userId };

  const activities = await AuditLog.find(filters)
    .sort({ timestamp: -1 })
    .limit(20)
    .lean();

  return {
    activities,
    count: activities.length,
  };
};

/**
 * Get faculty workload data
 */
const getFacultyWorkloadData = async (config) => {
  const Faculty = require('../models/Faculty.model');
  const Timetable = require('../models/Timetable.model');

  const faculty = await Faculty.find({ isDeleted: false })
    .populate('subjects', 'name')
    .populate('department', 'name');

  const workload = [];

  for (const fac of faculty) {
    const classesCount = await Timetable.countDocuments({
      faculty: fac._id,
      isDeleted: false,
    });

    workload.push({
      faculty: {
        _id: fac._id,
        name: fac.personalInfo?.name,
        department: fac.department?.name,
      },
      subjects: fac.subjects.length,
      classesPerWeek: classesCount,
      workloadLevel:
        classesCount >= 25 ? 'high' : classesCount >= 15 ? 'medium' : 'low',
    });
  }

  return workload.sort((a, b) => b.classesPerWeek - a.classesPerWeek);
};

/**
 * Get custom chart data
 */
const getCustomChartData = async (config) => {
  const { dataSource, filters } = config;

  // This is a flexible function that can query any model based on config
  // Implementation depends on frontend requirements
  return {
    message: 'Custom chart implementation required',
    config,
  };
};

/**
 * Export widget data to Excel
 */
const exportWidgetDataToExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id: userId } = req.user;

    const widget = await DashboardWidget.findOne({
      _id: id,
      user: userId,
      isDeleted: false,
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Widget not found',
      });
    }

    let buffer;

    // Generate Excel based on widget type
    switch (widget.widgetType) {
      case 'attendance_summary':
        buffer = await exportService.exportAttendanceToExcel(
          widget.config?.filters || {}
        );
        break;

      case 'marks_overview':
        buffer = await exportService.exportMarksToExcel(
          widget.config?.filters || {}
        );
        break;

      case 'fee_status':
        buffer = await exportService.exportFeesToExcel(
          widget.config?.filters || {}
        );
        break;

      case 'placement_stats':
        buffer = await exportService.exportPlacementsToExcel(
          widget.config?.filters || {}
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Export not supported for this widget type',
        });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${widget.widgetType}_${Date.now()}.xlsx`
    );

    res.send(buffer);
  } catch (error) {
    logger.error('Error in exportWidgetDataToExcel:', error);
    next(error);
  }
};

/**
 * Get comprehensive analytics report
 */
const getAnalyticsReport = async (req, res, next) => {
  try {
    const { format = 'json', ...filters } = req.query;

    if (format === 'excel') {
      const buffer = await exportService.generateAnalyticsReport(filters);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=analytics_report_${Date.now()}.xlsx`
      );

      return res.send(buffer);
    }

    // JSON format
    const [
      attendanceTrends,
      marksAnalysis,
      atRiskStudents,
      departmentComparison,
      yearlyTrends,
      feeAnalytics,
    ] = await Promise.all([
      analyticsService.getAttendanceTrends(filters),
      analyticsService.getMarksAnalysis(filters),
      analyticsService.detectAtRiskStudents(),
      analyticsService.getDepartmentComparison(),
      analyticsService.getYearOverYearTrends(filters.years || 3),
      analyticsService.getFeeCollectionAnalytics(filters),
    ]);

    res.json({
      success: true,
      data: {
        attendanceTrends,
        marksAnalysis,
        atRiskStudents: atRiskStudents.slice(0, 10), // Top 10
        departmentComparison,
        yearlyTrends,
        feeAnalytics,
      },
    });
  } catch (error) {
    logger.error('Error in getAnalyticsReport:', error);
    next(error);
  }
};

/**
 * Get dropout risk prediction for a student
 */
const getDropoutRiskPrediction = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const prediction = await analyticsService.predictDropoutRisk(studentId);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error) {
    logger.error('Error in getDropoutRiskPrediction:', error);
    next(error);
  }
};

module.exports = {
  getUserWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgetData,
  exportWidgetDataToExcel,
  getAnalyticsReport,
  getDropoutRiskPrediction,
};
