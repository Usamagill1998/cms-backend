const express = require('express');
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
  getDepartmentStats
} = require('../controllers/departmentController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

// Public routes
router.get('/', getDepartments);
router.get('/:id', getDepartment);

// Protected admin-only routes
router.post('/', createDepartment);
router.put('/:id', protect, authorize(userRoles.ADMIN), updateDepartment);
router.delete('/:id', protect, authorize(userRoles.ADMIN), deleteDepartment);
router.patch('/:id/toggle-status', protect, authorize(userRoles.ADMIN), toggleDepartmentStatus);
// Add this route to your existing departmentRoutes.js
router.get(
  '/:id/stats',
  protect,
  authorize(userRoles.ADMIN, userRoles.HOD),
  getDepartmentStats
);

module.exports = router;