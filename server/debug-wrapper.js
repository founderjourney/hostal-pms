// Debug wrapper to catch module loading errors
const express = require('express');
const app = express();

let mainApp = null;
let loadError = null;

try {
  console.log('Attempting to load server-simple.js...');
  mainApp = require('./server-simple');
  console.log('Server loaded successfully!');
} catch (error) {
  console.error('LOAD ERROR:', error.message);
  console.error('STACK:', error.stack);
  loadError = {
    message: error.message,
    stack: error.stack,
    name: error.name
  };
}

// If main app loaded, use it
if (mainApp) {
  module.exports = mainApp;
} else {
  // Return error information
  app.use((req, res) => {
    res.status(500).json({
      error: 'Server failed to load',
      details: loadError,
      nodeVersion: process.version,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasDbUrl: !!process.env.DATABASE_URL
      }
    });
  });
  module.exports = app;
}
