const mongoose = require('mongoose');

/**
 * DashboardWidget Model - Customizable dashboard widgets
 */
const dashboardWidgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    widgetType: {
      type: String,
      enum: [
        'attendance_summary',
        'marks_overview',
        'fee_status',
        'upcoming_events',
        'recent_notices',
        'class_performance',
        'student_at_risk',
        'placement_stats',
        'timetable_today',
        'pending_assignments',
        'recent_activity',
        'department_comparison',
        'yearly_trends',
        'faculty_workload',
        'custom_chart',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    position: {
      row: {
        type: Number,
        required: true,
        min: 0,
      },
      col: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    size: {
      width: {
        type: Number,
        required: true,
        min: 1,
        max: 12, // Grid system (1-12 columns)
      },
      height: {
        type: Number,
        required: true,
        min: 1,
        max: 10, // Height units
      },
    },
    config: {
      // Widget-specific configuration
      chartType: {
        type: String,
        enum: ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter'],
      },
      dataSource: String,
      filters: mongoose.Schema.Types.Mixed,
      refreshInterval: {
        type: Number, // in seconds
        default: 300, // 5 minutes
      },
      colorScheme: {
        type: String,
        enum: ['blue', 'green', 'red', 'purple', 'orange', 'gradient'],
        default: 'blue',
      },
      showLegend: {
        type: Boolean,
        default: true,
      },
      showGrid: {
        type: Boolean,
        default: true,
      },
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    lastRefreshed: Date,
    cachedData: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Compound index for user widgets
dashboardWidgetSchema.index({ user: 1, 'position.row': 1, 'position.col': 1 });
dashboardWidgetSchema.index({ user: 1, widgetType: 1 });

// Method to update cached data
dashboardWidgetSchema.methods.updateCache = function (data) {
  this.cachedData = data;
  this.lastRefreshed = new Date();
  return this.save();
};

// Method to check if cache needs refresh
dashboardWidgetSchema.methods.needsRefresh = function () {
  if (!this.lastRefreshed) return true;

  const now = Date.now();
  const lastRefresh = this.lastRefreshed.getTime();
  const interval = (this.config.refreshInterval || 300) * 1000;

  return now - lastRefresh > interval;
};

// Static method to get default widgets for role
dashboardWidgetSchema.statics.getDefaultWidgets = function (role) {
  const defaults = {
    Student: [
      {
        widgetType: 'attendance_summary',
        title: 'My Attendance',
        position: { row: 0, col: 0 },
        size: { width: 6, height: 3 },
      },
      {
        widgetType: 'marks_overview',
        title: 'Recent Marks',
        position: { row: 0, col: 6 },
        size: { width: 6, height: 3 },
      },
      {
        widgetType: 'pending_assignments',
        title: 'Pending Assignments',
        position: { row: 3, col: 0 },
        size: { width: 6, height: 3 },
      },
      {
        widgetType: 'timetable_today',
        title: "Today's Schedule",
        position: { row: 3, col: 6 },
        size: { width: 6, height: 3 },
      },
    ],
    Faculty: [
      {
        widgetType: 'class_performance',
        title: 'Class Performance',
        position: { row: 0, col: 0 },
        size: { width: 8, height: 4 },
      },
      {
        widgetType: 'student_at_risk',
        title: 'At-Risk Students',
        position: { row: 0, col: 8 },
        size: { width: 4, height: 4 },
      },
      {
        widgetType: 'faculty_workload',
        title: 'My Workload',
        position: { row: 4, col: 0 },
        size: { width: 6, height: 3 },
      },
    ],
    Admin: [
      {
        widgetType: 'department_comparison',
        title: 'Department Analytics',
        position: { row: 0, col: 0 },
        size: { width: 8, height: 4 },
      },
      {
        widgetType: 'placement_stats',
        title: 'Placement Statistics',
        position: { row: 0, col: 8 },
        size: { width: 4, height: 4 },
      },
      {
        widgetType: 'yearly_trends',
        title: 'Year-over-Year Trends',
        position: { row: 4, col: 0 },
        size: { width: 12, height: 4 },
      },
    ],
  };

  return defaults[role] || defaults.Student;
};

const DashboardWidget = mongoose.model('DashboardWidget', dashboardWidgetSchema);

module.exports = DashboardWidget;
