const errorHandler = (err, req, res, next) => {
    // Log error for server-side debugging
    console.error(err.stack);
  
    // Default error status and message
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || 'Server Error';
    let errors = [];
  
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      statusCode = 400;
      message = 'Validation Error';
      // Extract validation errors
      Object.keys(err.errors).forEach(key => {
        errors.push({
          field: key,
          message: err.errors[key].message
        });
      });
    }
  
    // Handle Mongoose duplicate key error
    if (err.code === 11000) {
      statusCode = 400;
      message = 'Duplicate field value';
      const field = Object.keys(err.keyValue)[0];
      errors.push({
        field,
        message: `Duplicate value entered for ${field}`
      });
    }
  
    // Handle Mongoose ObjectID errors
    if (err.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format';
      errors.push({
        field: err.path,
        message: `Invalid ${err.path}`
      });
    }
  
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    }
  
    // Handle JWT expiration
    if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    }
  
    // Send the error response
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(errors.length > 0 && { errors }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
  
  module.exports = errorHandler;