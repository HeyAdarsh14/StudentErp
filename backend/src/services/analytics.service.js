const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const Fee = require('../models/Fee.model');
const Department = require('../models/Department.model');
const PlacementApplication = require('../models/PlacementApplication.model');

/**
 * Analytics Service - Data aggregation and analysis functions
 */

/**
 * Get attendance trends over time
 * @param {Object} filters - department, subject, dateRange
 * @returns {Promise<Object>} Attendance trend data
 */
exports.getAttendanceTrends = async (filters = {}) => {
  const { department, subject, startDate, endDate } = filters;

  const matchStage = {
    isDeleted: false,
  };

  if (department) matchStage.department = department;
  if (subject) matchStage.subject = subject;
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }

  const trends = await Attendance.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' },
          week: { $week: '$date' },
        },
        totalPresent: {
          $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] },
        },
        totalAbsent: {
          $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] },
        },
        totalLate: { $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 1,
        totalPresent: 1,
        totalAbsent: 1,
        totalLate: 1,
        total: 1,
        attendanceRate: {
          $multiply: [
            { $divide: ['$totalPresent', '$total'] },
            100,
          ],
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } },
  ]);

  return {
    trends,
    summary: {
      avgAttendanceRate:
        trends.length > 0
          ? (
              trends.reduce((sum, t) => sum + t.attendanceRate, 0) /
              trends.length
            ).toFixed(2)
          : 0,
    },
  };
};

/**
 * Get marks analysis with statistics
 * @param {Object} filters - department, subject, exam
 * @returns {Promise<Object>} Marks analysis data
 */
exports.getMarksAnalysis = async (filters = {}) => {
  const { department, subject, exam } = filters;

  const matchStage = { isDeleted: false };

  if (department) matchStage.department = department;
  if (subject) matchStage.subject = subject;
  if (exam) matchStage.exam = exam;

  const analysis = await Marks.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          subject: '$subject',
          exam: '$exam',
        },
        avgMarks: { $avg: '$marksObtained' },
        maxMarks: { $max: '$marksObtained' },
        minMarks: { $min: '$marksObtained' },
        totalStudents: { $sum: 1 },
        passed: {
          $sum: { $cond: [{ $eq: ['$grade', 'Pass'] }, 1, 0] },
        },
        failed: {
          $sum: { $cond: [{ $eq: ['$grade', 'Fail'] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: 'subjects',
        localField: '_id.subject',
        foreignField: '_id',
        as: 'subjectInfo',
      },
    },
    {
      $lookup: {
        from: 'exams',
        localField: '_id.exam',
        foreignField: '_id',
        as: 'examInfo',
      },
    },
    {
      $project: {
        subject: { $arrayElemAt: ['$subjectInfo.name', 0] },
        exam: { $arrayElemAt: ['$examInfo.name', 0] },
        avgMarks: { $round: ['$avgMarks', 2] },
        maxMarks: 1,
        minMarks: 1,
        totalStudents: 1,
        passed: 1,
        failed: 1,
        passPercentage: {
          $multiply: [{ $divide: ['$passed', '$totalStudents'] }, 100],
        },
      },
    },
    { $sort: { avgMarks: -1 } },
  ]);

  // Distribution analysis
  const distribution = await Marks.aggregate([
    { $match: matchStage },
    {
      $bucket: {
        groupBy: '$marksObtained',
        boundaries: [0, 40, 50, 60, 70, 80, 90, 100],
        default: 'Other',
        output: {
          count: { $sum: 1 },
          students: { $push: '$student' },
        },
      },
    },
  ]);

  return {
    analysis,
    distribution,
  };
};

/**
 * Detect at-risk students based on multiple factors
 * @param {Object} criteria - thresholds for detection
 * @returns {Promise<Array>} List of at-risk students
 */
