# Almanik PMS - Testing Strategy

## Overview

This project uses **Jest** for testing with a pragmatic, production-focused approach.

## Current Test Coverage

### Smoke Tests (`smoke.test.js`)

Production-grade smoke tests that verify:
- ✅ All dependencies load correctly
- ✅ Database adapter initializes
- ✅ Security configuration is properly set
- ✅ Monitoring and logging systems work
- ✅ Environment variables are configured
- ✅ Modules export correctly

**Coverage:** 20 tests covering critical system initialization

## Test Philosophy

Given the monolithic architecture of `server-simple.js`, we prioritize:

1. **Smoke Tests**: Fast, reliable tests that verify system components load and initialize
2. **Module Tests**: Verify individual modules export correctly and can be loaded
3. **Configuration Tests**: Ensure security, monitoring, and logging are properly configured

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests for CI
npm run test:ci
```

## Coverage Thresholds

Current thresholds are intentionally pragmatic:
- Statements: 50%
- Branches: 50%
- Functions: 50%
- Lines: 50%

## Future Testing Strategy

As the application evolves, consider:

1. **Integration Tests**: When modules are refactored to be more testable
2. **E2E Tests**: Using Cypress or Playwright for critical user flows
3. **API Contract Tests**: Using Pact or similar for OTA integrations

## Test Helpers

### `tests/helpers/testHelpers.js`
- Login helpers for authenticated requests
- Test data creation utilities
- Database cleanup functions

### `tests/helpers/testData.js`
- Factory functions for generating test data
- Consistent test data patterns

## CI/CD Integration

Tests are designed to run in CI environments:
- ✅ No external dependencies required
- ✅ In-memory SQLite for database tests
- ✅ Fast execution (< 5 seconds)
- ✅ Deterministic results

## Notes

- Tests use in-memory SQLite (`:memory:`) to avoid file system dependencies
- Production passwords are verified not to use defaults
- Sentry is disabled in test environment
- Console logs can be suppressed by modifying `tests/setup.js`
