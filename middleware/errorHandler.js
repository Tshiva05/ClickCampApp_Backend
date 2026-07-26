// middleware/errorHandler.js
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message } = err;

  // Mongoose validation errors -> 400 with field-level messages
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }




// Mongoose duplicate key error -> 409
if (err.code === 11000) {
  console.log("========== DUPLICATE KEY ==========");
  console.log("keyPattern:", err.keyPattern);
  console.log("keyValue:", err.keyValue);
  console.log("full error:", err);
  console.log("==================================");

  statusCode = 409;
  const field = Object.keys(err.keyPattern || {})[0] || "field";
  message = `A record with that ${field} already exists`;
}

  
  // Malformed ObjectId -> 400 instead of a raw 500
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  }

  statusCode = statusCode || 500;
  message = message || 'Internal server error';

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details,
    ...(process.env.NODE_ENV !== 'production' && statusCode >= 500 ? { stack: err.stack } : {})
  });
}

module.exports = { notFound, errorHandler };
