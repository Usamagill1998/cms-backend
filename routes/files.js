const express = require('express');
const {
  uploadFile,
  uploadMultipleFiles,
  getFile,
  deleteFile,
  getFilesByComplaint
} = require('../controllers/fileController');

const { protect } = require('../middleware/auth');
const { uploadSingle, uploadMultiple, handleMulterError } = require('../middleware/upload');

const router = express.Router();

// Define file upload fields for complaint documents
const complaintDocumentFields = [
  { name: 'idCard', maxCount: 1 },
  { name: 'registrationFile', maxCount: 1 },
  { name: 'paymentReceipts', maxCount: 1 },
  { name: 'allotmentLetter', maxCount: 1 },
  { name: 'cancellationLetter', maxCount: 1 },
  { name: 'demandLetter', maxCount: 1 },
];

// Protected routes
router.post('/upload',  uploadSingle('file'), handleMulterError, uploadFile);
router.post('/upload-multiple',  uploadMultiple(complaintDocumentFields), handleMulterError, uploadMultipleFiles);
router.get('/complaint/:complaintId', getFilesByComplaint);
router.get('/:id', getFile);
router.delete('/:id',  deleteFile);

module.exports = router;