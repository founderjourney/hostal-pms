/**
 * Jest Global Setup
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // Use in-memory SQLite for tests
process.env.ADMIN_PASSWORD = 'test_admin_password';
process.env.RECEPTION_PASSWORD = 'test_reception_password';
process.env.SESSION_SECRET = 'test_session_secret';

// Disable Sentry in tests
delete process.env.SENTRY_DSN;

// Suppress console logs in tests (optional, comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set longer timeout for database operations
jest.setTimeout(10000);
