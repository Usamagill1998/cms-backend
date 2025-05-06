const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const File = require('../models/File');
const config = require('../config/config');
const User = require('../models/User');

// At the top of your complaintController.js file
const twilioService = require('../utils/twilioService');

const { userRoles } = config; // Make sure this is correct
/**
 * @desc    Create a new complaint
 * @route   POST /api/complaints
 * @access  Private
 */
exports.createComplaint = asyncHandler(async (req, res) => {
  const { department, personalInfo, propertyInfo, documents } = req.body;

  // Verify that department exists
  const departmentExists = await Department.findById(department);
  if (!departmentExists) {
    return res.status(404).json({
      success: false,
      error: 'Department not found'
    });
  }

  // Verify that department is active
  if (!departmentExists.isActive) {
    return res.status(400).json({
      success: false,
      error: 'Department is not active'
    });
  }

  // Verify that documents exist in the database if document IDs are provided
  if (documents) {
    const documentIds = Object.values(documents).filter(id => id);
    
    if (documentIds.length > 0) {
      const fileCount = await File.countDocuments({
        _id: { $in: documentIds },
        uploadedBy: req?.user?.id || null
      });
      
      if (fileCount !== documentIds.length) {
        return res.status(400).json({
          success: false,
          error: 'One or more document IDs are invalid or do not belong to you'
        });
      }
    }
  }

  // Create complaint
  const complaint = await Complaint.create({
    department,
    user: req?.user?.id || null,
    personalInfo,
    propertyInfo,
    documents,
    // Add initial comment as system message
    comments: [
      {
        text: 'Complaint received and registered',
        user: req?.user?.id || null,
        isInternal: false
      }
    ]
  });

  // Update files with the complaint ID
  if (documents && Object.values(documents).length > 0) {
    for (const [fileType, fileId] of Object.entries(documents)) {
      if (fileId) {
        await File.findByIdAndUpdate(fileId, { complaintId: complaint._id });
      }
    }
  }

  
  // In the createComplaint function, replace the existing WhatsApp notification code with:
if (personalInfo.whatsappNo) {
  // Create content variables for the template
  const contentVars = {
    '1': personalInfo.fullName,                   // Customer name
    '2': complaint.complaintNo || complaint._id,  // Complaint number
    '3': departmentExists.name,                   // Department name
    '4': propertyInfo.problemType,                // Issue/problem type
    '5': complaint.status,                        // Status
    '6': departmentExists.name                    // Department name again for signature
  };
  
  // Message text (as fallback)
  const message = `
Dear ${personalInfo.fullName},

Your complaint has been successfully registered with Complaint Number: ${complaint.complaintNo || complaint._id}

Department: ${departmentExists.name}
Issue: ${propertyInfo.problemType}
Status: ${complaint.status}
You can track your complaint status using the complaint number.

Thank you,
${departmentExists.name} Support Team
Jamaat e Islami Lahore
  `;
  
  // Send the message with dynamic content variables
  twilioService.sendWhatsAppMessage(personalInfo.whatsappNo, message.trim(), contentVars)
    .catch(err => console.error('WhatsApp notification failed:', err));
}

  res.status(201).json({
    success: true,
    data: complaint
  });
});

/**
 * @desc    Get all complaints
 * @route   GET /api/complaints
 * @access  Private
 */
