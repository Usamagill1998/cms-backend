const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Department = require('../models/Department');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const config = require('../config/config');


/**
 * @desc    Create a new department
 * @route   POST /api/departments
 * @access  Private/Admin
 */
exports.createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  
  res.status(201).json({
    success: true,
    data: department
  });
});

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Public
 */
exports.getDepartments = asyncHandler(async (req, res) => {
  // Add filtering options
  const filter = {};
  
  // Filter by type if provided
  if (req.query.type) {
    filter.type = req.query.type;
  }
  
  // Only show active departments by default, unless explicitly requested
  if (req.query.showInactive !== 'true') {
    filter.isActive = true;
  }
  
  const departments = await Department.find(filter);
  
  res.status(200).json({
    success: true,
    count: departments.length,
    data: departments
  });
});

/**
 * @desc    Get a single department
 * @route   GET /api/departments/:id
 * @access  Public
 */
exports.getDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: department
  });
});

/**
 * @desc    Update a department
 * @route   PUT /api/departments/:id
 * @access  Private/Admin
 */
exports.updateDepartment = asyncHandler(async (req, res) => {
  let department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  department = await Department.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: department
  });
});

/**
 * @desc    Delete a department
 * @route   DELETE /api/departments/:id
 * @access  Private/Admin
 */
exports.deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  await department.remove();
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Toggle department active status
 * @route   PATCH /api/departments/:id/toggle-status
 * @access  Private/Admin
 */
exports.toggleDepartmentStatus = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  // Toggle the isActive field
  department.isActive = !department.isActive;
  await department.save();
  
  res.status(200).json({
    success: true,
    data: department
  });
});


// Get department stats
exports.getDepartmentStats = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Verify department exists
  const department = await Department.findById(id);
  if (!department) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }
  
  // If HOD, only allow access to their department
  if (req.user.role === config.userRoles.HOD && 
      req.user.assignedDepartment.toString() !== id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this department'
    });
  }
  
  // Get complaint counts by status
  const statusStats = await Complaint.aggregate([
    { $match: { department: mongoose.Types.ObjectId(id) } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Get total complaints
  const totalComplaints = await Complaint.countDocuments({
    department: id
  });
  
  // Get staff counts
  const staffCount = await User.countDocuments({
    assignedDepartment: id,
    role: config.userRoles.STAFF,
    isActive: true
  });
  
  const hodCount = await User.countDocuments({
    assignedDepartment: id,
    role: config.userRoles.HOD,
    isActive: true
  });
  
  res.status(200).json({
    success: true,
    data: {
      department: {
        id: department._id,
        name: department.name,
        type: department.type,
        isActive: department.isActive
      },
      totalComplaints,
      statusStats: statusStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      staffStats: {
        totalStaff: staffCount + hodCount,
        hods: hodCount,
        staff: staffCount
      }
    }
  });
});


// Get complaints by department with advanced filtering
exports.getComplaintsByDepartment = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  
  // Build query
  let query = { department: departmentId };
  
  // Additional filters
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Filter by problem type
  if (req.query.problemType) {
    query['propertyInfo.problemType'] = req.query.problemType;
  }
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    query.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  // Filter by property type
  if (req.query.propertyType) {
    query['propertyInfo.propertyType'] = req.query.propertyType;
  }
  
  // Filter by housing project
  if (req.query.housingProject) {
    query['propertyInfo.housingProject'] = req.query.housingProject;
  }
  
  // If HOD or staff, only show complaints from their department
  if (req.user.role === config.userRoles.HOD || req.user.role === config.userRoles.STAFF) {
    if (req.user.assignedDepartment.toString() !== departmentId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access complaints from this department'
      });
    }
  }
  
  // Sorting
  const sortBy = req.query.sort || '-createdAt';
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  // Execute query with pagination
  const total = await Complaint.countDocuments(query);
  const complaints = await Complaint.find(query)
    .sort(sortBy)
    .skip(startIndex)
    .limit(limit)
    .populate([
      { path: 'department', select: 'name nameUrdu type' },
      { path: 'user', select: 'name email' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'comments.user', select: 'name email role' }
    ]);
  
  // Pagination result
  const pagination = {};
  
  if (startIndex + complaints.length < total) {
    pagination.next = {
      page: page + 1,
      limit
    };
  }
  
  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit
    };
  }
  
  res.status(200).json({
    success: true,
    count: complaints.length,
    pagination,
    total,
    data: complaints
  });
});

