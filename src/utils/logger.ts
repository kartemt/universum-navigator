
interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

const LOG_LEVELS: LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

class SecureLogger {
  private isDevelopment = import.meta.env.DEV;

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      // Remove or mask sensitive patterns
      return data
        .replace(/password['":\s]*["'][^"']*["']/gi, 'password: "[REDACTED]"')
        .replace(/token['":\s]*["'][^"']*["']/gi, 'token: "[REDACTED]"')
        .replace(/session['":\s]*["'][^"']*["']/gi, 'session: "[REDACTED]"')
        .replace(/email['":\s]*["'][^"']*["']/gi, 'email: "[REDACTED]"');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      // Remove sensitive fields
      const sensitiveFields = ['password', 'token', 'sessionToken', 'authorization'];
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      return sanitized;
    }
    
    return data;
  }

  private log(level: keyof LogLevel, message: string, data?: any) {
    if (!this.isDevelopment && level === 'DEBUG') return;
    
    const sanitizedData = data ? this.sanitizeData(data) : undefined;
    const timestamp = new Date().toISOString();
    
    if (this.isDevelopment) {
      console[level](`[${timestamp}] ${message}`, sanitizedData || '');
    } else {
      // In production, only log errors and warnings
      if (level === 'ERROR' || level === 'WARN') {
        console[level](`[${timestamp}] ${message}`);
      }
    }
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }
}

export const logger = new SecureLogger();

// Generic error messages for public consumption
export const GENERIC_ERRORS = {
  AUTH_FAILED: 'Не удалось выполнить аутентификацию',
  ACCESS_DENIED: 'Доступ запрещен',
  OPERATION_FAILED: 'Операция не выполнена',
  INVALID_INPUT: 'Некорректные данные',
  SERVER_ERROR: 'Внутренняя ошибка сервера'
};
