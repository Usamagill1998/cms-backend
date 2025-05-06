const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');
const { s3Client, bucketName } = require('../config/aws');
const config = require('../config/config');

/**
 * Upload a file to S3 bucket
 * @param {Object} file - The file object from multer
 * @param {String} fileType - The type of file (id_card, registration_file, etc.)
 * @param {String} userId - ID of the user uploading the file
 * @returns {Object} Object with S3 upload details
 */
const uploadFileToS3 = async (file, fileType, userId) => {
  try {
    // Generate a unique key for the file
    const fileExtension = path.extname(file.originalname);
    const randomString = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    const key = `${getFolderPath(fileType)}${userId}-${timestamp}-${randomString}${fileExtension}`;

    // Set up the S3 upload parameters
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    // Upload the file to S3
    const command = new PutObjectCommand(params);
    await s3Client.send(command);

    // Generate a signed URL for temporary access
    const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }), { expiresIn: 60 * 60 }); // URL expires in 1 hour

    // Return file upload details
    return {
      originalName: file.originalname,
      filename: `${timestamp}-${randomString}${fileExtension}`,
      s3Key: key,
      s3Url: signedUrl,
      mimetype: file.mimetype,
      size: file.size,
      fileType
    };
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

/**
 * Delete a file from S3 bucket
 * @param {String} key - S3 key of the file to delete
 * @returns {Boolean} Success status
 */
const deleteFileFromS3 = async (key) => {
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

/**
 * Generate a presigned URL for an existing S3 file
 * @param {String} key - S3 key of the file
 * @param {Number} expiresIn - Expiration time in seconds (default: 3600s = 1h)
 * @returns {String} Presigned URL
 */
const getPresignedUrl = async (key, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Get the appropriate S3 folder path based on file type
 * @param {String} fileType - Type of file
 * @returns {String} S3 folder path
 */
const getFolderPath = (fileType) => {
  switch (fileType) {
    case 'id_card':
      return config.fileUpload.s3FolderPaths.idCards;
    case 'registration_file':
    case 'allotment_letter':
    case 'cancellation_letter':
    case 'demand_letter':
      return config.fileUpload.s3FolderPaths.documents;
    case 'payment_receipt':
      return config.fileUpload.s3FolderPaths.paymentReceipts;
    default:
      return 'other/';
  }
};

module.exports = {
  uploadFileToS3,
  deleteFileFromS3,
  getPresignedUrl
};