exports.detectAtRiskStudents = async (criteria = {}) => {
  const {
    minAttendance = 75,
    minCGPA = 6.0,
    maxBacklogs = 2,
    minPassRate = 70,
  } = criteria;

  // Get all students
  const students = await Student.find({ isDeleted: false })
    .populate('department', 'name')
    .lean();

  const atRiskStudents = [];

  for (const student of students) {
    const riskFactors = [];
    let riskLevel = 0;

    // Check attendance
    const attendanceRecords = await Attendance.find({
      student: student._id,
      isDeleted: false,
    });

    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(
        (a) => a.status === 'Present'
      ).length;
      const attendancePercentage =
        (presentCount / attendanceRecords.length) * 100;

      if (attendancePercentage < minAttendance) {
        riskFactors.push({
          factor: 'Low Attendance',
          value: `${attendancePercentage.toFixed(1)}%`,
          severity: attendancePercentage < 60 ? 'high' : 'medium',
        });
        riskLevel += attendancePercentage < 60 ? 3 : 2;
      }
    }

    // Check CGPA
    if (student.academicInfo?.cgpa && student.academicInfo.cgpa < minCGPA) {
      riskFactors.push({
        factor: 'Low CGPA',
        value: student.academicInfo.cgpa.toFixed(2),
        severity: student.academicInfo.cgpa < 5.0 ? 'high' : 'medium',
      });
      riskLevel += student.academicInfo.cgpa < 5.0 ? 3 : 2;
    }

    // Check backlogs
    if (
      student.academicInfo?.backlogs &&
      student.academicInfo.backlogs > maxBacklogs
    ) {
      riskFactors.push({
        factor: 'Multiple Backlogs',
        value: student.academicInfo.backlogs,
        severity: student.academicInfo.backlogs > 5 ? 'high' : 'medium',
      });
      riskLevel += student.academicInfo.backlogs > 5 ? 3 : 2;
    }

    // Check recent marks
    const recentMarks = await Marks.find({
      student: student._id,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentMarks.length > 0) {
      const passedCount = recentMarks.filter((m) => m.grade === 'Pass').length;
      const passRate = (passedCount / recentMarks.length) * 100;

      if (passRate < minPassRate) {
        riskFactors.push({
          factor: 'Low Pass Rate',
          value: `${passRate.toFixed(1)}%`,
          severity: passRate < 50 ? 'high' : 'medium',
        });
        riskLevel += passRate < 50 ? 3 : 2;
      }
    }

    if (riskFactors.length > 0) {
      atRiskStudents.push({
        student: {
          _id: student._id,
          name: student.personalInfo.name,
          registrationNumber: student.registrationNumber,
          department: student.department?.name,
          currentYear: student.currentYear,
          email: student.contactInfo?.email,
        },
        riskFactors,
        riskLevel,
        riskCategory:
          riskLevel >= 6 ? 'high' : riskLevel >= 3 ? 'medium' : 'low',
      });
    }
  }

  // Sort by risk level
  atRiskStudents.sort((a, b) => b.riskLevel - a.riskLevel);

  return atRiskStudents;
};

/**
 * Get department comparison data
 * @returns {Promise<Array>} Department comparison metrics
 */
exports.getDepartmentComparison = async () => {
  const departments = await Department.find({ isDeleted: false });

  const comparison = [];

  for (const dept of departments) {
    const students = await Student.find({
      department: dept._id,
      isDeleted: false,
    });

    const studentIds = students.map((s) => s._id);

    // Calculate average CGPA
    const cgpaSum = students.reduce(
      (sum, s) => sum + (s.academicInfo?.cgpa || 0),
      0
    );
    const avgCGPA = students.length > 0 ? cgpaSum / students.length : 0;

    // Calculate attendance rate
    const attendanceRecords = await Attendance.find({
      student: { $in: studentIds },
      isDeleted: false,
    });

    const presentCount = attendanceRecords.filter(
      (a) => a.status === 'Present'
    ).length;
    const attendanceRate =
      attendanceRecords.length > 0
        ? (presentCount / attendanceRecords.length) * 100
        : 0;

    // Calculate placement rate
    const placedStudents = await PlacementApplication.countDocuments({
      student: { $in: studentIds },
      status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
      isDeleted: false,
    });

    const placementRate =
      students.length > 0 ? (placedStudents / students.length) * 100 : 0;

    comparison.push({
      department: {
        _id: dept._id,
        name: dept.name,
        code: dept.code,
      },
      metrics: {
        totalStudents: students.length,
        avgCGPA: parseFloat(avgCGPA.toFixed(2)),
        attendanceRate: parseFloat(attendanceRate.toFixed(2)),
        placementRate: parseFloat(placementRate.toFixed(2)),
      },
    });
  }

  return comparison;
};

/**
 * Get year-over-year trends
 * @param {number} years - Number of years to analyze
 * @returns {Promise<Object>} YoY trend data
 */
