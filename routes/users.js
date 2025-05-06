const express = require('express');
const {
  registerUser,
  loginUser,
  logoutUser,
  getMe,
  updateProfile,
  changePassword,
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} = require('../controllers/userController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/logout', logoutUser);

// Protected routes for all users
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/changepassword', protect, changePassword);

// Admin only routes
router.get('/', protect, authorize(userRoles.ADMIN), getUsers);
router.get('/:id', protect, authorize(userRoles.ADMIN), getUser);
router.post('/', protect, authorize(userRoles.ADMIN), createUser);
router.put('/:id', protect, authorize(userRoles.ADMIN), updateUser);
router.delete('/:id', protect, authorize(userRoles.ADMIN), deleteUser);
router.patch('/:id/toggle-status', protect, authorize(userRoles.ADMIN), toggleUserStatus);

module.exports = router;