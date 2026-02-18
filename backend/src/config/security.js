/**
 * Security Configuration
 * Comprehensive security settings for the College ERP system
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Security Headers Configuration
const helmetConfig = {
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      scriptSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

// CORS Configuration
const corsConfig = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://college-erp.com',
      'https://www.college-erp.com',
      'https://dev.college-erp.com',
    ];
    
    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type',
    'Accept',
    'Authorization',
    'x-correlation-id',
    'x-api-key',
  ],
  exposedHeaders: [
    'x-correlation-id',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset'
  ]
};

// Rate Limiting Configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

// Different rate limits for different endpoints
const rateLimits = {
  // General API rate limit
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    1000, // limit each IP to 1000 requests per windowMs
    'Too many requests, please try again later.'
  ),

  // Authentication endpoints (stricter)
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes  
    10, // limit each IP to 10 requests per windowMs
    'Too many authentication attempts, please try again later.'
  ),

  // Password reset (very strict)
  passwordReset: createRateLimit(
    60 * 60 * 1000, // 1 hour
    3, // limit each IP to 3 requests per windowMs
    'Too many password reset attempts, please try again in an hour.'
  ),

  // File upload endpoints
  upload: createRateLimit(
    60 * 1000, // 1 minute
    10, // limit each IP to 10 uploads per minute
    'Too many file uploads, please try again later.'
  ),

  // OTP requests
  otp: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    5, // limit each IP to 5 OTP requests per windowMs  
    'Too many OTP requests, please try again later.'
  ),
};

// Speed limiting (slow down repeated requests)
const speedLimit = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // allow 100 requests at full speed
  delayMs: 500, // slow down subsequent requests by 500ms per request
});

// Input Sanitization Configuration
const sanitizationConfig = {
  // Remove data using these defaults
  replaceWith: '_',
  allowDots: false,
  onSanitize: ({ key, value }) => {
    console.warn(`Sanitized input: ${key} = ${value}`);
  },
};

// XSS Configuration
const xssConfig = {
  whiteList: {}, // Empty whitelist - remove all HTML
  css: false,
  stripIgnoreTagBody: ['script'],
};

// HTTP Parameter Pollution Protection
const hppConfig = {
  whitelist: ['tags', 'categories', 'sort'], // Allow arrays for these params
};

// API Key Configuration for external services
const apiKeyValidation = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  const route = req.route?.path;
  
  // Routes that require API key
  const protectedRoutes = [
    '/admin/bulk-operations',
    '/admin/system-stats',
    '/webhooks/*',
  ];
  
  const isProtectedRoute = protectedRoutes.some(pattern => 
    route?.includes(pattern.replace('*', ''))
  );
  
  if (isProtectedRoute) {
    const validApiKeys = [
      process.env.ADMIN_API_KEY,
      process.env.SYSTEM_API_KEY,
    ].filter(Boolean);
    
    if (!apiKey || !validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing API key',
      });
    }
  }
  
  next();
};

// IP Whitelist for sensitive operations
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Allow localhost and internal networks in development
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied from this IP address',
      });
    }
    
    next();
  };
};

// Security Headers
const securityHeaders = (req, res, next) => {
  // Custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Request ID middleware for tracing
const requestId = (req, res, next) => {
  const correlationId = req.header('x-correlation-id') || 
    require('crypto').randomBytes(16).toString('hex');
  
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);
  
  next();
};

// Content Type Validation
const contentTypeValidation = (req, res, next) => {
  const contentType = req.header('content-type');
  
  // For POST/PUT/PATCH requests, ensure proper content type
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    if (!contentType || (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data'))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type. Expected application/json or multipart/form-data',
      });
    }
  }
  
  next();
};

// Request size limiting
const requestSizeLimit = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: true },
  raw: { limit: '10mb' },
};

module.exports = {
  helmet: helmet(helmetConfig),
  cors: cors(corsConfig),
  rateLimits,
  speedLimit,
  mongoSanitize: mongoSanitize(sanitizationConfig),
  xss: xss(xssConfig),
  hpp: hpp(hppConfig),
  apiKeyValidation,
  ipWhitelist,
  securityHeaders,
  requestId,
  contentTypeValidation,
  requestSizeLimit,
};