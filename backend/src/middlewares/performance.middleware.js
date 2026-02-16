const logger = require('../utils/logger');

/**
 * Performance monitoring middleware
 * Tracks request timing, response times, and performance metrics
 */

// In-memory storage for performance metrics (in production, use Redis or proper monitoring solution)
const performanceMetrics = {
  totalRequests: 0,
  totalResponseTime: 0,
  slowRequests: 0,
  errorRequests: 0,
  requestsByEndpoint: new Map(),
  requestsByMethod: new Map(),
  lastReset: Date.now()
};

/**
 * Performance monitoring middleware
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage().heapUsed;

  // Override res.end to capture response metrics
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  let responseSize = 0;

  // Track response data size
  res.send = function(data) {
    if (data) {
      responseSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    }
    return originalSend.apply(this, arguments);
  };

  res.json = function(data) {
    if (data) {
      responseSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    }
    return originalJson.apply(this, arguments);
  };

  res.end = function(data) {
    if (data && !responseSize) {
      responseSize = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, 'utf8');
    }
    return originalEnd.apply(this, arguments);
  };

  // Cleanup and metrics calculation when response finishes
  res.on('finish', () => {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const endMemory = process.memoryUsage().heapUsed;
    const memoryDelta = endMemory - startMemory;

    // Update performance metrics
    updateMetrics(req, res, responseTime);

    // Add performance headers
    res.set('X-Response-Time', `${responseTime}ms`);
    res.set('X-Memory-Usage', `${Math.round(memoryDelta / 1024)}KB`);

    // Log performance data
    const performanceData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      responseSize,
      memoryUsage: Math.round(memoryDelta / 1024), // KB
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      correlationId: req.correlationId
    };

    // Log slow requests
    if (responseTime > 1000) { // Requests taking more than 1 second
      logger.warn('Slow request detected', {
        ...performanceData,
        threshold: '1000ms'
      });
    }

    // Log detailed performance for development
    if (process.env.NODE_ENV === 'development' && responseTime > 100) {
      logger.info('Performance metrics', performanceData);
    }

    // Log errors
    if (res.statusCode >= 400) {
      logger.warn('Error response', performanceData);
    }
  });

  next();
};

/**
 * Update in-memory performance metrics
 */
const updateMetrics = (req, res, responseTime) => {
  performanceMetrics.totalRequests++;
  performanceMetrics.totalResponseTime += responseTime;

  if (responseTime > 1000) {
    performanceMetrics.slowRequests++;
  }

  if (res.statusCode >= 400) {
    performanceMetrics.errorRequests++;
  }

  // Track by endpoint
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  if (!performanceMetrics.requestsByEndpoint.has(endpoint)) {
    performanceMetrics.requestsByEndpoint.set(endpoint, {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      slowCount: 0,
      errorCount: 0
    });
  }

  const endpointMetrics = performanceMetrics.requestsByEndpoint.get(endpoint);
  endpointMetrics.count++;
  endpointMetrics.totalTime += responseTime;
  endpointMetrics.averageTime = Math.round(endpointMetrics.totalTime / endpointMetrics.count);

  if (responseTime > 1000) {
    endpointMetrics.slowCount++;
  }

  if (res.statusCode >= 400) {
    endpointMetrics.errorCount++;
  }

  // Track by HTTP method
  if (!performanceMetrics.requestsByMethod.has(req.method)) {
    performanceMetrics.requestsByMethod.set(req.method, {
      count: 0,
      totalTime: 0,
      averageTime: 0
    });
  }

  const methodMetrics = performanceMetrics.requestsByMethod.get(req.method);
  methodMetrics.count++;
  methodMetrics.totalTime += responseTime;
  methodMetrics.averageTime = Math.round(methodMetrics.totalTime / methodMetrics.count);
};

/**
 * Get current performance metrics
 */
const getMetrics = () => {
  const uptime = Date.now() - performanceMetrics.lastReset;
  const avgResponseTime = performanceMetrics.totalRequests > 0 
    ? Math.round(performanceMetrics.totalResponseTime / performanceMetrics.totalRequests) 
    : 0;

  return {
    timestamp: new Date().toISOString(),
    uptime: Math.round(uptime / 1000), // seconds
    requests: {
      total: performanceMetrics.totalRequests,
      slow: performanceMetrics.slowRequests,
      errors: performanceMetrics.errorRequests,
      averageResponseTime: avgResponseTime,
      requestsPerSecond: Math.round((performanceMetrics.totalRequests / uptime) * 1000)
    },
    endpoints: Object.fromEntries(
      Array.from(performanceMetrics.requestsByEndpoint.entries())
        .sort(([,a], [,b]) => b.count - a.count) // Sort by request count
        .slice(0, 10) // Top 10 endpoints
    ),
    methods: Object.fromEntries(performanceMetrics.requestsByMethod.entries()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
    },
    process: {
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      version: process.version
    }
  };
};

/**
 * Reset performance metrics
 */
const resetMetrics = () => {
  performanceMetrics.totalRequests = 0;
  performanceMetrics.totalResponseTime = 0;
  performanceMetrics.slowRequests = 0;
  performanceMetrics.errorRequests = 0;
  performanceMetrics.requestsByEndpoint.clear();
  performanceMetrics.requestsByMethod.clear();
  performanceMetrics.lastReset = Date.now();
};

/**
 * Performance monitoring endpoint middleware
 */
const metricsEndpoint = (req, res) => {
  res.json({
    success: true,
    metrics: getMetrics()
  });
};

/**
 * Performance reset endpoint middleware
 */
const resetEndpoint = (req, res) => {
  resetMetrics();
  res.json({
    success: true,
    message: 'Performance metrics reset successfully',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  performanceMonitor,
  getMetrics,
  resetMetrics,
  metricsEndpoint,
  resetEndpoint
};