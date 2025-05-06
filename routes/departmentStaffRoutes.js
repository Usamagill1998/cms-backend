const express = require('express');
const {
  getDepartmentStaff,
  createDepartmentStaff,
  removeStaff
} = require('../controllers/departmentStaffController');

const router = express.Router({ mergeParams: true });

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

router.use(protect);

// Both HOD and Admin can get and create staff
router.route('/')
  .get(authorize(userRoles.ADMIN, userRoles.HOD), getDepartmentStaff)
  .post(authorize(userRoles.ADMIN, userRoles.HOD), createDepartmentStaff);

// Both HOD and Admin can remove staff
router.route('/:staffId')
  .delete(authorize(userRoles.ADMIN, userRoles.HOD), removeStaff);

module.exports = router;