const asyncHandler = require('express-async-handler');
const File = require('../models/File');
const { uploadFileToS3, deleteFileFromS3, getPresignedUrl } = require('../utils/s3Service');

/**
 * @desc    Upload a single file
 * @route   POST /api/files/upload
 * @access  Private
 */
exports.uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'Please upload a file'
    });
  }

  // Get file type from request body
  const { fileType, complaintId } = req.body;

  // Validate file type
  if (!fileType) {
    return res.status(400).json({
      success: false,
      error: 'Please specify a file type'
    });
  }

  try {
    // Upload file to S3
    const s3FileData = await uploadFileToS3(req.file, fileType, );

    // Save file data to database
    const fileData = {
      ...s3FileData,
      // uploadedBy: req?.user?.id || null,
      complaintId: complaintId || null
    };

    const file = await File.create(fileData);

    res.status(201).json({
      success: true,
      data: file
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      error: 'File upload failed'
    });
  }
});

/**
 * @desc    Upload multiple files
 * @route   POST /api/files/upload-multiple
 * @access  Private
 */
exports.uploadMultipleFiles = asyncHandler(async (req, res) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Please upload at least one file'
    });
  }

  const { complaintId } = req.body;
  const uploadedFiles = [];
  const errors = [];

  // Process each file type and upload
  for (const [fieldName, files] of Object.entries(req.files)) {
    const file = files[0]; // Get the first file from the array
    const fileType = fieldName; // Use fieldName as fileType (e.g., idCard, registrationFile)

    try {
      // Upload file to S3
      const s3FileData = await uploadFileToS3(file, fileType, req.user.id);

      // Save file data to database
      const fileData = {
        ...s3FileData,
        uploadedBy: req.user.id,
        complaintId: complaintId || null
      };

      const savedFile = await File.create(fileData);
      uploadedFiles.push(savedFile);
    } catch (error) {
      console.error(`Error uploading ${fieldName}:`, error);
      errors.push({
        fieldName,
        error: error.message
      });
    }
  }

  // If there were errors but some files uploaded successfully
  if (errors.length > 0 && uploadedFiles.length > 0) {
    return res.status(207).json({
      success: true,
      message: 'Some files were uploaded successfully, but others failed',
      data: {
        uploadedFiles,
        errors
      }
    });
  }

  // If all files failed to upload
  if (errors.length > 0 && uploadedFiles.length === 0) {
    return res.status(500).json({
      success: false,
      error: 'All file uploads failed',
      errors
    });
  }

  // If all files uploaded successfully
  res.status(201).json({
    success: true,
    count: uploadedFiles.length,
    data: uploadedFiles
  });
});

/**
 * @desc    Get file by ID
 * @route   GET /api/files/:id
 * @access  Private
 */
exports.getFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  // Check if user has access to this file
  // Admin can access any file, user can only access their own files
  if (req.user.role !== 'admin' && file.uploadedBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to access this file'
    });
  }

  // Generate a fresh signed URL
  const signedUrl = await getPresignedUrl(file.s3Key);
  
  // Return file with updated signed URL
  res.status(200).json({
    success: true,
    data: {
      ...file.toObject(),
      s3Url: signedUrl
    }
  });
});

/**
 * @desc    Delete file
 * @route   DELETE /api/files/:id
 * @access  Private
 */
exports.deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: 'File not found'
    });
  }

  // Check if user has access to delete this file
  // Admin can delete any file, user can only delete their own files
  if (req.user.role !== 'admin' && file.uploadedBy.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this file'
    });
  }

  try {
    // Delete from S3
    await deleteFileFromS3(file.s3Key);
    
    // Delete from database
    await file.remove();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'File deletion failed'
    });
  }
});

/**
 * @desc    Get files by complaint ID
 * @route   GET /api/files/complaint/:complaintId
 * @access  Private
 */
exports.getFilesByComplaint = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  
  const files = await File.find({ complaintId });
  
  // Generate fresh signed URLs for all files
  const filesWithSignedUrls = await Promise.all(
    files.map(async (file) => {
      const signedUrl = await getPresignedUrl(file.s3Key);
      return {
        ...file.toObject(),
        s3Url: signedUrl
      };
    })
  );
  
  res.status(200).json({
    success: true,
    count: filesWithSignedUrls.length,
    data: filesWithSignedUrls
  });
});