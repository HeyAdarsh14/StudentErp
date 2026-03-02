const dotenv = require('dotenv');
dotenv.config();

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/college-erp',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  FROM_EMAIL: process.env.FROM_EMAIL,
  FROM_NAME: process.env.FROM_NAME || 'College ERP',
  
  // Payment
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  
  // AI Services
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  
  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  
  // WebSocket
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'your-session-secret',
  
  // Audit
  AUDIT_LOG_RETENTION_DAYS: 90,
};

// Environment validation
const validateEnvironment = () => {
  const errors = [];
  const warnings = [];
  
  // Required environment variables with validation rules
  const requiredVars = [
    {
      name: 'MONGODB_URI',
      validate: (value) => {
        if (!value.startsWith('mongodb://') && !value.startsWith('mongodb+srv://')) {
          return 'Must be a valid MongoDB URI (mongodb:// or mongodb+srv://)';
        }
        return null;
      }
    },
    {
      name: 'JWT_SECRET',
      validate: (value) => {
        if (value.length < 32) {
          return 'Must be at least 32 characters for security';
        }
        if (value === 'your-secret-key-change-in-production') {
          return 'Must be changed from default value';
        }
        return null;
      }
    },
    {
      name: 'JWT_REFRESH_SECRET',
      validate: (value) => {
        if (value.length < 32) {
          return 'Must be at least 32 characters for security';
        }
        if (value === 'your-refresh-secret-key') {
          return 'Must be changed from default value';
        }
        return null;
      }
    }
  ];

  // Critical variables (warnings if missing)
  const criticalVars = [
    {
      name: 'SMTP_HOST',
      hint: 'Email notifications will not work without SMTP configuration'
    },
    {
      name: 'SMTP_USER',
      hint: 'Email authentication will fail'
    }, 
    {
      name: 'SMTP_PASS',
      hint: 'Email authentication will fail'
    },
    {
      name: 'CLOUDINARY_CLOUD_NAME',
      hint: 'File uploads will not work'
    },
    {
      name: 'OPENAI_API_KEY',
      hint: 'AI features will be disabled'
    }
  ];

  // Validate required variables
  requiredVars.forEach(({ name, validate }) => {
    const value = process.env[name];
    if (!value) {
      errors.push(`❌ Missing required variable: ${name}`);
    } else if (validate) {
      const error = validate(value);
      if (error) {
        errors.push(`❌ Invalid ${name}: ${error}`);
      }
    }
  });

  // Check critical variables
  criticalVars.forEach(({ name, hint }) => {
    if (!process.env[name]) {
      warnings.push(`⚠️  Missing ${name} - ${hint}`);
    }
  });

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    const prodRequired = [
      'CLOUDINARY_CLOUD_NAME', 
      'CLOUDINARY_API_KEY', 
      'CLOUDINARY_API_SECRET'
    ];
    
    prodRequired.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`❌ Missing production variable: ${varName}`);
      }
    });

    // Validate production security settings
    if (process.env.SESSION_SECRET === 'your-session-secret') {
      errors.push('❌ SESSION_SECRET must be changed from default in production');
    }

    if (process.env.CORS_ORIGIN === 'http://localhost:3000') {
      warnings.push('⚠️  CORS_ORIGIN should be set to production domain');
    }
  }

  // Validate numeric values
  const numericVars = [
    { name: 'PORT', min: 1, max: 65535 },
    { name: 'SMTP_PORT', min: 1, max: 65535 }
  ];

  numericVars.forEach(({ name, min, max }) => {
    const value = process.env[name];
    if (value && (isNaN(value) || parseInt(value) < min || parseInt(value) > max)) {
      errors.push(`❌ ${name} must be a number between ${min} and ${max}`);
    }
  });

  // Display results
  if (errors.length > 0) {
    console.error('\n💥 Environment validation failed:');
    errors.forEach(error => console.error(error));
    console.error('\n📖 See ENVIRONMENT_VARIABLES.md for setup instructions\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚡ Environment warnings:');
    warnings.forEach(warning => console.warn(warning));
    console.warn('');
  }

  console.log('✅ Environment validation passed');
  
  // Log configuration summary
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`🗄️  Database: ${config.MONGODB_URI.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@')}`);
  console.log(`🚀 Server starting on port ${config.PORT}`);
};

// Validate environment on module load
if (process.env.NODE_ENV !== 'test') {
  validateEnvironment();
}

module.exports = config;
