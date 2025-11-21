import { APIError } from "encore.dev/api";
import { AppError, isAppError, ErrorCode } from "./errors";

// Log levels
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

// Log context interface
export interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  statusCode?: number;
  [key: string]: any;
}

// Structured log entry
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: ErrorCode;
    statusCode?: number;
  };
}

// Logger class for structured logging
export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    // Set log level from environment or default to INFO
    const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
    switch (envLogLevel) {
      case 'error':
        this.logLevel = LogLevel.ERROR;
        break;
      case 'warn':
        this.logLevel = LogLevel.WARN;
        break;
      case 'info':
        this.logLevel = LogLevel.INFO;
        break;
      case 'debug':
        this.logLevel = LogLevel.DEBUG;
        break;
      default:
        this.logLevel = LogLevel.INFO;
    }
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatLog(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      level: LogLevel[entry.level],
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error | AppError): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      if (isAppError(error)) {
        entry.error.code = error.code;
        entry.error.statusCode = error.statusCode;
      }
    }

    console.log(this.formatLog(entry));
  }

  public error(message: string, context?: LogContext, error?: Error | AppError): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  public warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  public debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  // API-specific logging methods
  public apiRequest(endpoint: string, method: string, context?: LogContext): void {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      endpoint,
      method,
    });
  }

  public apiResponse(endpoint: string, method: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `API Response: ${method} ${endpoint} - ${statusCode}`, {
      ...context,
      endpoint,
      method,
      statusCode,
      duration,
    });
  }

  public apiError(endpoint: string, method: string, error: Error | AppError, context?: LogContext): void {
    const statusCode = isAppError(error) ? error.statusCode : 500;
    this.error(`API Error: ${method} ${endpoint} - ${error.message}`, {
      ...context,
      endpoint,
      method,
      statusCode,
    }, error);
  }

  public databaseQuery(query: string, duration: number, context?: LogContext): void {
    this.debug(`Database Query: ${query}`, {
      ...context,
      duration,
      type: 'database',
    });
  }

  public databaseError(query: string, error: Error, context?: LogContext): void {
    this.error(`Database Error: ${error.message}`, {
      ...context,
      query,
      type: 'database',
    }, error);
  }

  public authEvent(event: string, userId?: string, context?: LogContext): void {
    this.info(`Auth Event: ${event}`, {
      ...context,
      userId,
      type: 'auth',
    });
  }

  public businessLogic(event: string, context?: LogContext): void {
    this.info(`Business Logic: ${event}`, {
      ...context,
      type: 'business',
    });
  }

  public securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    this.log(level, `Security Event: ${event}`, {
      ...context,
      severity,
      type: 'security',
    });
  }
}

// Singleton logger instance
export const logger = Logger.getInstance();

// Error logging wrapper
export function logAndThrowError(error: AppError | Error, context?: LogContext): never {
  if (isAppError(error)) {
    logger.error(error.message, context, error);
    throw error.toAPIError();
  } else {
    logger.error('Unexpected error', context, error);
    throw APIError.internal("An unexpected error occurred");
  }
}

// Performance monitoring wrapper
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now();
    logger.debug(`Starting ${operation}`, context);
    
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      logger.debug(`Completed ${operation}`, { ...context, duration });
      resolve(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed ${operation}`, { ...context, duration }, error as Error);
      reject(error);
    }
  });
}

// Request context utilities
export function createRequestContext(req: any): LogContext {
  return {
    requestId: req.id || generateRequestId(),
    method: req.method,
    endpoint: req.path,
    userAgent: req.headers?.['user-agent'],
    ip: req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress,
  };
}

function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}