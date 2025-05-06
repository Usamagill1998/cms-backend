// test-s3.js
require('dotenv').config();
const { s3Client, bucketName } = require('./config/aws');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

async function testS3Connection() {
  try {
    const testParams = {
      Bucket: bucketName,
      Key: 'test-file.txt',
      Body: 'This is a test file to verify S3 connection.',
      ContentType: 'text/plain'
    };
    
    const command = new PutObjectCommand(testParams);
    await s3Client.send(command);
    console.log('Successfully connected to S3 and uploaded test file!');
  } catch (error) {
    console.error('Error connecting to S3:', error);
  }
}

testS3Connection();