#!/usr/bin/env node

/**
 * College ERP Setup Verification Script
 * Validates environment and dependencies for development
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 College ERP Backend Setup Verification\n');

const checks = [
  {
    name: 'Node.js Version',
    check: () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
      return {
        pass: majorVersion >= 18,
        message: `Found Node.js ${nodeVersion} (requires >= 18.0.0)`
      };
    }
  },
  {
    name: 'Package Dependencies',
    check: () => {
      try {
        const packageJson = require('./package.json');
        const nodeModulesExists = fs.existsSync('node_modules');
        return {
          pass: nodeModulesExists,
          message: nodeModulesExists 
            ? '✓ Dependencies installed' 
            : '✗ Run "npm install" to install dependencies'
        };
      } catch (error) {
        return {
          pass: false,
          message: `✗ Error reading package.json: ${error.message}`
        };
      }
    }
  },
  {
    name: 'Environment Configuration',
    check: () => {
      const envExists = fs.existsSync('.env');
      const exampleExists = fs.existsSync('.env.example');
      return {
        pass: envExists,
        message: envExists 
          ? '✓ Environment file found'
          : `✗ Create .env file${exampleExists ? ' (copy from .env.example)' : ''}`
      };
    }
  },
  {
    name: 'Environment Variables',
    check: () => {
      try {
        require('dotenv').config();
        const required = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
        const missing = required.filter(var1 => !process.env[var1]);
        return {
          pass: missing.length === 0,
          message: missing.length === 0
            ? '✓ Required environment variables set'
            : `✗ Missing required variables: ${missing.join(', ')}`
        };
      } catch (error) {
        return {
          pass: false,
          message: `✗ Error loading environment: ${error.message}`
        };
      }
    }
  },
  {
    name: 'MongoDB Connection',
    check: async () => {
      try {
        require('dotenv').config();
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: 5000
        });
        await mongoose.connection.close();
        return {
          pass: true,
          message: '✓ MongoDB connection successful'
        };
      } catch (error) {
        return {
          pass: false,
          message: `✗ MongoDB connection failed: ${error.message}`
        };
      }
    }
  }
];

async function runChecks() {
  let passedChecks = 0;
  
  for (const check of checks) {
    process.stdout.write(`${check.name}: `);
    
    try {
      const result = await check.check();
      console.log(result.message);
      if (result.pass) passedChecks++;
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Results: ${passedChecks}/${checks.length} checks passed`);
  
  if (passedChecks === checks.length) {
    console.log('🎉 All checks passed! Your environment is ready for development.');
    console.log('\n▶️  Next steps:');
    console.log('   npm run dev    # Start development server');
    console.log('   npm run test   # Run test suite');
  } else {
    console.log('❌ Some checks failed. Please address the issues above.');
    process.exit(1);
  }
}

// Run setup verification
runChecks().catch(error => {
  console.error('💥 Setup verification failed:', error.message);
  process.exit(1);
});