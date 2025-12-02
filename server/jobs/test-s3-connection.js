#!/usr/bin/env node
/**
 * Test S3 Connection Script
 * DEV3-01: Verify AWS S3 configuration
 *
 * Usage:
 *   node server/jobs/test-s3-connection.js
 *
 * Requires .env with:
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - AWS_BUCKET_NAME
 *   - AWS_REGION
 */

require('dotenv').config();

const aws = require('../config/aws');

async function main() {
  console.log('========================================');
  console.log('  AWS S3 Connection Test');
  console.log('========================================\n');

  // Check configuration
  console.log('Configuration Status:');
  console.log(`  AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✓ Set' : '✗ Missing'}`);
  console.log(`  AWS_BUCKET_NAME: ${process.env.AWS_BUCKET_NAME || '✗ Missing'}`);
  console.log(`  AWS_REGION: ${process.env.AWS_REGION || 'us-east-1 (default)'}`);
  console.log('');

  if (!aws.isConfigured()) {
    console.log('❌ AWS S3 is not properly configured.');
    console.log('   Please set the required environment variables in .env\n');
    console.log('Steps to configure AWS S3:');
    console.log('  1. Create AWS account: https://aws.amazon.com');
    console.log('  2. Create S3 bucket: https://s3.console.aws.amazon.com');
    console.log('  3. Create IAM user with S3 permissions');
    console.log('  4. Add credentials to .env file');
    process.exit(1);
  }

  console.log('Testing S3 connection...\n');

  const result = await aws.testConnection();

  if (result.success) {
    console.log('✅ S3 Connection Successful!');
    console.log(`   Bucket: ${result.bucket}`);
    console.log(`   Region: ${result.region}`);
    console.log('\nYou can now proceed with DEV3-02 (Backup Script)');
  } else {
    console.log('❌ S3 Connection Failed');
    console.log(`   Error: ${result.error}`);
    console.log('\nCommon issues:');
    console.log('  - Invalid credentials');
    console.log('  - Bucket does not exist');
    console.log('  - IAM user lacks S3 permissions');
    console.log('  - Region mismatch');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