exports.getYearOverYearTrends = async (years = 3) => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - years;

  const trends = {
    admissions: [],
    placements: [],
    avgCGPA: [],
    avgAttendance: [],
  };

  for (let year = startYear; year <= currentYear; year++) {
    // Admissions
    const admissions = await Student.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
      isDeleted: false,
    });

    trends.admissions.push({ year, count: admissions });

    // Placements
    const placements = await PlacementApplication.countDocuments({
      status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
      isDeleted: false,
    });

    trends.placements.push({ year, count: placements });

    // Average CGPA for that year's students
    const students = await Student.find({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
      isDeleted: false,
    });

    const cgpaSum = students.reduce(
      (sum, s) => sum + (s.academicInfo?.cgpa || 0),
      0
    );
    const avgCGPA = students.length > 0 ? cgpaSum / students.length : 0;

    trends.avgCGPA.push({ year, value: parseFloat(avgCGPA.toFixed(2)) });

    // Average attendance for that year
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`),
      },
      isDeleted: false,
    });

    const presentCount = attendanceRecords.filter(
      (a) => a.status === 'Present'
    ).length;
    const avgAttendance =
      attendanceRecords.length > 0
        ? (presentCount / attendanceRecords.length) * 100
        : 0;

    trends.avgAttendance.push({
      year,
      value: parseFloat(avgAttendance.toFixed(2)),
    });
  }

  return trends;
};

/**
 * Get fee collection analytics
 * @param {Object} filters - dateRange, department
 * @returns {Promise<Object>} Fee collection data
 */
exports.getFeeCollectionAnalytics = async (filters = {}) => {
  const { startDate, endDate, department } = filters;

  const matchStage = { isDeleted: false };

  if (startDate || endDate) {
    matchStage.dueDate = {};
    if (startDate) matchStage.dueDate.$gte = new Date(startDate);
    if (endDate) matchStage.dueDate.$lte = new Date(endDate);
  }

  if (department) matchStage.department = department;

  const analytics = await Fee.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' },
        totalPaid: { $sum: '$amountPaid' },
        totalPending: { $sum: { $subtract: ['$amount', '$amountPaid'] } },
        totalFees: { $sum: 1 },
        paidCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] },
        },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
        },
        overdueCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        totalAmount: 1,
        totalPaid: 1,
        totalPending: 1,
        totalFees: 1,
        paidCount: 1,
        pendingCount: 1,
        overdueCount: 1,
        collectionRate: {
          $multiply: [{ $divide: ['$totalPaid', '$totalAmount'] }, 100],
        },
      },
    },
  ]);

  // Monthly collection trends
  const monthlyTrends = await Fee.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$dueDate' },
          month: { $month: '$dueDate' },
        },
        collected: { $sum: '$amountPaid' },
        total: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 1,
        collected: 1,
        total: 1,
        collectionRate: {
          $multiply: [{ $divide: ['$collected', '$total'] }, 100],
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return {
    summary: analytics[0] || {},
    monthlyTrends,
  };
};

/**
 * Predict dropout risk using simple ML logic
 * @param {ObjectId} studentId - Student ID
 * @returns {Promise<Object>} Dropout risk assessment
 */
exports.predictDropoutRisk = async (studentId) => {
  const student = await Student.findById(studentId);

  if (!student) {
    throw new Error('Student not found');
  }

  let riskScore = 0;
  const factors = [];

  // Factor 1: CGPA (40% weight)
  const cgpa = student.academicInfo?.cgpa || 0;
  if (cgpa < 5.0) {
    riskScore += 40;
    factors.push({ factor: 'Very Low CGPA', impact: 40, value: cgpa });
  } else if (cgpa < 6.5) {
    riskScore += 25;
    factors.push({ factor: 'Low CGPA', impact: 25, value: cgpa });
  } else if (cgpa < 7.5) {
    riskScore += 10;
    factors.push({ factor: 'Below Average CGPA', impact: 10, value: cgpa });
  }

  // Factor 2: Attendance (30% weight)
  const attendanceRecords = await Attendance.find({
    student: studentId,
    isDeleted: false,
  });

  if (attendanceRecords.length > 0) {
    const presentCount = attendanceRecords.filter(
      (a) => a.status === 'Present'
    ).length;
    const attendancePercentage =
      (presentCount / attendanceRecords.length) * 100;

    if (attendancePercentage < 60) {
      riskScore += 30;
      factors.push({
        factor: 'Very Low Attendance',
        impact: 30,
        value: `${attendancePercentage.toFixed(1)}%`,
      });
    } else if (attendancePercentage < 75) {
      riskScore += 20;
      factors.push({
        factor: 'Low Attendance',
        impact: 20,
        value: `${attendancePercentage.toFixed(1)}%`,
      });
    } else if (attendancePercentage < 85) {
      riskScore += 10;
      factors.push({
        factor: 'Below Average Attendance',
        impact: 10,
        value: `${attendancePercentage.toFixed(1)}%`,
      });
    }
  }

  // Factor 3: Backlogs (20% weight)
  const backlogs = student.academicInfo?.backlogs || 0;
  if (backlogs > 5) {
    riskScore += 20;
    factors.push({ factor: 'Multiple Backlogs', impact: 20, value: backlogs });
  } else if (backlogs > 2) {
    riskScore += 12;
    factors.push({ factor: 'Few Backlogs', impact: 12, value: backlogs });
  }

  // Factor 4: Failed exams trend (10% weight)
  const recentMarks = await Marks.find({
    student: studentId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  if (recentMarks.length > 0) {
    const failedCount = recentMarks.filter((m) => m.grade === 'Fail').length;
    if (failedCount >= 3) {
      riskScore += 10;
      factors.push({
        factor: 'Failing Trend',
        impact: 10,
        value: `${failedCount}/5 failed`,
      });
    }
  }

  // Determine risk level
  let riskLevel = 'LOW';
  let recommendation = 'Student is performing well. Continue monitoring.';

  if (riskScore >= 60) {
    riskLevel = 'HIGH';
    recommendation =
      'Urgent intervention required. Schedule counseling session, connect with parents, and create improvement plan.';
  } else if (riskScore >= 30) {
    riskLevel = 'MEDIUM';
    recommendation =
      'Monitor closely. Consider academic support, attendance tracking, and mentorship.';
  }

  return {
    student: {
      _id: student._id,
      name: student.personalInfo.name,
      registrationNumber: student.registrationNumber,
    },
    riskScore,
    riskLevel,
    factors,
    recommendation,
  };
};

module.exports = exports;
