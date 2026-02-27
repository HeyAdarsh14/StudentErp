const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./config/socket');
const config = require('./config/env');
const logger = require('./utils/logger');

/**
 * Server initialization and configuration
 * Enhanced with robust error handling and graceful shutdown
 * @author College ERP Team
 * @version 3.0.0
 */

// Track server state
let isShuttingDown = false;
const activeConnections = new Set();

// Initialize database connection
async function initializeDatabase() {
  try {
    await connectDB();
    logger.info('✅ Database connection established successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Initialize database
initializeDatabase();

// Create HTTP server
const server = http.createServer(app);

// Track active connections for graceful shutdown
server.on('connection', (socket) => {
  activeConnections.add(socket);
  socket.on('close', () => {
    activeConnections.delete(socket);
  });
});

// Initialize Socket.IO
initializeSocket(server);

// Server configuration
const PORT = config.PORT || 5000;
const HOST = config.HOST || '0.0.0.0';

// Start server with enhanced logging
server.listen(PORT, HOST, () => {
  logger.info(`🚀 College ERP Server v${process.env.npm_package_version || '3.0.0'} started successfully`);
  logger.info(`🌍 Environment: ${config.NODE_ENV}`);
  logger.info(`📡 Server: http://${HOST}:${PORT}`);
  logger.info(`🔗 API Endpoint: http://${HOST}:${PORT}/api`);
  logger.info(`💚 Health Check: http://${HOST}:${PORT}/health`);
  logger.info(`📊 Metrics: http://${HOST}:${PORT}/metrics`);
  logger.info(`⚡ Socket.IO: Enabled and ready`);
  logger.info(`🔧 Process ID: ${process.pid}`);
  logger.info(`📝 Logs: ${config.LOG_LEVEL || 'info'} level`);
});

// Enhanced error handling with detailed logging
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🚨 Unhandled Promise Rejection detected');
  logger.error(`Reason: ${reason}`);
  logger.error(`Promise: ${promise}`);
  logger.error(`Stack: ${reason.stack}`);
  
  // Attempt graceful shutdown
  gracefulShutdown('unhandled_rejection', 1);
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception detected');
  logger.error(`Error: ${error.message}`);
  logger.error(`Stack: ${error.stack}`);
  logger.error(`Process: ${process.pid}`);
  
  // Force exit for uncaught exceptions
  logger.error('🔴 Force shutting down due to uncaught exception');
  process.exit(1);
});

// Enhanced graceful shutdown function
function gracefulShutdown(signal, exitCode = 0) {
  if (isShuttingDown) {
    logger.warn('⚠️  Shutdown already in progress, forcing exit...');
    process.exit(exitCode);
    return;
  }
  
  isShuttingDown = true;
  logger.info(`📴 Graceful shutdown initiated by ${signal}`);
  
  // Set shutdown timeout
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('❌ Forced shutdown due to timeout');
    process.exit(1);
  }, 30000); // 30 seconds timeout
  
  // Stop accepting new connections
  server.close((err) => {
    if (err) {
      logger.error('❌ Error during server close:', err.message);
      process.exit(1);
      return;
    }
    
    logger.info('✅ HTTP server closed successfully');
    
    // Close all active connections
    activeConnections.forEach(socket => {
      socket.destroy();
    });
    
    logger.info('✅ All connections closed');
    
    // Clear the force shutdown timeout
    clearTimeout(forceShutdownTimeout);
    
    logger.info('👋 Process terminated gracefully');
    process.exit(exitCode);
  });
}

// Signal handlers for graceful shutdown
process.on('SIGTERM', () => {
  logger.info('📡 SIGTERM signal received (Docker/K8s shutdown)');
  gracefulShutdown('SIGTERM', 0);
});

process.on('SIGINT', () => {
  logger.info('⌨️  SIGINT signal received (Ctrl+C)');
  gracefulShutdown('SIGINT', 0);
});

// Additional process monitoring
process.on('SIGUSR1', () => {
  logger.info('📊 SIGUSR1 received - Process status:');
  logger.info(`📈 Memory usage: ${JSON.stringify(process.memoryUsage(), null, 2)}`);
  logger.info(`⏱️  Uptime: ${process.uptime()} seconds`);
  logger.info(`🔌 Active connections: ${activeConnections.size}`);
});

// Log process warnings
process.on('warning', (warning) => {
  logger.warn('⚠️  Process warning:', {
    name: warning.name,
    message: warning.message,
    stack: warning.stack
  });
});

module.exports = server;
