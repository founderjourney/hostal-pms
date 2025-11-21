/**
 * Jest Configuration for Almanik PMS
 * Testing framework configuration with coverage settings
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/server-simple.js', // Exclude main server file
    '!server/migrate-*.js', // Exclude migration scripts
    '!server/cron/**', // Exclude cron jobs from coverage
    '!**/node_modules/**',
  ],

  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 10,
      statements: 10,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Timeout for tests (10 seconds)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
