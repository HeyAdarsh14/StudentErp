# College ERP System - Installation Guide

## Prerequisites

Before installing the College ERP system, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **MongoDB** (v5.0 or higher)
- **Git**
- **npm** or **yarn** package manager

## Installation Steps

### 1. Clone the Repository

```bash
git clone https://github.com/HeyAdarsh14/StudentErp.git
cd College-Erp-main
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/college_erp
DB_NAME=college_erp

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Cloudinary Configuration (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Admin Configuration
ADMIN_EMAIL=admin@college.edu
ADMIN_PASSWORD=admin123
```

### 4. Database Setup

Start MongoDB service and create the database:

```bash
# Start MongoDB (varies by OS)
# Windows: net start MongoDB
# macOS: brew services start mongodb/brew/mongodb-community
# Linux: sudo systemctl start mongod

# The application will automatically create collections when started
```

### 5. Start Backend Server

```bash
cd backend
npm run dev
```

The backend server will start on `http://localhost:5000`

### 6. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 7. Start Frontend Server

```bash
npm start
```

The frontend application will start on `http://localhost:3000`

## Default Admin Credentials

After installation, you can log in with these default admin credentials:

- **Email:** admin@college.edu
- **Password:** admin123

**Important:** Change these credentials immediately after first login.

## Verification

To verify the installation:

1. Visit `http://localhost:3000` in your browser
2. You should see the College ERP login page
3. Use the admin credentials to log in
4. Check that all modules are accessible

## Troubleshooting

### Common Issues

1. **Port already in use:**
   - Change the PORT in your `.env` file
   - Kill any processes using the port

2. **MongoDB connection error:**
   - Ensure MongoDB is running
   - Check the MONGODB_URI in your `.env` file

3. **Module not found errors:**
   - Run `npm install` in both frontend and backend directories
   - Clear node_modules and reinstall if necessary

4. **Environment variables not loaded:**
   - Ensure `.env` file is in the backend root directory
   - Restart the server after making changes

### Getting Help

If you encounter issues:
1. Check the console logs for error messages
2. Ensure all prerequisites are properly installed
3. Verify environment variable configuration
4. Check that all required services are running

## Next Steps

After successful installation:
1. Configure user roles and permissions
2. Set up academic calendar
3. Import student and faculty data
4. Configure notification settings
5. Set up backup procedures