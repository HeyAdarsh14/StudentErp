# 🎓 College ERP V3 - Backend Server

## Modern, Scalable ERP System for Educational Institutions

A production-ready backend API built with Node.js, Express, MongoDB, and Socket.IO featuring advanced RBAC, real-time updates, audit logging, and multi-channel notifications.

---

## ✨ Features

### 🔐 Security & Authentication
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC) with 7 roles
- Permission matrix with 50+ granular permissions
- Rate limiting (general + route-specific)
- Audit logging for all operations
- Password hashing with bcrypt
- Session tracking & device management

### 🏗️ Modern Architecture
- **MVC + Services** pattern
- Soft delete on all entities
- Modification history tracking
- Centralized error handling
- Request validation with express-validator
- Winston logging system
- Socket.IO real-time updates

### 📊 Core Modules
- **User Management** - Multi-role user system
- **Student Management** - Complete student lifecycle
- **Faculty Management** - Workload, publications, certifications
- **Department & Subjects** - Academic structure
- **Attendance** - Multi-method tracking (Manual, QR, Biometric, Geo-fence)
- **Exams & Marks** - Auto-grading system
- **Fee Management** - Multiple payment gateways
- **Timetable** - Dynamic scheduling
- **Notices** - Targeted announcements
- **Notifications** - Multi-channel (In-app, Email, SMS, Push)
- **Reports** - PDF generation

### 🚀 Advanced Features
- Real-time notifications via WebSocket
- Cloud file storage (Cloudinary)
- Email service with templates
- Payment gateway integration (Razorpay, Stripe)
- PDF report generation
- Bulk operations support
- Advanced filtering and pagination
- Auto-calculated fields (CGPA, percentages, grades)

---

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- npm >= 9.0.0

---

## 🚀 Quick Start

### 1. Installation

```bash
cd server
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
# Required
MONGODB_URI=mongodb://localhost:27017/college-erp-v3
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Optional (for full features)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

### 3. Start Development Server

```bash
npm run dev
```

API will be available at: `http://localhost:5000/api`

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/              # Configuration files
│   │   ├── db.js           # MongoDB connection
│   │   ├── env.js          # Environment variables
│   │   ├── socket.js       # Socket.IO setup
│   │   └── cloudinary.js   # Cloud storage
│   │
│   ├── constants/          # Application constants
│   │   ├── roles.js        # Role definitions
│   │   ├── permissions.js  # RBAC permissions
│   │   └── messages.js     # Response messages
│   │
│   ├── middlewares/        # Express middlewares
│   │   ├── auth.middleware.js
│   │   ├── rbac.middleware.js
│   │   ├── error.middleware.js
│   │   ├── rateLimit.middleware.js
│   │   ├── audit.middleware.js
│   │   ├── upload.middleware.js
│   │   └── validation.middleware.js
│   │
│   ├── models/             # Mongoose models
│   │   ├── User.model.js
│   │   ├── Student.model.js
│   │   ├── Faculty.model.js
│   │   ├── Department.model.js
│   │   ├── Subject.model.js
│   │   ├── Attendance.model.js
│   │   ├── Exam.model.js
│   │   ├── Marks.model.js
│   │   ├── Fee.model.js
│   │   ├── Timetable.model.js
│   │   ├── Notice.model.js
│   │   ├── Notification.model.js
│   │   └── AuditLog.model.js
│   │
│   ├── services/           # Business logic services
│   │   ├── email.service.js
│   │   ├── notification.service.js
│   │   └── fileUpload.service.js
│   │
│   ├── utils/              # Utility functions
│   │   ├── logger.js
│   │   ├── jwt.js
│   │   ├── helpers.js
│   │   └── generatePDF.js
│   │
│   ├── app.js              # Express app setup
│   └── server.js           # Server entry point
│
├── package.json
├── .env.example
└── .gitignore
```

---

## 🔑 API Authentication

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Using Token
```http
GET /api/students
Authorization: Bearer <your-jwt-token>
```

---

## 👥 Role System

### 7 Pre-defined Roles

1. **Super Admin** (Level 100)
   - Complete system access
   - Can manage everything

2. **Admin** (Level 80)
   - College-wide management
   - User management, departments, reports

3. **Faculty** (Level 50)
   - Academic operations
   - Attendance, marks, LMS content

4. **Student** (Level 20)
   - Personal data access
   - View marks, attendance, fees

5. **Parent** (Level 30)
   - View child's academic data
   - Fee payments

6. **Accountant** (Level 60)
   - Financial management
   - Fee collection, reports

7. **Placement Officer** (Level 60)
   - Placement module management
   - Student placement tracking

---

## 🔐 Permission System

### Permission Categories

- **User Management** - user:create, user:read, user:update, user:delete
- **Student Management** - student:create, student:read, etc.
- **Faculty Management** - faculty:create, faculty:read, etc.
- **Attendance** - attendance:mark, attendance:read, attendance:update
- **Marks & Exams** - marks:create, marks:read, exam:create
- **Fees** - fee:create, fee:read, fee:payment
- **Notices** - notice:create, notice:read, notice:update
- **LMS** - lms:content:create, lms:assignment:grade
- **Reports** - report:generate, report:export
- **Audit** - audit:read

### Using Permissions in Routes

```javascript
const { authenticate } = require('./middlewares/auth.middleware');
const { hasPermission } = require('./middlewares/rbac.middleware');
const { PERMISSIONS } = require('./constants/permissions');

