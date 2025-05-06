const express = require('express');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Department = require('../models/Department');
const config = require('../config/config');

// Get all staff for a department
exports.getDepartmentStaff = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  
  // Find all staff assigned to this department
  const staff = await User.find({ 
    assignedDepartment: departmentId,
    role: config.userRoles.STAFF
  });

  res.status(200).json({
    success: true,
    count: staff.length,
    data: staff
  });
});

// Create staff for a department (HOD can do this)
// Create staff for a department (HOD can do this)
exports.createDepartmentStaff = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const { name, email, phone } = req.body;
  
  // Check if the HOD belongs to this department
  if (req.user.role === config.userRoles.HOD) {
    if (req.user.assignedDepartment.toString() !== departmentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only add staff to your own department'
      });
    }
  }
  
  // Check if email exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      error: 'Email already in use'
    });
  }
  
  // Generate a random password
  const password = Math.random().toString(36).slice(-8);
  
  // Create the staff member
  const staff = await User.create({
    name,
    email,
    phone,
    password,
    role: config.userRoles.STAFF,
    assignedDepartment: departmentId
  });
  
  // Get department info for the notification
  const department = await Department.findById(departmentId);
  
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
      'staff'
    ).catch(err => console.error('WhatsApp notification failed:', err));
  }
  
  res.status(201).json({
    success: true,
    data: {
      ...staff.toObject(),
      tempPassword: password
    }
  });
});
// Remove staff from department
exports.removeStaff = asyncHandler(async (req, res) => {
  const { departmentId, staffId } = req.params;
  
  // If HOD, verify they belong to this department
  if (req.user.role === config.userRoles.HOD) {
    if (req.user.assignedDepartment.toString() !== departmentId) {
      return res.status(403).json({
        success: false,
        error: 'You can only manage staff in your own department'
      });
    }
  }
  
  // Find the staff member
  const staff = await User.findById(staffId);
  
  if (!staff) {
    return res.status(404).json({
      success: false,
      error: 'Staff member not found'
    });
  }
  
  // Check if staff belongs to this department
  if (staff.assignedDepartment.toString() !== departmentId) {
    return res.status(400).json({
      success: false,
      error: 'Staff does not belong to this department'
    });
  }
  
  await User.findByIdAndDelete(staffId);
  
  res.status(200).json({
    success: true,
    data: {}
  });
});