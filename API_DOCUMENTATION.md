# College ERP API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production:  https://api.studenterp.dev/api
```

## API Version
**Current Version:** v1.3.1  
**Last Updated:** March 2, 2026  
**Backwards Compatibility:** v1.2.0+  
**Deprecation Policy:** 6 months notice for breaking changes

## 📋 API Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200  | OK | Request successful |
| 201  | Created | Resource created successfully |
| 204  | No Content | Request successful, no content to return |
| 400  | Bad Request | Invalid request parameters |
| 401  | Unauthorized | Authentication required |
| 403  | Forbidden | Access denied |
| 404  | Not Found | Resource not found |
| 409  | Conflict | Resource already exists |
| 422  | Unprocessable Entity | Validation failed |
| 429  | Too Many Requests | Rate limit exceeded |
| 500  | Internal Server Error | Server error |

## 🚨 Error Response Format

All error responses follow a consistent format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Email is required",
      "code": "REQUIRED"
    }
  ],
  "correlationId": "req-12345-abcde",
  "timestamp": "2026-03-02T10:30:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR` - Input validation failed
- `AUTH_REQUIRED` - Authentication token required
- `PERMISSION_DENIED` - Insufficient permissions
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `DUPLICATE_RESOURCE` - Resource already exists

## 🚀 Quick Start Guide
```bash
# Test API connectivity
curl -I http://localhost:5000/api/health

# Get API version info
curl http://localhost:5000/api/version

# Test authentication
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@college.edu","password":"demo123"}'
```

## Rate Limiting
- **Standard Users:** 100 requests per hour
- **Premium Users:** 500 requests per hour
- **Admin Users:** No limit

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Security Features
- JWT token expiration: 24 hours
- Refresh token expiration: 7 days
- Password encryption: bcrypt with 12 rounds
- Role-based access control (RBAC)

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

## 📚 API Best Practices & Examples

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-Correlation-ID: <optional-request-id>
X-API-Version: v1.3.1
```

### Pagination
All list endpoints support pagination:

```bash
# Standard pagination
GET /api/students?page=1&limit=20

# Search with pagination
GET /api/students?search=john&page=2&limit=10&sort=name&order=asc
```

### Response Format
All successful responses follow this structure:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "totalCount": 100,
      "currentPage": 1,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "meta": {
    "timestamp": "2026-03-02T10:30:00.000Z",
    "version": "v1.3.1",
    "correlationId": "req-12345-abcde"
  }
}
```

### File Upload Example
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "category=assignment" \
  -F "description=Math Assignment 1"
```

### Filtering & Sorting
```bash
# Multiple filters
GET /api/students?department=CS&year=2024&status=active

# Sorting
GET /api/students?sort=createdAt&order=desc

# Date range filtering
GET /api/attendance?startDate=2026-03-01&endDate=2026-03-07
```

---

## 🔄 Real-time Features (NEW v1.3.0)

### WebSocket Connection
```javascript
// Connect to real-time updates
const socket = io('http://localhost:5000', {
  auth: { token: 'your_jwt_token' }
});

// Listen for real-time notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Listen for assignment updates
socket.on('assignment:updated', (assignment) => {
  console.log('Assignment updated:', assignment.title);
});
```

### Server-Sent Events (SSE)
```bash
# Subscribe to live updates
curl -N -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/stream/notifications
```

### Batch Operations
```bash
# Bulk student enrollment
POST /api/bulk/students
Content-Type: application/json

{
  "operation": "create",
  "data": [
    {...student1},
    {...student2}
  ],
  "options": {
    "validateOnly": false,
    "sendWelcomeEmails": true
  }
}
```

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

## Error Codes

| Status Code | Description | Example Response |
|-------------|-------------|------------------|
| 400 | Bad Request | Invalid input parameters |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Validation Error | Input validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error occurred |

## Webhooks

The system supports webhooks for real-time notifications:

### Available Events
- `user.created` - New user registration
- `assignment.submitted` - Assignment submission
- `grade.updated` - Grade modification
- `attendance.marked` - Attendance update
- `fee.payment.completed` - Fee payment processed

### Webhook Configuration
Configure webhooks in the admin panel or via API:

```http
POST /admin/webhooks
{
  "url": "https://your-app.com/webhooks",
  "events": ["user.created", "fee.payment.completed"],
  "secret": "your_webhook_secret"
}
```

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install college-erp-sdk
```

### Python
```bash
pip install college-erp-python
```

### PHP
```bash
composer require college-erp/php-sdk
```

## Contact Support

For API support and questions:
- Email: api-support@college-erp.com
- Documentation: https://docs.college-erp.com
- GitHub Issues: https://github.com/college-erp/api/issues