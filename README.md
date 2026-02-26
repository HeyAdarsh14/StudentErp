# 🎓 College ERP v3 - Next-Generation Education Management System

## 📋 Overview
A modern, full-stack College ERP system built with MERN stack, featuring AI-powered intelligence, real-time updates, and a stunning dark-neon UI.

## 🚀 Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/College-Erp-main.git
cd College-Erp-main

# Quick setup with Docker
docker-compose up -d
```

## ✨ Key Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-Based Access Control (RBAC) - 7 roles with hierarchical permissions
- Session management and device tracking
- Secure password reset with OTP

### 👥 User Management
- Students, Faculty, Parents, Admin, Accountant, Placement Officer
- Comprehensive profile management
- Department and subject organization
- Bulk import via CSV

### 📚 Academic Management
- **Attendance System** - Multiple methods (Manual, QR, Biometric, Geo-fence)
- **Exam & Marks** - Auto-grading, percentage calculation, grade assignment
- **LMS Module** - Assignments, Quizzes (4 question types), Content Library, Gradebook
- **Timetable Engine** - Smart auto-generation, conflict detection, slot swapping

### 💰 Financial Management
- Fee structure with installments
- Payment gateway integration (Razorpay/Stripe)
- Automated reminders and receipts
- Scholarship management
- Defaulter tracking

### 🎯 Placement Management
- Company verification and job postings
- Eligibility engine (CGPA, backlogs)
- Application tracking and interview scheduling
- Offer management and statistics

### 📢 Communication Hub
- Multi-channel notifications (In-app, Email, SMS, Push, WhatsApp)
- Targeted notice board
- Real-time updates via Socket.IO
- Template management

### 📊 Analytics & Reports
- 15 customizable dashboard widgets
- Attendance and marks trends
- At-risk student detection
- Faculty performance metrics
- Predictive analytics (dropout risk)
- Excel/CSV export

### 🤖 AI Intelligence Layer
- **GPT-3.5-turbo Chatbot** - Context-aware conversational AI
- **Smart Recommendations** - Course, internships, skills, study materials, career paths
- **Resume Analysis** - AI-powered scoring with suggestions
- **Document Summarization** - Automated notice/document summaries
- **Intent Classification** - 11 intent types for smart routing
- **Performance Prediction** - Academic trend analysis and risk assessment

### 🎨 Modern UI/UX
- Dark-neon theme with glassmorphism effects
- Fully responsive design (mobile-first)
- Animated gradients and smooth transitions
- Role-specific dashboards
- Real-time updates

## 🛠️ Tech Stack

### Backend
- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT (jsonwebtoken)
- **Real-time:** Socket.IO
- **File Upload:** Cloudinary
- **Email:** Nodemailer
- **PDF Generation:** PDFKit
- **AI:** OpenAI GPT-3.5-turbo
- **Logging:** Winston
- **Validation:** Express-validator
- **Security:** Helmet, bcrypt, rate-limiting

### Frontend
- **Library:** React 19
- **State Management:** React Query (TanStack Query v5)
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v3
- **HTTP Client:** Axios
- **Real-time:** Socket.IO Client
- **Forms:** React Hook Form
- **Validation:** Zod
- **Notifications:** React Hot Toast
- **Icons:** Lucide React
- **Charts:** Recharts
- **Animations:** Framer Motion

### DevOps (Phase 12)
- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** PM2, Sentry
- **SSL:** Let's Encrypt
- **Reverse Proxy:** Nginx

## 📁 Project Structure

```
college-erp-v3/
├── backend/                  # Backend API server
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── constants/       # Constants and enums
│   │   ├── controllers/     # Request handlers
│   │   ├── middlewares/     # Express middlewares
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   ├── uploads/             # File uploads
│   ├── logs/                # Application logs
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── server.js            # Entry point
│
├── frontend/                 # React frontend
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── config/          # App configuration
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   └── utils/           # Utility functions
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml        # Docker orchestration
├── .gitignore
├── README.md                 # This file
└── PROJECT_SUMMARY.md        # Detailed implementation docs

```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- MongoDB 6+
- Git

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend will run on http://localhost:5000

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

Frontend will run on http://localhost:3000

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/college-erp
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_EXPIRE=1h
JWT_REFRESH_EXPIRE=7d

CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

OPENAI_API_KEY=optional_for_ai_features

RAZORPAY_KEY_ID=optional_for_payments
RAZORPAY_KEY_SECRET=optional_for_payments
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 📊 Project Status

**Overall Progress: 91% Complete (11/12 Phases)**

### ✅ Completed Phases
1. ✅ Backend Foundation & Architecture (100%)
2. ✅ Core Auth & RBAC System (100%)
3. ✅ Enhanced Student & Faculty Modules (100%)
4. ✅ Fees & Payment Gateway Integration (100%)
5. ✅ LMS Module (95%)
6. ✅ Timetable & Calendar Engine (100%)
7. ✅ Placement Module (100%)
8. ✅ Communication & Notifications Hub (100%)
9. ✅ Analytics & Reports Dashboard (100%)
10. ✅ AI Features & Intelligence Layer (100%)
11. ✅ Frontend Rebuild with React Query (100%)

### 🔄 In Progress
12. 🔄 Production Deployment (Next)

## 📈 Statistics

- **Total Files:** 158+
- **Lines of Code:** ~27,700+
- **Backend Files:** 118 files, ~24,200 LOC
- **Frontend Files:** 40+ files, ~3,500 LOC
- **API Endpoints:** 232+
- **Database Models:** 15
- **React Components:** 40+
- **API Hooks:** 20+

## 🎯 Key Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create student
- `GET /api/students/:id/attendance` - Student attendance
- `GET /api/students/:id/marks` - Student marks

### AI Features
- `POST /api/ai/chat` - Chat with AI assistant
- `GET /api/ai/recommendations` - Get AI recommendations
- `POST /api/ai/analyze/resume` - Analyze resume
- `GET /api/ai/predict/performance/:id` - Predict student performance

[See full API documentation in `/docs/API.md`]

## 🎨 UI Features

- **Login Page** - Neon-styled authentication
- **Student Dashboard** - Attendance, marks, fees, AI recommendations
- **Faculty Dashboard** - Class management, grading, schedule
- **Admin Dashboard** - System-wide statistics and management
- **AI Chatbot** - Floating chatbot with session management
- **Real-time Notifications** - Toast notifications with Socket.IO

## 🔐 Default Credentials (Development)

**Super Admin:**
- Email: superadmin@college.edu
- Password: password123

**Student:**
- Email: student@college.edu
- Password: password123

**Faculty:**
- Email: faculty@college.edu
- Password: password123

## 📝 License

This project is licensed under the MIT License.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Contact

For questions or support, please contact the development team.

## 📅 Project Status

- **Last Updated:** February 26, 2026
- **Version:** 3.0.0
- **Status:** Active Development
- **Deployment:** Production Ready

---

**Built with ❤️ using Modern MERN Stack + AI**

*College ERP v3 - Where Education Meets Innovation*

> "Transforming educational institutions through intelligent automation and modern design"
