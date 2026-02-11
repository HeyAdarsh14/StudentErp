const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initializeSocket } = require('./config/socket');
const config = require('./config/env');
const logger = require('./utils/logger');

// Connect to database
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start server
const PORT = config.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running in ${config.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 API: http://localhost:${PORT}/api`);
  logger.info(`❤️  Health: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  logger.error(err.stack);
  
  // Close server & exit process
  server.close(() => {
    logger.info('Server closed due to unhandled rejection');
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  
  // Exit process
  logger.info('Server shutting down due to uncaught exception');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = server;
