const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const morgan = require('morgan');

// Route files
const departmentRoutes = require('./routes/departments');
const userRoutes = require('./routes/users');
const fileRoutes = require('./routes/files');
const complaintRoutes = require('./routes/complaints');
const departmentStaffRoutes = require('./routes/departmentStaffRoutes');
const hodRoutes = require('./routes/hodRoutes');

// Error handler middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// // Enable CORS
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:3000',
//   credentials: true
// }));

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  credentials: false
}));
// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routers
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/hods', hodRoutes); // Add this before departmentStaffRoutes
app.use('/api/departments/:departmentId/staff', departmentStaffRoutes);


// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add error handler middleware
app.use(errorHandler);

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

module.exports = app;