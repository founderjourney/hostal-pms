/**
 * Smoke Tests
 * Basic tests to verify server can start and critical endpoints respond
 */

describe('Almanik PMS - Smoke Tests', () => {
  describe('Dependencies', () => {
    test('should load express', () => {
      const express = require('express');
      expect(express).toBeDefined();
      expect(typeof express).toBe('function');
    });

    test('should load database adapter', () => {
      const DatabaseAdapter = require('../server/db-adapter');
      expect(DatabaseAdapter).toBeDefined();
      expect(typeof DatabaseAdapter).toBe('function');
    });

    test('should load reservations module', () => {
      const reservationsModule = require('../server/modules/reservations');
      expect(reservationsModule).toBeDefined();
      expect(typeof reservationsModule).toBe('function');
    });

    test('should load iCal sync module', () => {
      const icalModule = require('../server/modules/ical-sync');
      expect(icalModule).toBeDefined();
      expect(typeof icalModule).toBe('function');
    });

    test('should load security config', () => {
      const security = require('../server/config/security');
      expect(security).toBeDefined();
      expect(security).toHaveProperty('helmetConfig');
      expect(security).toHaveProperty('apiLimiter');
      expect(security).toHaveProperty('authLimiter');
    });

    test('should load monitoring config', () => {
      const monitoring = require('../server/config/monitoring');
      expect(monitoring).toBeDefined();
      expect(monitoring).toHaveProperty('initSentry');
      expect(monitoring).toHaveProperty('healthCheck');
      expect(monitoring).toHaveProperty('performanceMonitoring');
    });

    test('should load logger', () => {
      const logger = require('../server/config/logger');
      expect(logger).toBeDefined();
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
    });
  });

  describe('Environment Configuration', () => {
    test('should have required environment variables', () => {
      expect(process.env.ADMIN_PASSWORD).toBeDefined();
      expect(process.env.RECEPTION_PASSWORD).toBeDefined();
      expect(process.env.SESSION_SECRET).toBeDefined();
    });

    test('should not use default passwords in production', () => {
      if (process.env.NODE_ENV === 'production') {
        expect(process.env.ADMIN_PASSWORD).not.toBe('CHANGE_ME_IN_PRODUCTION');
        expect(process.env.RECEPTION_PASSWORD).not.toBe('CHANGE_ME_IN_PRODUCTION');
      }
    });
  });

  describe('Database Adapter', () => {
    test('should create database adapter instance', () => {
      const DatabaseAdapter = require('../server/db-adapter');
      const adapter = new DatabaseAdapter();
      expect(adapter).toBeInstanceOf(DatabaseAdapter);
    });

    test('should connect to in-memory database', async () => {
      const DatabaseAdapter = require('../server/db-adapter');
      const adapter = new DatabaseAdapter();

      // Override to use in-memory for test
      process.env.DATABASE_URL = ':memory:';

      await expect(adapter.connect()).resolves.not.toThrow();

      // Adapter creates database internally
      expect(adapter).toBeDefined();
    });
  });

  describe('Modules Structure', () => {
    test('reservations module should export a router function', () => {
      const reservationsModule = require('../server/modules/reservations');
      // Module should be a function (Express router)
      expect(typeof reservationsModule).toBe('function');
    });

    test('iCal sync module should export a router function', () => {
      const icalModule = require('../server/modules/ical-sync');
      // Module should be a function (Express router)
      expect(typeof icalModule).toBe('function');
    });
  });

  describe('Security Configuration', () => {
    test('should have helmet config', () => {
      const { helmetConfig } = require('../server/config/security');
      expect(helmetConfig).toBeDefined();
    });

    test('should have rate limiters configured', () => {
      const { apiLimiter, authLimiter, writeLimiter } = require('../server/config/security');
      expect(apiLimiter).toBeDefined();
      expect(authLimiter).toBeDefined();
      expect(writeLimiter).toBeDefined();
    });

    test('should have CORS options', () => {
      const { corsOptions } = require('../server/config/security');
      expect(corsOptions).toBeDefined();
      expect(corsOptions).toHaveProperty('origin');
      expect(corsOptions).toHaveProperty('credentials');
    });

    test('should have validation rules', () => {
      const { validationRules } = require('../server/config/security');
      expect(validationRules).toBeDefined();
      expect(validationRules).toHaveProperty('createGuest');
      expect(validationRules).toHaveProperty('createBooking');
      expect(validationRules).toHaveProperty('createIcalSource');
    });
  });

  describe('Monitoring Configuration', () => {
    test('should have health check function', () => {
      const { healthCheck } = require('../server/config/monitoring');
      expect(healthCheck).toBeDefined();
      expect(typeof healthCheck).toBe('function');
    });

    test('should have performance monitoring', () => {
      const { performanceMonitoring, initPerformanceMetrics } = require('../server/config/monitoring');
      expect(performanceMonitoring).toBeDefined();
      expect(initPerformanceMetrics).toBeDefined();
    });
  });

  describe('Logger', () => {
    test('should log messages without errors', () => {
      const logger = require('../server/config/logger');

      expect(() => {
        logger.info('Test info message');
        logger.warn('Test warn message');
        logger.error('Test error message');
      }).not.toThrow();
    });
  });
});
