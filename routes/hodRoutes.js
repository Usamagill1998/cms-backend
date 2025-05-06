const express = require('express');
const {
  createHOD,
  getAllHODs
} = require('../controllers/hodController');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { userRoles } = require('../config/config');

// Only Admin can manage HODs
router.use(protect);
router.use(authorize(userRoles.ADMIN));

router.route('/')
  .get(getAllHODs)
  .post(createHOD);

module.exports = router;