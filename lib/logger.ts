// ========================================================
// StayDesk CRM / HotelFlow CRM Structured JSON Logger
// Location: lib/logger.ts
// ========================================================

export type LogCategory = 'Application' | 'Authentication' | 'Provision' | 'Audit' | 'Database' | 'Security';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogPayload {
  timestamp: string;
  category: LogCategory;
  level: LogLevel;
  message: string;
  requestId?: string;
  userId?: string;
  hotelId?: string;
  role?: string;
  duration?: number;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  ip?: string;
  browser?: string;
  device?: string;
  country?: string;
  error?: {
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'secret',
  'key',
  'encrypted_password',
  'access_token',
  'refresh_token',
  'authorization',
  'aadhar',
  'session',
  'hf_session',
  'cookie'
]);

/**
 * Recursively sanitizes objects to strip out any sensitive credentials, tokens, or credentials
 */
export function sanitize(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Match key patterns
      let isSensitive = false;
      for (const sensitive of SENSITIVE_KEYS) {
        if (lowerKey.includes(sensitive)) {
          isSensitive = true;
          break;
        }
      }

      if (isSensitive) {
        clean[key] = '[MASKED]';
      } else {
        clean[key] = sanitize(obj[key]);
      }
    }
    return clean;
  }
  return obj;
}

class StructuredLogger {
  private formatLog(payload: LogPayload): string {
    const sanitized = sanitize(payload);
    return JSON.stringify(sanitized);
  }

  public write(
    category: LogCategory,
    level: LogLevel,
    message: string,
    params: Omit<LogPayload, 'timestamp' | 'category' | 'level' | 'message'> = {}
  ) {
    const logObj: LogPayload = {
      timestamp: new Date().toISOString(),
      category,
      level,
      message,
      ...params
    };

    const formatted = this.formatLog(logObj);
    
    if (level === 'ERROR') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }

  public info(category: LogCategory, message: string, params?: Omit<LogPayload, 'timestamp' | 'category' | 'level' | 'message'>) {
    this.write(category, 'INFO', message, params);
  }

  public warn(category: LogCategory, message: string, params?: Omit<LogPayload, 'timestamp' | 'category' | 'level' | 'message'>) {
    this.write(category, 'WARN', message, params);
  }

  public error(category: LogCategory, message: string, err?: Error, params?: Omit<LogPayload, 'timestamp' | 'category' | 'level' | 'message' | 'error'>) {
    const errorDetails = err ? {
      error: {
        message: err.message,
        stack: err.stack
      }
    } : {};
    
    this.write(category, 'ERROR', message, {
      ...errorDetails,
      ...params
    });
  }

  public debug(category: LogCategory, message: string, params?: Omit<LogPayload, 'timestamp' | 'category' | 'level' | 'message'>) {
    if (process.env.NODE_ENV !== 'production') {
      this.write(category, 'DEBUG', message, params);
    }
  }
}

export const logger = new StructuredLogger();
