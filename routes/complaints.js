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
  // Make sure these are imported correctly
  getMyAssignedComplaints,
  assignComplaintToStaff,
  searchComplaints,
  
} = require('../controllers/complaintController');

const { 
  getComplaintsByDepartment,
  getProblemTypes,
  getHousingProjects,
  getDashboardStats
} = require('../controllers/departmentController');


const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

// Public routes (no auth required)
router.get('/track/:complaintNo', trackComplaint);
router.post('/public-comment', addPublicComment);
router.post(
  '/search',
  searchComplaints
);

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
router.get('/', protect, getComplaints);    // Add protect middleware

// router.get('/', getComplaints);
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