exports.getComplaints = asyncHandler(async (req, res) => {
  let query;
console.log(req.user);

  // If user is not admin or staff, only show their complaints
  if (req.user.role === config.userRoles.USER) {
    query = Complaint.find({ user: req.user.id });
  } else {
    // Build query for admin/staff
    let queryObj = {};
    
    // Filter by department
    if (req.query.department) {
      queryObj.department = req.query.department;
    }
    
    // Filter by status
    if (req.query.status) {
      queryObj.status = req.query.status;
    }
    
    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      queryObj.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    // Filter by assigned staff
    if (req.query.assignedTo) {
      if (req.query.assignedTo === 'unassigned') {
        queryObj.assignedTo = { $exists: false };
      } else {
        queryObj.assignedTo = req.query.assignedTo;
      }
    }
    
    query = Complaint.find(queryObj);
  }

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort results
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt'); // Default sort by newest first
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Complaint.countDocuments(query.getQuery());

  query = query.skip(startIndex).limit(limit);

  // Populate references
  query = query.populate([
    { path: 'department', select: 'name nameUrdu type' },
    { path: 'user', select: 'name email' },
    { path: 'assignedTo', select: 'name email' },
    { 
      path: 'comments.user', 
      select: 'name email role' 
    }
  ]);

  // Execute query
  const complaints = await query;

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
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

/**
 * @desc    Get single complaint
 * @route   GET /api/complaints/:id
 * @access  Private
 */
exports.getComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate([
      { path: 'department', select: 'name nameUrdu type' },
      { path: 'user', select: 'name email phone' },
      { path: 'assignedTo', select: 'name email' },
      { 
        path: 'comments.user', 
        select: 'name email role' 
      }
    ]);

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Check if user has access to this complaint
  if (
    req.user.role === config.userRoles.USER && 
    complaint.user._id.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this complaint'
    });
  }

  res.status(200).json({
    success: true,
    data: complaint
  });
});

/**
 * @desc    Update complaint status
 * @route   PATCH /api/complaints/:id/status
 * @access  Private/Admin,Staff
 */
exports.updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Validate status
  if (!Object.values(config.complaintStatus).includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status'
    });
  }

  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Update status
  complaint.status = status;
  
  // If status is resolved, update resolution details
  if (status === config.complaintStatus.RESOLVED) {
    complaint.resolution = {
      resolvedBy: req.user.id,
      resolvedAt: Date.now(),
      resolutionSummary: req.body.resolutionSummary || 'Complaint resolved'
    };
    
    // Add comment about resolution
    complaint.comments.push({
      user: req.user.id,
      text: req.body.resolutionSummary || 'Complaint has been resolved',
      isInternal: false
    });
  }
  
  await complaint.save();

  res.status(200).json({
    success: true,
    data: complaint
  });
});

/**
 * @desc    Assign complaint to staff
 * @route   PATCH /api/complaints/:id/assign
 * @access  Private/Admin
 */
exports.assignComplaint = asyncHandler(async (req, res) => {
  const { staffId } = req.body;

  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Update assigned staff
  complaint.assignedTo = staffId || null;
  
  // Add comment about assignment
  if (staffId) {
    complaint.comments.push({
      user: req.user.id,
      text: `Complaint assigned to staff member`,
      isInternal: true
    });
  } else {
    complaint.comments.push({
      user: req.user.id,
      text: `Complaint unassigned`,
      isInternal: true
    });
  }
  
  await complaint.save();

  res.status(200).json({
    success: true,
    data: complaint
  });
});

/**
 * @desc    Add comment to complaint
 * @route   POST /api/complaints/:id/comments
 * @access  Private
 */
exports.addComment = asyncHandler(async (req, res) => {
  const { text, isInternal = false } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }

  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Check if user has access to add comment
  if (
    req.user.role === config.userRoles.USER && 
    complaint.user.toString() !== req.user.id
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to comment on this complaint'
    });
  }

  // Regular users can't add internal comments
  if (req.user.role === config.userRoles.USER && isInternal) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to add internal comments'
    });
  }

  // Add comment
  complaint.comments.push({
    user: req.user.id,
    text,
    isInternal
  });
  
  await complaint.save();

  // Populate user details for the new comment
  const populatedComplaint = await Complaint.findById(complaint._id)
    .populate({
      path: 'comments.user',
      select: 'name email role',
      match: { _id: req.user.id }
    });

  // Get the newly added comment
  const newComment = populatedComplaint.comments[populatedComplaint.comments.length - 1];

  res.status(200).json({
    success: true,
    data: newComment
  });
});