// Get unique problem types for filtering
exports.getProblemTypes = asyncHandler(async (req, res) => {
  // Filter by department if provided
  let match = {};
  if (req.query.department) {
    match.department = mongoose.Types.ObjectId(req.query.department);
  }
  
  // If user is HOD or staff, only show data from their department
  if (req.user.role === config.userRoles.HOD || req.user.role === config.userRoles.STAFF) {
    if (req.user.assignedDepartment) {
      match.department = mongoose.Types.ObjectId(req.user.assignedDepartment);
    }
  }
  
  const problemTypes = await Complaint.aggregate([
    { $match: match },
    { $group: { _id: '$propertyInfo.problemType' } },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    count: problemTypes.length,
    data: problemTypes.map(item => item._id).filter(Boolean)
  });
});

// Get unique housing projects for filtering
exports.getHousingProjects = asyncHandler(async (req, res) => {
  // Filter by department if provided
  let match = {};
  if (req.query.department) {
    match.department = mongoose.Types.ObjectId(req.query.department);
  }
  
  // If user is HOD or staff, only show data from their department
  if (req.user.role === config.userRoles.HOD || req.user.role === config.userRoles.STAFF) {
    if (req.user.assignedDepartment) {
      match.department = mongoose.Types.ObjectId(req.user.assignedDepartment);
    }
  }
  
  const housingProjects = await Complaint.aggregate([
    { $match: match },
    { $group: { _id: '$propertyInfo.housingProject' } },
    { $sort: { _id: 1 } }
  ]);
  
  res.status(200).json({
    success: true,
    count: housingProjects.length,
    data: housingProjects.map(item => item._id).filter(Boolean)
  });
});

// Get dashboard stats
exports.getDashboardStats = asyncHandler(async (req, res) => {
  let matchStage = {};
  
  // Filter by department if provided
  if (req.query.department) {
    matchStage.department = mongoose.Types.ObjectId(req.query.department);
  }
  
  // If user is HOD or staff, only show data from their department
  if (req.user.role === config.userRoles.HOD || req.user.role === config.userRoles.STAFF) {
    if (req.user.assignedDepartment) {
      matchStage.department = mongoose.Types.ObjectId(req.user.assignedDepartment);
    } else {
      // If HOD/staff not assigned to department, return empty stats
      return res.status(200).json({
        success: true,
        data: {
          totalComplaints: 0,
          statusCounts: {},
          timeBasedStats: {},
          recentComplaints: []
        }
      });
    }
  }
  
  // Filter by date range
  if (req.query.startDate && req.query.endDate) {
    matchStage.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  // Status counts
  const statusCounts = await Complaint.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  
  // Total complaint count
  const totalComplaints = await Complaint.countDocuments(matchStage);
  
  // Time-based statistics (today, this week, this month)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const timeBasedStats = {
    today: await Complaint.countDocuments({
      ...matchStage,
      createdAt: { $gte: today }
    }),
    thisWeek: await Complaint.countDocuments({
      ...matchStage,
      createdAt: { $gte: thisWeekStart }
    }),
    thisMonth: await Complaint.countDocuments({
      ...matchStage,
      createdAt: { $gte: thisMonthStart }
    })
  };
  
  // Problem type distribution
  const problemTypeStats = await Complaint.aggregate([
    { $match: matchStage },
    { $group: { _id: '$propertyInfo.problemType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);
  
  // Recent complaints
  const recentComplaints = await Complaint.find(matchStage)
    .sort('-createdAt')
    .limit(5)
    .populate([
      { path: 'department', select: 'name' },
      { path: 'assignedTo', select: 'name' }
    ]);
  
  res.status(200).json({
    success: true,
    data: {
      totalComplaints,
      statusCounts: Object.fromEntries(statusCounts.map(item => [item._id, item.count])),
      timeBasedStats,
      problemTypeStats,
      recentComplaints
    }
  });
});