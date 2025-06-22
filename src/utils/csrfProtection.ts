
import { logger } from './logger';

export class CSRFProtection {
  private static readonly TOKEN_HEADER = 'X-CSRF-Token';
  private static readonly TOKEN_STORAGE_KEY = 'csrf_token';
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    const array = new Uint8Array(this.TOKEN_LENGTH);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get or create CSRF token for current session
   */
  static getToken(): string {
    let token = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
    
    if (!token) {
      token = this.generateToken();
      sessionStorage.setItem(this.TOKEN_STORAGE_KEY, token);
      logger.debug('Generated new CSRF token');
    }
    
    return token;
  }

  /**
   * Get headers with CSRF token for API requests
   */
  static getHeaders(): Record<string, string> {
    return {
      [this.TOKEN_HEADER]: this.getToken(),
    };
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(providedToken: string): boolean {
    const sessionToken = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
    
    if (!sessionToken || !providedToken) {
      logger.warn('CSRF validation failed: missing token');
      return false;
    }

    if (sessionToken !== providedToken) {
      logger.warn('CSRF validation failed: token mismatch');
      return false;
    }

    return true;
  }

  /**
   * Clear CSRF token (call on logout)
   */
  static clearToken(): void {
    sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
    logger.debug('CSRF token cleared');
  }
}