// Only users with student:create permission can access
router.post('/students',
  authenticate,
  hasPermission(PERMISSIONS.STUDENT_CREATE),
  createStudent
);
```

---

## 🔔 Real-time Features (Socket.IO)

### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for notifications
socket.on('notification', (data) => {
  console.log('New notification:', data);
});

// Join department room
socket.emit('join:department', 'departmentId');
```

### Server Events
- `notification` - New notification received
- `unread_count_update` - Unread notification count updated

---

## 📧 Email Templates

Built-in email templates for:
- Welcome email (new user)
- Password reset
- OTP verification
- Fee reminder
- Exam notification
- Marks published
- Low attendance alert

```javascript
const { sendWelcomeEmail } = require('./services/email.service');

await sendWelcomeEmail(user, temporaryPassword);
```

---

## 📤 File Upload

### Upload Profile Image
```javascript
const { uploadProfileImage } = require('./services/fileUpload.service');

const result = await uploadProfileImage(file, userId);
// Returns: { url, publicId, format, size, width, height }
```

### Upload Document
```javascript
const { uploadDocument } = require('./services/fileUpload.service');

const result = await uploadDocument(file, 'documents');
// Returns: { url, publicId, format, size }
```

---

## 📊 Pagination

All list endpoints support pagination:

```http
GET /api/students?page=1&limit=20
```

Response format:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## 🔍 Audit Logging

All mutations are automatically logged:
- User who performed action
- Resource type and ID
- IP address and user agent
- Request details
- Timestamp

Query audit logs:
```javascript
const { getUserAuditLogs } = require('./middlewares/audit.middleware');

const logs = await getUserAuditLogs(userId, {
  page: 1,
  limit: 20,
  startDate: '2024-01-01',
  action: 'CREATE',
  resourceType: 'STUDENT'
});
```

---

## 🛡️ Security Best Practices

### Implemented
✅ JWT with refresh tokens
✅ Password hashing (bcrypt)
✅ Rate limiting
✅ CORS configuration
✅ Helmet security headers
✅ XSS protection
✅ NoSQL injection prevention
✅ Input validation
✅ Audit logging
✅ Session tracking

### Recommendations
- Use HTTPS in production
- Set strong JWT secrets
- Configure proper CORS origins
- Enable MongoDB authentication
- Use environment-specific configs
- Regular security audits

---

## 🧪 Testing

```bash
npm test           # Run tests
npm test:watch     # Watch mode
```

---

## 📈 Performance

### Database Optimization
- Compound indexes on frequently queried fields
- TTL indexes for auto-cleanup
- Query middleware to exclude soft-deleted records
- Population only when needed
- Lean queries for read-only operations

### API Optimization
- Rate limiting prevents abuse
- Pagination on all list endpoints
- Selective field population
- Caching headers (can be added)
- Compression middleware (can be added)

---

## 🐛 Error Handling

Centralized error handling with proper status codes:

```javascript
// Validation Error - 400
// Unauthorized - 401
// Forbidden - 403
// Not Found - 404
// Server Error - 500
```

Error response format:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [ /* validation errors */ ]
}
```

---

## 📝 Logging

Winston logger with file rotation:
- `logs/error.log` - Error level logs
- `logs/combined.log` - All logs
- Console output in development

```javascript
const logger = require('./utils/logger');

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', { error });
```

---

## 🚀 Deployment

### Environment Variables
Ensure all required environment variables are set in production.

### Database
Use MongoDB Atlas or dedicated MongoDB server.

### File Storage
Configure Cloudinary for file uploads.

### Email
Setup SMTP server (Gmail, SendGrid, AWS SES, etc.)

### Monitoring
- Setup error tracking (Sentry)
- Setup uptime monitoring
- Setup log aggregation

---

## 📦 Dependencies

### Core
- `express` - Web framework
- `mongoose` - MongoDB ORM
- `jsonwebtoken` - JWT authentication
- `bcrypt` - Password hashing
- `socket.io` - Real-time updates

### Security
- `helmet` - Security headers
- `cors` - CORS middleware
- `express-rate-limit` - Rate limiting
- `express-mongo-sanitize` - NoSQL injection prevention
- `xss-clean` - XSS protection

### Utilities
- `winston` - Logging
- `nodemailer` - Email sending
- `cloudinary` - File storage
- `pdfkit` - PDF generation
- `express-validator` - Input validation

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

For issues and questions, please open an issue on the repository.

---

**Built with ❤️ for modern educational institutions**
