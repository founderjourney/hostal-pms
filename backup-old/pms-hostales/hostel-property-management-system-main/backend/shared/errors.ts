import { APIError } from "encore.dev/api";

// Standardized error response format
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Error codes for consistent error identification
export const ErrorCodes = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  
  // Resource Management
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",
  RESOURCE_CONFLICT: "RESOURCE_CONFLICT",
  RESOURCE_LOCKED: "RESOURCE_LOCKED",
  
  // Business Logic
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  OPERATION_NOT_ALLOWED: "OPERATION_NOT_ALLOWED",
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
  PRECONDITION_FAILED: "PRECONDITION_FAILED",
  
  // System
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // Data Integrity
  DATA_INTEGRITY_ERROR: "DATA_INTEGRITY_ERROR",
  CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Custom error class for application-specific errors
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError);
  }

  // Convert to Encore APIError
  toAPIError(): APIError {
    switch (this.statusCode) {
      case 400:
        return APIError.invalidArgument(this.message, this.details);
      case 401:
        return APIError.unauthenticated(this.message, this.details);
      case 403:
        return APIError.permissionDenied(this.message, this.details);
      case 404:
        return APIError.notFound(this.message, this.details);
      case 409:
        return APIError.alreadyExists(this.message, this.details);
      case 412:
        return APIError.failedPrecondition(this.message, this.details);
      case 429:
        return APIError.resourceExhausted(this.message, this.details);
      case 500:
      default:
        return APIError.internal(this.message, this.details);
    }
  }
}

// Predefined error creators for common scenarios
export const createError = {
  // Authentication errors
  invalidCredentials: (details?: any) => 
    new AppError(ErrorCodes.INVALID_CREDENTIALS, "Invalid email or password", 401, details),
    
  tokenExpired: (details?: any) => 
    new AppError(ErrorCodes.TOKEN_EXPIRED, "Authentication token has expired", 401, details),
    
  unauthorized: (message = "Authentication required", details?: any) => 
    new AppError(ErrorCodes.UNAUTHORIZED, message, 401, details),
    
  forbidden: (message = "Access denied", details?: any) => 
    new AppError(ErrorCodes.FORBIDDEN, message, 403, details),

  // Validation errors
  validationError: (field: string, reason: string, details?: any) => 
    new AppError(ErrorCodes.VALIDATION_ERROR, `Validation failed for ${field}: ${reason}`, 400, details),
    
  missingField: (field: string, details?: any) => 
    new AppError(ErrorCodes.MISSING_REQUIRED_FIELD, `Required field '${field}' is missing`, 400, details),
    
  invalidFormat: (field: string, expected: string, details?: any) => 
    new AppError(ErrorCodes.INVALID_FORMAT, `Invalid format for ${field}. Expected: ${expected}`, 400, details),

  // Resource errors
  notFound: (resource: string, id?: string, details?: any) => 
    new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `${resource}${id ? ` with ID ${id}` : ''} not found`, 404, details),
    
  alreadyExists: (resource: string, identifier?: string, details?: any) => 
    new AppError(ErrorCodes.RESOURCE_ALREADY_EXISTS, `${resource}${identifier ? ` with ${identifier}` : ''} already exists`, 409, details),
    
  conflict: (message: string, details?: any) => 
    new AppError(ErrorCodes.RESOURCE_CONFLICT, message, 409, details),

  // Business logic errors
  operationNotAllowed: (operation: string, reason: string, details?: any) => 
    new AppError(ErrorCodes.OPERATION_NOT_ALLOWED, `${operation} is not allowed: ${reason}`, 400, details),
    
  preconditionFailed: (condition: string, details?: any) => 
    new AppError(ErrorCodes.PRECONDITION_FAILED, `Precondition failed: ${condition}`, 412, details),
    
  businessRuleViolation: (rule: string, details?: any) => 
    new AppError(ErrorCodes.BUSINESS_RULE_VIOLATION, `Business rule violation: ${rule}`, 400, details),

  // System errors
  internal: (message = "Internal server error", details?: any) => 
    new AppError(ErrorCodes.INTERNAL_SERVER_ERROR, message, 500, details),
    
  database: (operation: string, details?: any) => 
    new AppError(ErrorCodes.DATABASE_ERROR, `Database error during ${operation}`, 500, details),
    
  serviceUnavailable: (service: string, details?: any) => 
    new AppError(ErrorCodes.SERVICE_UNAVAILABLE, `${service} service is currently unavailable`, 503, details),
};

// Utility function to handle database errors
export function handleDatabaseError(error: any, operation: string): never {
  console.error(`Database error during ${operation}:`, error);
  
  // Check for common database errors
  if (error.code === '23505') { // unique_violation
    throw createError.conflict(`Resource already exists`, { dbError: error.detail });
  }
  
  if (error.code === '23503') { // foreign_key_violation
    throw createError.validationError('reference', 'Referenced resource does not exist', { dbError: error.detail });
  }
  
  if (error.code === '23514') { // check_violation
    throw createError.validationError('constraint', 'Data violates database constraint', { dbError: error.detail });
  }
  
  // Generic database error
  throw createError.database(operation, { originalError: error.message });
}

// Type guard to check if error is an AppError
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}