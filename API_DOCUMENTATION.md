# College ERP API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

Most API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### POST `/auth/login`
Login with email and password

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "student|faculty|admin",
    "profile": {...}
  }
}
```

#### POST `/auth/refresh`
Refresh JWT token

#### POST `/auth/logout`
Logout user

#### POST `/auth/forgot-password`
Request password reset

---

## Student Management

### GET `/student`
Get all students (Admin/Faculty only)

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Records per page (default: 10)
- `search`: Search by name or student ID
- `department`: Filter by department
- `year`: Filter by academic year

**Response:**
```json
{
  "success": true,
  "data": {
    "students": [...],
    "totalCount": 150,
    "currentPage": 1,
    "totalPages": 15
  }
}
```

### GET `/student/:id`
Get specific student details

### POST `/student`
Create new student (Admin only)

**Request Body:**
```json
{
  "personalInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@student.edu",
    "phone": "+1234567890",
    "dateOfBirth": "2000-01-01"
  },
  "academicInfo": {
    "studentId": "STU001",
    "department": "Computer Science", 
    "year": 2024,
    "semester": 1
  },
  "address": {...}
}
```

### PUT `/student/:id`
Update student information

### DELETE `/student/:id`
Delete student (Admin only)

---

## Faculty Management  

### GET `/faculty`
Get all faculty members

### GET `/faculty/:id`
Get specific faculty details

### POST `/faculty`
Add new faculty (Admin only)

### PUT `/faculty/:id`
Update faculty information

### DELETE `/faculty/:id`
Remove faculty (Admin only)

---

## Department Management

### GET `/department`
Get all departments

### POST `/department`
Create new department (Admin only)

**Request Body:**
```json
{
  "name": "Computer Science",
  "code": "CS",
  "description": "Department of Computer Science",
  "hodId": "faculty_id_here"
}
```

### PUT `/department/:id`
Update department

### DELETE `/department/:id`
Delete department (Admin only)

---

## Attendance Management

### GET `/attendance`
Get attendance records

**Query Parameters:**
- `studentId`: Filter by student
- `subjectId`: Filter by subject
- `date`: Specific date (YYYY-MM-DD)
- `startDate` & `endDate`: Date range

### POST `/attendance`
Mark attendance

**Request Body:**
```json
{
  "subjectId": "subject_id",
  "studentAttendance": [
    {
      "studentId": "student_id_1",
      "status": "present|absent|late"
    },
    {
      "studentId": "student_id_2", 
      "status": "present"
    }
  ],
  "date": "2024-02-14",
  "period": 1
}
```

### PUT `/attendance/:id`
Update attendance record

---

## Assignment Management

### GET `/assignment`
Get assignments

**Query Parameters:**
- `subjectId`: Filter by subject
- `studentId`: Filter assignments for specific student
- `status`: Filter by status (pending, submitted, graded)

### POST `/assignment`
Create new assignment (Faculty only)

**Request Body:**
```json
{
  "title": "Database Design Assignment",
  "description": "Design a database schema...",
  "subjectId": "subject_id",
  "dueDate": "2024-02-28T23:59:59Z",
  "maxMarks": 100,
  "instructions": "Upload your schema files...",
  "attachments": ["file_urls"]
}
```

### GET `/assignment/:id`
Get specific assignment details

### PUT `/assignment/:id`
Update assignment (Faculty only)

### POST `/assignment/:id/submit`
Submit assignment (Student only)

**Request Body:**
```json
{
  "submissionText": "My solution...",
  "attachments": ["file_urls"],
  "submissionDate": "2024-02-25T10:30:00Z"
}
```

---

## Grade Management

### GET `/gradebook`
Get gradebook data

### POST `/gradebook/grade`
Add/update grades (Faculty only)

**Request Body:**
```json
{
  "studentId": "student_id",
  "subjectId": "subject_id", 
  "assessmentType": "assignment|quiz|exam|project",
  "assessmentId": "assessment_id",
  "marksObtained": 85,
  "totalMarks": 100,
  "comments": "Good work!"
}
```

---

## Fee Management

### GET `/fee`
Get fee details

### GET `/fee/student/:studentId`
Get student's fee information

### POST `/fee/payment`
Process fee payment

**Request Body:**
```json
{
  "studentId": "student_id",
  "amount": 5000,
  "paymentMethod": "online|cash|cheque",
  "transactionId": "TXN123456",
  "feeType": "tuition|library|exam|other"
}
```

---

## Timetable Management

### GET `/timetable`
Get timetable

**Query Parameters:**
- `type`: student|faculty|department
- `id`: Specific student/faculty/department ID
- `startDate` & `endDate`: Date range

### POST `/timetable`
Create timetable entries (Admin only)

---

## Notice & Communication

### GET `/notice`
Get all notices

### POST `/notice`
Create notice (Admin/Faculty only)

**Request Body:**
```json
{
  "title": "Important Announcement",
  "content": "Notice content here...",
  "targetAudience": "all|students|faculty|specific_department",
  "department": "department_id", // if targeting specific department
  "priority": "low|medium|high",
  "expiryDate": "2024-03-01T00:00:00Z"
}
```

### GET `/communication/messages`
Get messages

### POST `/communication/send`
Send message

---

## Analytics & Reports

### GET `/analytics/dashboard`
Get dashboard analytics

### GET `/analytics/attendance`
Get attendance analytics

### GET `/analytics/performance`
Get performance analytics

### GET `/report/student/:studentId`
Generate student report

### GET `/report/faculty/:facultyId`
Generate faculty report

---

## File Upload

### POST `/upload`
Upload files

**Form Data:**
- `file`: File to upload
- `type`: Document type (assignment, profile, document, etc.)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "uploaded_file_url",
    "filename": "original_filename.pdf",
    "size": 1024000
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "details": {} // Additional error details
  }
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Rate Limiting

API endpoints are rate limited:
- Authentication endpoints: 5 requests per minute
- General endpoints: 100 requests per minute per user
- File upload endpoints: 10 requests per minute

---

## Pagination

Most list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (starts from 1)
- `limit`: Items per page (max 100)
- `sort`: Field to sort by
- `order`: Sort order (asc/desc)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 95,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```