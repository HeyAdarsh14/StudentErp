# Contributing to College ERP System

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- 🐛 Reporting a bug
- 💡 Discussing the current state of the code
- 🎯 Submitting a fix
- 🚀 Proposing new features
- 👥 Becoming a maintainer

## 📋 Table of Contents
- [Development Process](#-development-process)
- [Getting Started](#-getting-started)
- [Making Changes](#-making-changes)
- [Pull Request Process](#-pull-request-process)
- [Issue Reporting](#-issue-reporting)
- [Code Style](#-code-style)
- [Community Guidelines](#-community-guidelines)

## 🔄 Development Process

We use GitHub to sync code, track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `master`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- MongoDB 7.0+
- Git
- Code editor (VS Code recommended)

### Local Setup
```bash
# 1. Fork and clone the repository
git clone https://github.com/YourUsername/StudentErp.git
cd StudentErp

# 2. Install dependencies
npm run install:all

# 3. Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Set up database
npm run db:setup

# 5. Start development servers
npm run dev
```

### Project Structure
```
College-Erp-main/
├── backend/          # Node.js/Express API
├── frontend/         # React application
├── docs/             # Documentation
└── scripts/          # Utility scripts
```

## 🛠 Making Changes

### Branch Naming Convention
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test additions/updates

### Commit Message Format
```
type(scope): Brief description

Detailed explanation of what changed and why.

- List specific changes
- Use present tense ("Add feature" not "Added feature")
- Limit first line to 72 characters
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): Add JWT refresh token functionality

- Implement automatic token refresh
- Add refresh token validation middleware
- Update authentication flow

fix(api): Resolve student enrollment validation issue

- Fix validation logic for duplicate enrollments
- Add proper error messaging
- Update test cases
```

## 📤 Pull Request Process

### Before Submitting
1. **Run all checks locally:**
   ```bash
   npm run lint          # Code linting
   npm run format        # Code formatting
   npm run test          # Run tests
   npm run build         # Test build process
   ```

2. **Update documentation if needed**
3. **Add/update tests for new functionality**
4. **Ensure backward compatibility**

### PR Checklist
- [ ] Code follows the established style guide
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Related issues linked

### PR Template
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Fixes #issue_number
```

## 🐛 Issue Reporting

### Bug Reports
Use the bug report template and include:
- **Environment details** (OS, Node.js version, browser)
- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **Screenshots/logs** if applicable
- **Possible solution** if you have one

### Feature Requests
Use the feature request template and include:
- **Problem statement** - What issue does this solve?
- **Proposed solution** - How should it work?
- **Alternatives considered** - Other approaches you've thought about
- **Additional context** - Any other relevant information

## 🎨 Code Style

### JavaScript/Node.js
- Use ESLint configuration provided
- Follow Airbnb style guide
- Use async/await instead of promises
- Prefer const/let over var
- Use meaningful variable names

### React/Frontend
- Use functional components with hooks
- Follow component naming conventions
- Use TypeScript for new components (migration in progress)
- Implement proper error boundaries

### Database
- Use meaningful collection/field names
- Always validate data before saving
- Use indexes for frequently queried fields
- Follow MongoDB best practices

### API Design
- RESTful URL structure
- Consistent response format
- Proper HTTP status codes
- Comprehensive error handling

## 🏅 Community Guidelines

### Be Respectful
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community

### Be Helpful
- Help newcomers get started
- Share knowledge and experience
- Provide constructive feedback
- Celebrate others' contributions

### Quality Standards
- Write clear, understandable code
- Test your changes thoroughly
- Document complex functionality
- Follow security best practices

## 📚 Resources

### Documentation
- [API Documentation](./API_DOCUMENTATION.md)
- [Development Setup](./DEVELOPMENT_SETUP.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Guidelines](./SECURITY.md)

### Communication
- 💬 **Discord**: [Join our community](https://discord.gg/studenterp)
- 📧 **Email**: dev@studenterp.dev
- 🐦 **Twitter**: [@StudentERP](https://twitter.com/studenterp)
- 📖 **Wiki**: [Project Wiki](https://github.com/HeyAdarsh14/StudentErp/wiki)

### Learning Resources
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [React Patterns](https://reactpatterns.com/)
- [MongoDB University](https://university.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/)

## 🙏 Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes for significant contributions
- Annual contributor spotlight
- Project documentation credits

### Hall of Fame
Special thanks to our top contributors:
- **Core Team**: Full-time developers and maintainers
- **Community Champions**: Active community helpers
- **Feature Authors**: Major feature contributors
- **Documentation Heroes**: Documentation specialists

---

## 📞 Need Help?

Don't hesitate to ask for help! You can:
- Comment on an existing issue
- Create a new discussion topic
- Reach out on Discord
- Email the development team

**Remember**: The only bad question is the one not asked! 🌟

---

*Thank you for contributing to College ERP System! Your efforts help make education management better for everyone.* 🎓