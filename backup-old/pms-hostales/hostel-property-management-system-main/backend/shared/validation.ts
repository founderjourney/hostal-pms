import { createError } from "./errors";

// Common validation patterns
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  CONFIRMATION_CODE: /^[A-Z]{3}\d{8}$/,
  ISO8601_DATE: /^\d{4}-\d{2}-\d{2}$/,
} as const;

// Validation utility functions
export const validate = {
  required: (value: any, fieldName: string): void => {
    if (value === null || value === undefined || value === '') {
      throw createError.missingField(fieldName);
    }
  },

  email: (email: string, fieldName = 'email'): void => {
    validate.required(email, fieldName);
    if (!ValidationPatterns.EMAIL.test(email)) {
      throw createError.invalidFormat(fieldName, 'valid email address');
    }
  },

  password: (password: string, fieldName = 'password'): void => {
    validate.required(password, fieldName);
    if (password.length < 8) {
      throw createError.validationError(fieldName, 'must be at least 8 characters long');
    }
    if (!ValidationPatterns.PASSWORD.test(password)) {
      throw createError.validationError(
        fieldName, 
        'must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }
  },

  phone: (phone: string, fieldName = 'phone'): void => {
    if (phone && !ValidationPatterns.PHONE.test(phone)) {
      throw createError.invalidFormat(fieldName, 'valid phone number');
    }
  },

  uuid: (id: string, fieldName = 'id'): void => {
    validate.required(id, fieldName);
    if (!ValidationPatterns.UUID.test(id)) {
      throw createError.invalidFormat(fieldName, 'valid UUID');
    }
  },

  iso8601Date: (date: string, fieldName: string): void => {
    validate.required(date, fieldName);
    if (!ValidationPatterns.ISO8601_DATE.test(date)) {
      throw createError.invalidFormat(fieldName, 'valid YYYY-MM-DD date');
    }
    if (isNaN(new Date(date).getTime())) {
      throw createError.invalidFormat(fieldName, 'valid date');
    }
  },

  positiveNumber: (value: number, fieldName: string): void => {
    validate.required(value, fieldName);
    if (typeof value !== 'number' || value <= 0) {
      throw createError.validationError(fieldName, 'must be a positive number');
    }
  },

  nonNegativeNumber: (value: number, fieldName: string): void => {
    validate.required(value, fieldName);
    if (typeof value !== 'number' || value < 0) {
      throw createError.validationError(fieldName, 'must be a non-negative number');
    }
  },

  dateRange: (startDate: Date, endDate: Date, startFieldName = 'startDate', endFieldName = 'endDate'): void => {
    validate.required(startDate, startFieldName);
    validate.required(endDate, endFieldName);
    
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw createError.invalidFormat(startFieldName, 'valid date');
    }
    
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw createError.invalidFormat(endFieldName, 'valid date');
    }
    
    if (startDate >= endDate) {
      throw createError.validationError('dateRange', `${endFieldName} must be after ${startFieldName}`);
    }
  },

  futureDate: (date: Date, fieldName: string): void => {
    validate.required(date, fieldName);
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw createError.invalidFormat(fieldName, 'valid date');
    }
    
    if (date <= new Date()) {
      throw createError.validationError(fieldName, 'must be a future date');
    }
  },

  stringLength: (value: string, min: number, max: number, fieldName: string): void => {
    validate.required(value, fieldName);
    if (value.length < min || value.length > max) {
      throw createError.validationError(fieldName, `must be between ${min} and ${max} characters long`);
    }
  },

  enumValue: <T extends string>(value: T, allowedValues: readonly T[], fieldName: string): void => {
    validate.required(value, fieldName);
    if (!allowedValues.includes(value)) {
      throw createError.validationError(fieldName, `must be one of: ${allowedValues.join(', ')}`);
    }
  },

  arrayNotEmpty: (array: any[], fieldName: string): void => {
    validate.required(array, fieldName);
    if (!Array.isArray(array) || array.length === 0) {
      throw createError.validationError(fieldName, 'must be a non-empty array');
    }
  },
};

// Sanitization utilities
export const sanitize = {
  email: (email: string): string => email.toLowerCase().trim(),
  
  phone: (phone: string): string => phone.replace(/[\s\-\(\)]/g, ''),
  
  name: (name: string): string => name.trim().replace(/\s+/g, ' '),
  
  confirmationCode: (code: string): string => code.toUpperCase().trim(),

  date: (date: string): string => date.trim(),
};

// Validation decorator for common field combinations
export const validateGuestData = (data: {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
}): void => {
  validate.stringLength(data.firstName, 1, 50, 'firstName');
  validate.stringLength(data.lastName, 1, 50, 'lastName');
  
  if (data.email) {
    validate.email(data.email);
  }
  
  if (data.phone) {
    validate.phone(data.phone);
  }
  
  if (data.dateOfBirth) {
    if (!(data.dateOfBirth instanceof Date) || isNaN(data.dateOfBirth.getTime())) {
      throw createError.invalidFormat('dateOfBirth', 'valid date');
    }
    
    const today = new Date();
    const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const minAge = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
    
    if (data.dateOfBirth < maxAge || data.dateOfBirth > minAge) {
      throw createError.validationError('dateOfBirth', 'must be between 16 and 120 years ago');
    }
  }
};

export const validateReservationData = (data: {
  checkInDate: Date;
  checkOutDate: Date;
  guestsCount: number;
  totalAmount: number;
}): void => {
  validate.dateRange(data.checkInDate, data.checkOutDate, 'checkInDate', 'checkOutDate');
  validate.positiveNumber(data.guestsCount, 'guestsCount');
  validate.positiveNumber(data.totalAmount, 'totalAmount');
  
  // Business rule: minimum stay of 1 night
  const daysDiff = (data.checkOutDate.getTime() - data.checkInDate.getTime()) / (1000 * 3600 * 24);
  if (daysDiff < 1) {
    throw createError.businessRuleViolation('minimum stay is 1 night');
  }
  
  // Business rule: maximum stay of 30 days
  if (daysDiff > 30) {
    throw createError.businessRuleViolation('maximum stay is 30 days');
  }
  
  // Business rule: reasonable guest count
  if (data.guestsCount > 20) {
    throw createError.businessRuleViolation('maximum 20 guests per reservation');
  }
};