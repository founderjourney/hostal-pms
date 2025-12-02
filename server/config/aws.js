/**
 * AWS S3 Configuration
 * DEV3-01: Backup System Configuration
 *
 * Configures AWS SDK for S3 backups
 */

const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

// Validate required environment variables
const requiredVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_BUCKET_NAME', 'AWS_REGION'];
const missingVars = requiredVars.filter(v => !process.env[v]);

if (missingVars.length > 0 && process.env.NODE_ENV === 'production') {
  logger.warn(`AWS S3 not configured. Missing: ${missingVars.join(', ')}`);
}

// S3 Client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'almanik-pms-backups';

/**
 * Check if AWS is properly configured
 */
function isConfigured() {
  return missingVars.length === 0;
}

/**
 * Upload a file to S3
 * @param {Buffer|string} body - File content
 * @param {string} key - S3 object key (path/filename)
 * @param {string} contentType - MIME type
 * @returns {Promise<object>} Upload result
 */
async function uploadFile(body, key, contentType = 'application/octet-stream') {
  if (!isConfigured()) {
    throw new Error('AWS S3 not configured');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    ServerSideEncryption: 'AES256'
  });

  const result = await s3Client.send(command);
  logger.info(`File uploaded to S3: ${key}`);
  return result;
}

/**
 * Download a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>} File content
 */
async function downloadFile(key) {
  if (!isConfigured()) {
    throw new Error('AWS S3 not configured');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  const response = await s3Client.send(command);
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * List objects in S3 bucket
 * @param {string} prefix - Filter by prefix (folder)
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<Array>} List of objects
 */
async function listObjects(prefix = 'backups/', maxKeys = 100) {
  if (!isConfigured()) {
    throw new Error('AWS S3 not configured');
  }

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: maxKeys
  });

  const response = await s3Client.send(command);
  return response.Contents || [];
}

/**
 * Delete an object from S3
 * @param {string} key - S3 object key
 * @returns {Promise<object>} Delete result
 */
async function deleteObject(key) {
  if (!isConfigured()) {
    throw new Error('AWS S3 not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key
  });

  const result = await s3Client.send(command);
  logger.info(`File deleted from S3: ${key}`);
  return result;
}

/**
 * Test S3 connection by uploading and deleting a test file
 * @returns {Promise<boolean>} True if connection works
 */
async function testConnection() {
  if (!isConfigured()) {
    return { success: false, error: `Missing config: ${missingVars.join(', ')}` };
  }

  try {
    const testKey = `test/connection-test-${Date.now()}.txt`;
    const testContent = `Connection test at ${new Date().toISOString()}`;

    // Upload test file
    await uploadFile(Buffer.from(testContent), testKey, 'text/plain');

    // Delete test file
    await deleteObject(testKey);

    logger.info('AWS S3 connection test successful');
    return { success: true, bucket: BUCKET_NAME, region: process.env.AWS_REGION };
  } catch (error) {
    logger.error('AWS S3 connection test failed:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  s3Client,
  BUCKET_NAME,
  isConfigured,
  uploadFile,
  downloadFile,
  listObjects,
  deleteObject,
  testConnection
};
