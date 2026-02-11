const ExcelJS = require('exceljs');
const { createObjectCsvStringifier } = require('csv-writer');
const Student = require('../models/Student.model');
const Attendance = require('../models/Attendance.model');
const Marks = require('../models/Marks.model');
const Fee = require('../models/Fee.model');
const PlacementApplication = require('../models/PlacementApplication.model');

/**
 * Export Service - Generate Excel and CSV files
 */

/**
 * Export students to Excel
 * @param {Object} filters - Query filters
 * @returns {Promise<Buffer>} Excel file buffer
 */
exports.exportStudentsToExcel = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');

  // Define columns
  worksheet.columns = [
    { header: 'Registration No', key: 'registrationNumber', width: 20 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Current Year', key: 'currentYear', width: 15 },
    { header: 'CGPA', key: 'cgpa', width: 10 },
    { header: 'Backlogs', key: 'backlogs', width: 10 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Date of Birth', key: 'dob', width: 15 },
    { header: 'Gender', key: 'gender', width: 10 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Fetch students
  const students = await Student.find({ isDeleted: false, ...filters })
    .populate('department', 'name')
    .lean();

  // Add rows
  students.forEach((student) => {
    worksheet.addRow({
      registrationNumber: student.registrationNumber,
      name: student.personalInfo?.name || 'N/A',
      email: student.contactInfo?.email || 'N/A',
      phone: student.contactInfo?.phone || 'N/A',
      department: student.department?.name || 'N/A',
      currentYear: student.currentYear || 'N/A',
      cgpa: student.academicInfo?.cgpa || 'N/A',
      backlogs: student.academicInfo?.backlogs || 0,
      status: student.status || 'Active',
      dob: student.personalInfo?.dob
        ? new Date(student.personalInfo.dob).toLocaleDateString()
        : 'N/A',
      gender: student.personalInfo?.gender || 'N/A',
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'K1',
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export attendance to Excel
 * @param {Object} filters - Query filters
 * @returns {Promise<Buffer>} Excel file buffer
 */
exports.exportAttendanceToExcel = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attendance');

  // Define columns
  worksheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Registration No', key: 'registrationNumber', width: 20 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Subject', key: 'subject', width: 25 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Marked By', key: 'markedBy', width: 25 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Fetch attendance
  const attendance = await Attendance.find({ isDeleted: false, ...filters })
    .populate('student', 'personalInfo.name registrationNumber')
    .populate('department', 'name')
    .populate('subject', 'name')
    .populate('markedBy', 'name')
    .sort({ date: -1 })
    .lean();

  // Add rows with conditional formatting
  attendance.forEach((record) => {
    const row = worksheet.addRow({
      date: new Date(record.date).toLocaleDateString(),
      studentName: record.student?.personalInfo?.name || 'N/A',
      registrationNumber: record.student?.registrationNumber || 'N/A',
      department: record.department?.name || 'N/A',
      subject: record.subject?.name || 'N/A',
      status: record.status,
      markedBy: record.markedBy?.name || 'N/A',
    });

    // Color code status
    const statusCell = row.getCell(6);
    if (record.status === 'Present') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
    } else if (record.status === 'Absent') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
    } else if (record.status === 'Late') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB9C' },
      };
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'G1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export marks to Excel
 * @param {Object} filters - Query filters
 * @returns {Promise<Buffer>} Excel file buffer
 */
exports.exportMarksToExcel = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Marks');

  // Define columns
  worksheet.columns = [
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Registration No', key: 'registrationNumber', width: 20 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Subject', key: 'subject', width: 25 },
    { header: 'Exam', key: 'exam', width: 20 },
    { header: 'Marks Obtained', key: 'marksObtained', width: 15 },
    { header: 'Total Marks', key: 'totalMarks', width: 15 },
    { header: 'Percentage', key: 'percentage', width: 12 },
    { header: 'Grade', key: 'grade', width: 10 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5B9BD5' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Fetch marks
  const marks = await Marks.find({ isDeleted: false, ...filters })
    .populate('student', 'personalInfo.name registrationNumber')
    .populate('department', 'name')
    .populate('subject', 'name')
    .populate('exam', 'name')
    .lean();

  // Add rows
  marks.forEach((mark) => {
    const percentage = ((mark.marksObtained / mark.totalMarks) * 100).toFixed(
      2
    );
    worksheet.addRow({
      studentName: mark.student?.personalInfo?.name || 'N/A',
      registrationNumber: mark.student?.registrationNumber || 'N/A',
      department: mark.department?.name || 'N/A',
      subject: mark.subject?.name || 'N/A',
      exam: mark.exam?.name || 'N/A',
      marksObtained: mark.marksObtained,
      totalMarks: mark.totalMarks,
      percentage: `${percentage}%`,
      grade: mark.grade || 'N/A',
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'I1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export fee records to Excel
 * @param {Object} filters - Query filters
 * @returns {Promise<Buffer>} Excel file buffer
 */
exports.exportFeesToExcel = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Fees');

  // Define columns
  worksheet.columns = [
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Registration No', key: 'registrationNumber', width: 20 },
    { header: 'Fee Type', key: 'feeType', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Amount Paid', key: 'amountPaid', width: 15 },
    { header: 'Balance', key: 'balance', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Due Date', key: 'dueDate', width: 15 },
    { header: 'Payment Date', key: 'paymentDate', width: 15 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC000' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Fetch fees
  const fees = await Fee.find({ isDeleted: false, ...filters })
    .populate('student', 'personalInfo.name registrationNumber')
    .lean();

  // Add rows
  fees.forEach((fee) => {
    const row = worksheet.addRow({
      studentName: fee.student?.personalInfo?.name || 'N/A',
      registrationNumber: fee.student?.registrationNumber || 'N/A',
      feeType: fee.feeType || 'N/A',
      amount: fee.amount,
      amountPaid: fee.amountPaid || 0,
      balance: fee.amount - (fee.amountPaid || 0),
      status: fee.status,
      dueDate: fee.dueDate
        ? new Date(fee.dueDate).toLocaleDateString()
        : 'N/A',
      paymentDate: fee.paymentDate
        ? new Date(fee.paymentDate).toLocaleDateString()
        : 'N/A',
    });

    // Color code status
    const statusCell = row.getCell(7);
    if (fee.status === 'Paid') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
    } else if (fee.status === 'Overdue') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
    } else if (fee.status === 'Pending') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFEB9C' },
      };
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'I1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export placement records to Excel
 * @param {Object} filters - Query filters
 * @returns {Promise<Buffer>} Excel file buffer
 */
exports.exportPlacementsToExcel = async (filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Placements');

  // Define columns
  worksheet.columns = [
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Registration No', key: 'registrationNumber', width: 20 },
    { header: 'Company', key: 'company', width: 25 },
    { header: 'Job Role', key: 'jobRole', width: 25 },
    { header: 'Status', key: 'status', width: 18 },
    { header: 'Applied Date', key: 'appliedDate', width: 15 },
    { header: 'Package (LPA)', key: 'package', width: 15 },
    { header: 'CTC Offered', key: 'ctcOffered', width: 15 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF7030A0' },
  };
  worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

  // Fetch placements
  const placements = await PlacementApplication.find({
    isDeleted: false,
    ...filters,
  })
    .populate('student', 'personalInfo.name registrationNumber')
    .populate('company', 'name')
    .populate('job', 'role package')
    .lean();

  // Add rows
  placements.forEach((placement) => {
    worksheet.addRow({
      studentName: placement.student?.personalInfo?.name || 'N/A',
      registrationNumber: placement.student?.registrationNumber || 'N/A',
      company: placement.company?.name || 'N/A',
      jobRole: placement.job?.role || 'N/A',
      status: placement.status,
      appliedDate: placement.createdAt
        ? new Date(placement.createdAt).toLocaleDateString()
        : 'N/A',
      package:
        placement.job?.package?.maxSalary
          ? (placement.job.package.maxSalary / 100000).toFixed(2)
          : 'N/A',
      ctcOffered: placement.offer?.package?.ctc
        ? (placement.offer.package.ctc / 100000).toFixed(2)
        : 'N/A',
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: 'H1',
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - CSV headers configuration
 * @returns {String} CSV string
 */
exports.exportToCSV = (data, headers) => {
  const csvStringifier = createObjectCsvStringifier({
    header: headers,
  });

  const headerString = csvStringifier.getHeaderString();
  const recordsString = csvStringifier.stringifyRecords(data);

  return headerString + recordsString;
};

/**
 * Export students to CSV
 * @param {Object} filters - Query filters
 * @returns {Promise<String>} CSV string
 */
exports.exportStudentsToCSV = async (filters = {}) => {
  const students = await Student.find({ isDeleted: false, ...filters })
    .populate('department', 'name')
    .lean();

  const data = students.map((student) => ({
    registrationNumber: student.registrationNumber,
    name: student.personalInfo?.name || 'N/A',
    email: student.contactInfo?.email || 'N/A',
    phone: student.contactInfo?.phone || 'N/A',
    department: student.department?.name || 'N/A',
    currentYear: student.currentYear || 'N/A',
    cgpa: student.academicInfo?.cgpa || 'N/A',
    backlogs: student.academicInfo?.backlogs || 0,
    status: student.status || 'Active',
  }));

  const headers = [
    { id: 'registrationNumber', title: 'Registration No' },
    { id: 'name', title: 'Name' },
    { id: 'email', title: 'Email' },
    { id: 'phone', title: 'Phone' },
    { id: 'department', title: 'Department' },
    { id: 'currentYear', title: 'Current Year' },
    { id: 'cgpa', title: 'CGPA' },
    { id: 'backlogs', title: 'Backlogs' },
    { id: 'status', title: 'Status' },
  ];

  return this.exportToCSV(data, headers);
};

/**
 * Generate comprehensive analytics report
 * @param {Object} options - Report options
 * @returns {Promise<Buffer>} Excel report buffer
 */
exports.generateAnalyticsReport = async (options = {}) => {
  const { startDate, endDate, includeDepartments = true } = options;

  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Summary
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  const totalStudents = await Student.countDocuments({ isDeleted: false });
  const totalPlacements = await PlacementApplication.countDocuments({
    status: { $in: ['Selected', 'Offer Accepted', 'Joined'] },
    isDeleted: false,
  });

  summarySheet.addRow({ metric: 'Total Students', value: totalStudents });
  summarySheet.addRow({
    metric: 'Total Placements',
    value: totalPlacements,
  });
  summarySheet.addRow({
    metric: 'Placement Rate',
    value: `${((totalPlacements / totalStudents) * 100).toFixed(2)}%`,
  });

  // Sheet 2: Department-wise summary (if enabled)
  if (includeDepartments) {
    const deptSheet = workbook.addWorksheet('Department Summary');
    deptSheet.columns = [
      { header: 'Department', key: 'department', width: 25 },
      { header: 'Total Students', key: 'totalStudents', width: 18 },
      { header: 'Avg CGPA', key: 'avgCGPA', width: 12 },
      { header: 'Placements', key: 'placements', width: 15 },
      { header: 'Placement %', key: 'placementRate', width: 15 },
    ];

    deptSheet.getRow(1).font = { bold: true };
    deptSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
};

module.exports = exports;