/**
 * @desc    Get complaint statistics
 * @route   GET /api/complaints/stats
 * @access  Private/Admin,Staff
 */
exports.getComplaintStats = asyncHandler(async (req, res) => {
  let matchStage = {};
  
  // If user is staff, only count their assigned complaints
  if (req.user.role === config.userRoles.STAFF) {
    matchStage.assignedTo = mongoose.Types.ObjectId(req.user.id);
  }
  
  // Filter by department if provided
  if (req.query.department) {
    matchStage.department = mongoose.Types.ObjectId(req.query.department);
  }
  
  // Filter by date range if provided
  if (req.query.startDate && req.query.endDate) {
    matchStage.createdAt = {
      $gte: new Date(req.query.startDate),
      $lte: new Date(req.query.endDate)
    };
  }
  
  // Status statistics
  const statusStats = await Complaint.aggregate([
    { $match: matchStage },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  // Department statistics
  const departmentStats = await Complaint.aggregate([
    { $match: matchStage },
    { 
      $lookup: {
        from: 'departments',
        localField: 'department',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    { $unwind: '$departmentInfo' },
    { 
      $group: { 
        _id: '$department', 
        name: { $first: '$departmentInfo.name' },
        count: { $sum: 1 } 
      } 
    },
    { $sort: { count: -1 } }
  ]);
  
  // Monthly trend
  const monthlyTrend = await Complaint.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);
  
  // Format monthly trend data
  const formattedMonthlyTrend = monthlyTrend.map(item => ({
    period: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
    count: item.count
  }));
  
  // Total counts
  const totalComplaints = await Complaint.countDocuments(matchStage);
  const resolvedComplaints = await Complaint.countDocuments({
    ...matchStage,
    status: config.complaintStatus.RESOLVED
  });
  const pendingComplaints = await Complaint.countDocuments({
    ...matchStage,
    status: config.complaintStatus.PENDING
  });
  const inProgressComplaints = await Complaint.countDocuments({
    ...matchStage,
    status: config.complaintStatus.IN_PROGRESS
  });
  
  res.status(200).json({
    success: true,
    data: {
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      inProgressComplaints,
      statusStats,
      departmentStats,
      monthlyTrend: formattedMonthlyTrend
    }
  });
});



// Add these two functions to your existing complaintController.js file

/**
 * @desc    Track a complaint by its complaint number (public endpoint)
 * @route   GET /api/complaints/track/:complaintNo
 * @access  Public
 */
exports.trackComplaint = asyncHandler(async (req, res) => {
  const { complaintNo } = req.params;
  
  // Find the complaint by its unique complaint number
  const complaint = await Complaint.findOne({ complaintNo })
    .populate('department', 'name nameUrdu type');

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Filter out internal comments for public view
  const filteredComments = complaint.comments.filter(comment => !comment.isInternal);
  
  // Create a public-safe version of the complaint
  const publicData = {
    id: complaint.complaintNo,
    status: complaint.status,
    date: complaint.createdAt,
    projectName: complaint.propertyInfo.housingProject,
    propertyType: complaint.propertyInfo.propertyType,
    issue: complaint.propertyInfo.problemType,
    lastUpdate: complaint.updatedAt,
    comments: filteredComments.map(c => ({
      date: c.createdAt,
      text: c.text,
      author: c.user ? 'Staff' : 'System'
    }))
  };

  res.status(200).json({
    success: true,
    data: publicData
  });
});

/**
 * @desc    Add public comment to complaint
 * @route   POST /api/complaints/public-comment
 * @access  Public
 */
exports.addPublicComment = asyncHandler(async (req, res) => {
  const { complaintNo, text } = req.body;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Comment text is required'
    });
  }

  // Find the complaint by complaint number
  let complaint = await Complaint.findOne({ complaintNo });

  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }

  // Add comment as a public comment (from complainant)
  const newComment = {
    user: null, // No user ID since this is a public endpoint
    text,
    isInternal: false,
    createdAt: Date.now()
  };
  
  complaint.comments.push(newComment);
  await complaint.save();

  // If complaint was resolved, change status to in-progress
  if (complaint.status === config.complaintStatus.RESOLVED) {
    complaint.status = config.complaintStatus.IN_PROGRESS;
    await complaint.save();
  }

  // Return the newly added comment
  res.status(200).json({
    success: true,
    data: {
      date: newComment.createdAt,
      text: newComment.text,
      author: 'Complainant'
    }
  });
});



