/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON responses
 */
const logger = require("../utils/logger");

const errorHandler = (err, req, res, _next) => {
  // Log the error
  logger.error(`${req.method} ${req.originalUrl}`, err.message);

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build error response
  const response = {
    success: false,
    error: {
      message: err.message || "Internal Server Error",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
    statusCode,
  };

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
