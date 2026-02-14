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

# JWT Secrets (Generate your own)
JWT_SECRET=your_development_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development
DEBUG=college-erp:*

# Cloudinary Configuration (Optional for development)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (Optional for development)
EMAIL_SERVICE=gmail
EMAIL_USER=your_dev_email@gmail.com
EMAIL_PASS=your_app_password

# Admin Configuration
ADMIN_EMAIL=admin@dev.local
ADMIN_PASSWORD=dev_admin_123
```

#### Frontend Environment (.env)

```bash
cd frontend
```

**frontend/.env:**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_ENVIRONMENT=development
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