// Get complaints assigned to logged-in staff
exports.getMyAssignedComplaints = asyncHandler(async (req, res) => {
  // Only for staff and HOD
  if (![config.userRoles.STAFF, config.userRoles.HOD].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized'
    });
  }
  
  // Build query
  let query = { assignedTo: req.user.id };
  
  // Filter by status
  if (req.query.status) {
    query.status = req.query.status;
  }
  
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const startIndex = (page - 1) * limit;
  
  const total = await Complaint.countDocuments(query);
  
  // Execute query
  const complaints = await Complaint.find(query)
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit)
    .populate([
      { path: 'department', select: 'name' },
      { path: 'assignedTo', select: 'name' }
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

// Assign complaint to staff member
exports.assignComplaintToStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { staffId } = req.body;
  
  // Find complaint
  const complaint = await Complaint.findById(id);
  
  if (!complaint) {
    return res.status(404).json({
      success: false,
      error: 'Complaint not found'
    });
  }
  
  // If HOD, verify they belong to the department
  if (req.user.role === config.userRoles.HOD) {
    if (req.user.assignedDepartment.toString() !== complaint.department.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only assign complaints from your department'
      });
    }
  }
  
  // Verify staff exists and belongs to correct department
  const staff = await User.findById(staffId);
  
  if (!staff) {
    return res.status(404).json({
      success: false,
      error: 'Staff member not found'
    });
  }
  
  if (staff.assignedDepartment.toString() !== complaint.department.toString()) {
    return res.status(400).json({
      success: false,
      error: 'Staff does not belong to this complaint\'s department'
    });
  }
  
  // Update complaint
  complaint.assignedTo = staffId;
  complaint.comments.push({
    user: req.user.id,
    text: `Complaint assigned to ${staff.name}`,
    isInternal: true
  });
  
  await complaint.save();
  
  res.status(200).json({
    success: true,
    data: complaint
  });
});

/**
 * @desc    Search complaints
 * @route   GET /api/complaints/search
 * @access  Private
 */
/**
 * @desc    Search complaints
 * @route   POST /api/complaints/search
 * @access  Public
 */
exports.searchComplaints = asyncHandler(async (req, res) => {
  console.log('Search request received:', req.body);
  
  const { searchBy, searchTerm } = req.body;
  
  if (!searchBy || !searchTerm) {
    return res.status(400).json({
      success: false,
      error: 'Search parameters are required'
    });
  }

  let query = {};
  
  // Build query based on search type
  switch (searchBy) {
    case 'complaintNo':
      // Exact match for complaint number
      query.complaintNo = searchTerm;
      break;
    case 'complainantName':
      // Case insensitive search for complainant name
      query['personalInfo.fullName'] = { $regex: searchTerm, $options: 'i' };
      break;
    case 'housingProject':
      // Case insensitive search for housing project
      query['propertyInfo.housingProject'] = { $regex: searchTerm, $options: 'i' };
      break;
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid search parameter'
      });
  }

  console.log('Search query:', JSON.stringify(query));
  
  try {
    const complaints = await Complaint.find(query)
      .populate([
        { path: 'department', select: 'name nameUrdu type' },
        { path: 'user', select: 'name email' },
        { path: 'assignedTo', select: 'name email' }
      ])
      .sort('-createdAt')
      .limit(50);

    console.log(`Found ${complaints.length} complaints`);
    
    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error during search operation',
      details: error.message
    });
  }
});