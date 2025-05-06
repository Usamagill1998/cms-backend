const multer = require('multer');
const path = require('path');
const config = require('../config/config');

// Configure multer for memory storage (files will be uploaded to S3)
const storage = multer.memoryStorage();

// File filter function to validate file types
const fileFilter = (req, file, cb) => {
  // Check allowed mime types
  if (!config.fileUpload.allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`File type not supported. Allowed types: ${config.fileUpload.allowedMimeTypes.join(', ')}`), false);
  }
  
  cb(null, true);
};

// Configure multer upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.fileUpload.maxFileSize // 1MB
  }
});

// Export individual middlewares for different file types
module.exports = {
  // For uploading single files by field name
  uploadSingle: (fieldName) => upload.single(fieldName),
  
  // For uploading multiple files with different field names
  uploadMultiple: (fields) => upload.fields(fields),
  
  // For uploading any file
  uploadAny: upload.any(),
  
  // Handle multer errors
  handleMulterError: (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: `File size exceeds limit of ${config.fileUpload.maxFileSize / (1024 * 1024)}MB`
        });
      }
      
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    
    next();
  }
};