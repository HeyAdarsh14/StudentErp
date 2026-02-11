const MESSAGES = {
  // Auth
  AUTH_SUCCESS: 'Authentication successful',
  AUTH_FAILED: 'Authentication failed',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token expired',
  TOKEN_INVALID: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',

  // User
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',

  // Student
  STUDENT_CREATED: 'Student created successfully',
  STUDENT_UPDATED: 'Student updated successfully',
  STUDENT_DELETED: 'Student deleted successfully',
  STUDENT_NOT_FOUND: 'Student not found',

  // Faculty
  FACULTY_CREATED: 'Faculty created successfully',
  FACULTY_UPDATED: 'Faculty updated successfully',
  FACULTY_DELETED: 'Faculty deleted successfully',
  FACULTY_NOT_FOUND: 'Faculty not found',

  // Department
  DEPARTMENT_CREATED: 'Department created successfully',
  DEPARTMENT_UPDATED: 'Department updated successfully',
  DEPARTMENT_DELETED: 'Department deleted successfully',
  DEPARTMENT_NOT_FOUND: 'Department not found',

  // Subject
  SUBJECT_CREATED: 'Subject created successfully',
  SUBJECT_UPDATED: 'Subject updated successfully',
  SUBJECT_DELETED: 'Subject deleted successfully',
  SUBJECT_NOT_FOUND: 'Subject not found',

  // Attendance
  ATTENDANCE_MARKED: 'Attendance marked successfully',
  ATTENDANCE_UPDATED: 'Attendance updated successfully',
  ATTENDANCE_NOT_FOUND: 'Attendance record not found',

  // Exam & Marks
  EXAM_CREATED: 'Exam created successfully',
  EXAM_UPDATED: 'Exam updated successfully',
  MARKS_UPLOADED: 'Marks uploaded successfully',
  MARKS_UPDATED: 'Marks updated successfully',

  // Fee
  FEE_CREATED: 'Fee structure created successfully',
  FEE_UPDATED: 'Fee updated successfully',
  PAYMENT_SUCCESS: 'Payment processed successfully',
  PAYMENT_FAILED: 'Payment processing failed',
  PAYMENT_PENDING: 'Payment is pending',
  PAYMENT_REFUNDED: 'Payment refunded successfully',
  ORDER_CREATED: 'Payment order created',
  REFUND_INITIATED: 'Refund initiated',
  PAYMENT_LINK_GENERATED: 'Payment link generated',
  SCHOLARSHIP_APPLIED: 'Scholarship applied successfully',
  LATE_FEE_APPLIED: 'Late fee applied',
  FEE_WAIVED: 'Fee waived successfully',
  FEE_REMINDER_SENT: 'Fee reminder sent',

  // Notice
  NOTICE_CREATED: 'Notice created successfully',
  NOTICE_UPDATED: 'Notice updated successfully',
  NOTICE_DELETED: 'Notice deleted successfully',

  // Timetable
  TIMETABLE_CREATED: 'Timetable created successfully',
  TIMETABLE_UPDATED: 'Timetable updated successfully',

  // LMS
  CONTENT_UPLOADED: 'Content uploaded successfully',
  ASSIGNMENT_CREATED: 'Assignment created successfully',
  ASSIGNMENT_SUBMITTED: 'Assignment submitted successfully',
  ASSIGNMENT_GRADED: 'Assignment graded successfully',

  // Placement
  PLACEMENT_CREATED: 'Placement created successfully',
  APPLICATION_SUBMITTED: 'Application submitted successfully',

  // General
  SUCCESS: 'Operation successful',
  FAILED: 'Operation failed',
  VALIDATION_ERROR: 'Validation error',
  SERVER_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
};

module.exports = MESSAGES;
