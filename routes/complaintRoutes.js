const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus,
  assignComplaint,
  addComment,
  getComplaintStats,
  trackComplaint,
  addPublicComment,
  // Add these new controller functions
  getMyAssignedComplaints,
  assignComplaintToStaff,
  getComplaintsByDepartment,
  getProblemTypes,
  getHousingProjects,
  getDashboardStats,
  // Add search complaints function
  searchComplaints
} = require('../controllers/complaintController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

router.post(
  '/search',
  searchComplaints
);
// Public routes (no auth required)
router.get('/track/:complaintNo', trackComplaint);
router.post('/public-comment', addPublicComment);

// IMPORTANT: Place all specific routes before routes with ID parameters
// Search route - must be defined BEFORE the /:id route

// Routes that need to be defined before /:id routes to avoid conflicts
router.get(
  '/my-assigned',
  protect,
  authorize(userRoles.STAFF, userRoles.HOD),
  getMyAssignedComplaints
);

router.get(
  '/problem-types',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  getProblemTypes
);

router.get(
  '/housing-projects',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  getHousingProjects
);

router.get(
  '/dashboard',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  getDashboardStats
);

router.get(
  '/department/:departmentId',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  getComplaintsByDepartment
);

router.get(
  '/stats',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  getComplaintStats
);

// Protected routes for all users
router.post('/', createComplaint);
router.get('/', getComplaints);

// IMPORTANT: These routes with ID parameters must come AFTER all specific routes
router.get('/:id', protect, getComplaint);
router.post('/:id/comments', protect, addComment);

// Admin, HOD and staff routes
router.patch(
  '/:id/status',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD, userRoles.STAFF),
  updateComplaintStatus
);

// Admin only routes
router.patch(
  '/:id/assign',
  protect,
  authorize(userRoles.ADMIN),
  assignComplaint
);

// Admin and HOD routes
router.patch(
  '/:id/assign-staff',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD),
  assignComplaintToStaff
);

module.exports = router;