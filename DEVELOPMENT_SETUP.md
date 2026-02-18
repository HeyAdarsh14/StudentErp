# Development Environment Setup

This guide will help you set up your development environment for contributing to the College ERP system.

## Prerequisites

### Required Software

1. **Node.js** (v16.x or higher)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version` and `npm --version`

2. **MongoDB** (v5.0 or higher)
   - **Windows**: Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - **macOS**: `brew install mongodb-community`
   - **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Configure: 
     ```bash
     git config --global user.name "Your Name"
     git config --global user.email "your.email@example.com"
     ```

4. **Code Editor**
   - **Recommended**: [Visual Studio Code](https://code.visualstudio.com/)
   - **Extensions**: See [Recommended Extensions](#recommended-extensions)

## Project Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/YOUR_USERNAME/StudentErp.git
cd College-Erp-main

# Add upstream remote to sync with original repository
git remote add upstream https://github.com/HeyAdarsh14/StudentErp.git
```

### 2. Environment Setup

Create environment files for both backend and frontend:

#### Backend Environment (.env)

```bash
cd backend
cp .env.example .env  # If exists, otherwise create as shown below
```

**backend/.env:**
```env
# Development Database
MONGODB_URI=mongodb://localhost:27017/college_erp_dev
DB_NAME=college_erp_dev
DB_POOL_SIZE=10
DB_TIMEOUT=30000

# JWT Secrets (Generate your own)
JWT_SECRET=your_development_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
DEBUG=college-erp:*
CORS_ORIGIN=http://localhost:3000
TRUST_PROXY=false

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379
REDIS_SESSION_PREFIX=erp:sess:
REDIS_CACHE_TTL=3600

# Cloudinary Configuration (Optional for development)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=development

# Email Configuration (Optional for development)
EMAIL_SERVICE=gmail
EMAIL_USER=your_dev_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM='"College ERP Dev" <noreply@dev.local>'

# Admin Configuration
ADMIN_EMAIL=admin@dev.local
ADMIN_PASSWORD=dev_admin_123
ADMIN_FIRST_NAME=Admin
ADMIN_LAST_NAME=User

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW_MS=900000
SESSION_SECRET=your_session_secret_here

# Monitoring & Performance
PERFORMANCE_METRICS_ENABLED=true
PERFORMANCE_SLOW_THRESHOLD=1000
LOG_LEVEL=debug
LOG_FORMAT=pretty

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf
UPLOAD_PATH=uploads/

# External APIs (Development)
PAYMENT_GATEWAY_KEY=test_key
PAYMENT_GATEWAY_SECRET=test_secret
SMS_GATEWAY_KEY=test_sms_key
MAPS_API_KEY=your_maps_api_key

# Testing Configuration
TEST_DB_URI=mongodb://localhost:27017/college_erp_test
TEST_TIMEOUT=30000
```

#### Frontend Environment (.env)

```bash
cd frontend
```

**frontend/.env:**
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_BASE_URL=http://localhost:3000

# Environment
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.2.0
REACT_APP_BUILD_DATE=2026-02-18

# Cloudinary Configuration
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=dev_preset

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_NOTIFICATIONS=true
REACT_APP_ENABLE_CHAT=true
REACT_APP_ENABLE_VIDEO_CALLS=false
REACT_APP_ENABLE_PWA=true

# Maps & Location
REACT_APP_MAPS_API_KEY=your_maps_api_key
REACT_APP_DEFAULT_LOCATION={"lat":28.6139,"lng":77.2090}

# Performance & Debugging
REACT_APP_ENABLE_CONSOLE_LOGS=true
REACT_APP_ENABLE_REDUX_DEVTOOLS=true
REACT_APP_BUNDLE_ANALYZER=false

# Theme Configuration
REACT_APP_DEFAULT_THEME=light
REACT_APP_THEME_PRIMARY_COLOR=#1976d2
REACT_APP_THEME_SECONDARY_COLOR=#dc004e

# External Services
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
```

## Docker Development Setup

For a consistent development environment across all platforms:

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Quick Start with Docker

```bash
# Clone and navigate to project
git clone https://github.com/YOUR_USERNAME/College-Erp-main.git
cd College-Erp-main

# Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start all services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop all services  
docker-compose -f docker-compose.dev.yml down
```

### Docker Compose Development Configuration

Create **docker-compose.dev.yml:**

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: college-erp-mongo-dev
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: devpassword
      MONGO_INITDB_DATABASE: college_erp_dev
    ports:
      - "27017:27017"
    volumes:
      - mongodb_dev_data:/data/db
      - ./backend/scripts/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js
    networks:
      - college-erp-network

  redis:
    image: redis:6-alpine
    container_name: college-erp-redis-dev
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - college-erp-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: college-erp-backend-dev
    restart: unless-stopped
    environment:
      NODE_ENV: development
      MONGODB_URI: mongodb://root:devpassword@mongodb:27017/college_erp_dev?authSource=admin
      REDIS_URL: redis://redis:6379
    ports:
      - "5000:5000"
      - "9229:9229"  # Node.js debugging port
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/uploads:/app/uploads
    depends_on:
      - mongodb
      - redis
    networks:
      - college-erp-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: college-erp-frontend-dev
    restart: unless-stopped
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
      REACT_APP_SOCKET_URL: http://localhost:5000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - college-erp-network

networks:
  college-erp-network:
    driver: bridge

volumes:
  mongodb_dev_data:
  redis_dev_data:
```

### Backend Development Dockerfile

Create **backend/Dockerfile.dev:**

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port and debugging port
EXPOSE 5000 9229

# Start with debugging enabled
CMD ["npm", "run", "dev:debug"]
```

### Frontend Development Dockerfile  

Create **frontend/Dockerfile.dev:**

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "start"]
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies  
cd ../frontend
npm install
```

### 4. Database Setup

```bash
# Start MongoDB service
# Windows: net start MongoDB
# macOS: brew services start mongodb/brew/mongodb-community
# Linux: sudo systemctl start mongod

# Create development admin user (optional)
cd backend
node create-admin.js
```

### 5. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

**Access the application:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Development Workflow

### Branch Management

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Keep your fork updated
git fetch upstream
git checkout master
git merge upstream/master
git push origin master

# Rebase your feature branch
git checkout feature/your-feature-name
git rebase master
```

### Code Style and Standards

#### ESLint and Prettier

Both backend and frontend use ESLint and Prettier for code quality:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code with Prettier
npm run format
```

## Development Tools & Debugging

### VS Code Configuration

Create **.vscode/settings.json:**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/dist": true,
    "**/build": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/build": true
  }
}
```

Create **.vscode/launch.json:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Frontend",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["start"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Database Management

#### MongoDB Compass
- Download: https://www.mongodb.com/products/compass
- Connect to: `mongodb://localhost:27017`

#### Useful MongoDB Commands

```bash
# Connect to MongoDB shell
mongosh

# Show databases
show dbs

# Use development database
use college_erp_dev

# Show collections
show collections

# Query examples
db.users.find({role: "student"})
db.departments.find({}).pretty()

# Create indexes for better performance
db.users.createIndex({email: 1}, {unique: true})
db.attendance.createIndex({studentId: 1, date: 1})
```

### API Testing with Postman

Import the Postman collection for easy API testing:

**Postman Environment Variables:**
```json
{
  "name": "College ERP Development",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    }
  ]
}
```

### Performance Profiling

#### Node.js Performance Monitoring

```bash
# Start with profiling
node --prof backend/src/server.js

# Generate profiling report  
node --prof-process isolate-*.log > profile.txt

# Memory usage analysis
node --inspect backend/src/server.js
```

#### React Performance

```bash
# Bundle analyzer
npm run build
npx serve -s build

# Performance profiling in browser
# Open React DevTools Profiler tab
```

### Testing Setup

#### Backend Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- auth.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

#### Frontend Testing
```bash
# Run component tests
npm test

# Run E2E tests with Cypress
npm run test:e2e

# Open Cypress test runner
npm run cypress:open
```

### Utilities and Scripts

#### Backend Scripts
```bash
# Create admin user
node scripts/create-admin.js

# Reset all passwords  
node scripts/reset-all-passwords.js

# Seed database with sample data
node scripts/seed-database.js

# Backup database
node scripts/backup-database.js

# Validate environment setup
node scripts/validate-env.js
```

#### Frontend Scripts
```bash
# Bundle analyzer
npm run analyze

# TypeScript type checking
npm run type-check

# Lint CSS/SCSS files
npm run lint:css
```

### Troubleshooting

#### Common Issues

**Port Already in Use:**
```bash
# Kill process on port 5000
npx kill-port 5000

# Or find and kill manually
lsof -ti:5000
kill -9 <PID>
```

**MongoDB Connection Issues:**
```bash
# Check MongoDB status
brew services list | grep mongo  # macOS
sudo systemctl status mongod      # Linux
net start MongoDB                 # Windows

# Reset MongoDB
sudo systemctl restart mongod
```

**Node Modules Issues:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
```

**Environment Variables not Loading:**
```bash
# Verify .env file location and syntax
cat .env | head -5

# Check for syntax errors
node -e "console.log(require('dotenv').config())"
```

#### Debug Mode

**Backend Debug Mode:**
```bash
# Enable debug logs
DEBUG=college-erp:* npm run dev

