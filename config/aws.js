const { S3Client } = require('@aws-sdk/client-s3');

// Create and configure S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  s3Client,
  bucketName: process.env.AWS_BUCKET_NAME,
};