const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Department = require('../models/Department');
const config = require('../config/config');

// Create HOD (admin only)
// Create HOD (admin only)
exports.createHOD = asyncHandler(async (req, res) => {
  const { name, email, phone, departmentId } = req.body;

  // Check if department exists
  const department = await Department.findById(departmentId);
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  // Check if email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Email already in use'
    });
  }
  
  // Check if department already has an HOD
  const existingHOD = await User.findOne({ 
    assignedDepartment: departmentId,
    role: config.userRoles.HOD 
  });
  
  if (existingHOD) {
    return res.status(400).json({
      success: false,
      error: 'Department already has an HOD assigned'
    });
  }
  
  // Generate a random password
  const password = Math.random().toString(36).slice(-8);
  
  // Create the HOD
  const hod = await User.create({
    name,
    email,
    phone,
    password,
    role: config.userRoles.HOD,
    assignedDepartment: departmentId
  });
  
  // Send WhatsApp notification if phone is provided
  if (phone) {
    // Import twilio service
    const twilioService = require('../utils/twilioService');
    
    // Send credential message
    twilioService.sendUserCredentialsMessage(
      phone, 
      name, 
      department.name, 
      email, 
      password, 
      'hod'
    ).catch(err => console.error('WhatsApp notification failed:', err));
  }
  
  res.status(201).json({
    success: true,
    data: {
      ...hod.toObject(),
      tempPassword: password
    }
  });
});
// Get all HODs
exports.getAllHODs = asyncHandler(async (req, res) => {
  const hods = await User.find({ role: config.userRoles.HOD })
    .populate('assignedDepartment', 'name type');
  
  res.status(200).json({
    success: true,
    count: hods.length,
    data: hods
  });
});