# Or specific modules
DEBUG=college-erp:auth,college-erp:db npm run dev
```

**Frontend Debug Mode:**
```bash
# Enable React debug mode
REACT_APP_DEBUG=true npm start

# Enable Redux DevTools
REACT_APP_REDUX_DEBUG=true npm start
```

**Install dev dependencies:**
```bash
# Backend
cd backend
npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier

# Frontend (usually already included in Create React App)
cd frontend
npm install --save-dev prettier
```

**Configuration files are already included in the project.**

#### Pre-commit Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky lint-staged

# Setup husky
npx husky install
npx husky add .husky/pre-commit "npm run lint-staged"
```

### Testing

#### Backend Tests

```bash
cd backend
npm test          # Run all tests
npm run test:watch # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

#### Frontend Tests

```bash
cd frontend
npm test          # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Database Development

#### Seeding Development Data

```bash
cd backend
node scripts/seed-dev-data.js
```

#### Database GUI Tools

**Recommended MongoDB GUI tools:**
- [MongoDB Compass](https://www.mongodb.com/products/compass) (Official)
- [Robo 3T](https://robomongo.org/)
- [Studio 3T](https://studio3t.com/)

**Connection String for GUI tools:**
```
mongodb://localhost:27017/college_erp_dev
```

## Recommended Extensions

### VS Code Extensions

#### Essential
- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **Prettier - Code formatter** - Code formatting  
- **ESLint** - JavaScript linting
- **Auto Rename Tag** - Auto rename paired HTML tags
- **Bracket Pair Colorizer** - Colorize matching brackets

#### Backend Development
- **REST Client** - Test APIs directly in VS Code
- **MongoDB for VS Code** - MongoDB integration
- **Node.js Modules Intellisense** - Auto-complete for Node modules
- **npm Intellisense** - Auto-complete npm modules in imports

#### Frontend Development
- **Simple React Snippets** - React code snippets
- **Auto Import - ES6, TS, JSX, TSX** - Auto import modules
- **CSS Peek** - Navigate to CSS definitions
- **Color Highlight** - Highlight colors in CSS/SCSS

#### General Development
- **GitLens** - Enhanced git capabilities
- **Path Intellisense** - File path auto-completion
- **Thunder Client** - API testing (alternative to Postman)
- **Todo Highlight** - Highlight TODO comments
- **Better Comments** - Improved comment formatting

### VS Code Settings

**settings.json:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.js": "javascriptreact"
  }
}
```

## Debugging

### Backend Debugging

**VS Code Debug Configuration (.vscode/launch.json):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node", 
      "request": "launch",
      "name": "Debug Backend",
      "program": "${workspaceFolder}/backend/src/server.js",
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeExecutable": "nodemon"
    }
  ]
}
```

### Frontend Debugging

**Browser DevTools:**
- React Developer Tools extension
- Redux DevTools extension (if using Redux)

**VS Code Debugging:**
- Use Chrome debugger configuration for React apps

## Performance Monitoring

### Development Tools

1. **MongoDB Performance:**
   - Enable MongoDB profiler in development
   - Use `explain()` for query optimization

2. **React Performance:**
   - React Profiler in DevTools
   - Bundle analyzer: `npm run build && npx serve -s build`

3. **API Performance:**
   - Use tools like Artillery or k6 for load testing
   - Monitor response times during development

## Contributing Guidelines

### Before Submitting

1. **Run tests:** Ensure all tests pass
2. **Code formatting:** Run Prettier/ESLint
3. **Documentation:** Update docs if needed
4. **Commit messages:** Follow conventional commit format

### Commit Message Format

```
type(scope): description

body (optional)

footer (optional)
```

**Examples:**
```
feat(auth): add password reset functionality
fix(student): resolve enrollment date validation
docs(api): update authentication endpoint documentation
```

### Pull Request Process

1. Create feature branch from latest master
2. Make your changes
3. Add/update tests as necessary
4. Update documentation
5. Run full test suite
6. Create pull request with detailed description

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Kill process using port
   npx kill-port 5000
   npx kill-port 3000
   ```

2. **Node modules issues:**
   ```bash
   # Clear node modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **MongoDB connection:**
   ```bash
   # Check MongoDB status
   # Windows: sc query MongoDB
   # macOS/Linux: brew services list | grep mongodb
   ```

4. **Environment variables not loading:**
   - Ensure .env file is in correct directory
   - Restart development server after changes
   - Check for syntax errors in .env file

### Getting Help

- Check existing GitHub issues
- Create new issue with reproduction steps
- Join development discussions in project repository
- Refer to official documentation