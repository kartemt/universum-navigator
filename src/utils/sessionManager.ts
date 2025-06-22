
import { supabase } from '@/integrations/supabase/client';
import { logger, GENERIC_ERRORS } from '@/utils/logger';
import { CSRFProtection } from '@/utils/csrfProtection';

interface SessionData {
  sessionToken: string;
  expiresAt: string;
  admin: {
    id: string;
    email: string;
  };
}

export class SessionManager {
  private static readonly SESSION_REFRESH_THRESHOLD = 15 * 60 * 1000; // 15 minutes
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static currentSession: SessionData | null = null;

  /**
   * Initialize session from secure cookie via server
   */
  static async initializeSession(): Promise<SessionData | null> {
    try {
      const { data, error } = await supabase.functions.invoke('get-admin-session', {
        headers: {
          ...CSRFProtection.getHeaders(),
        }
      });

      if (error) {
        logger.debug('No existing admin session found');
        return null;
      }

      if (data?.session) {
        this.currentSession = data.session;
        this.startRefreshTimer();
        logger.debug('Admin session restored from secure cookie');
        return data.session;
      }

      return null;
    } catch (error) {
      logger.error('Failed to initialize session');
      return null;
    }
  }

  /**
   * Create new session with httpOnly cookie
   */
  static async createSession(email: string, password: string): Promise<SessionData> {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login-secure', {
        body: { email, password },
        headers: {
          ...CSRFProtection.getHeaders(),
        }
      });

      if (error) {
        logger.error('Secure admin login function error');
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.session) {
        this.currentSession = data.session;
        this.startRefreshTimer();
        logger.info('Secure admin session created', { email });
        return data.session;
      } else {
        logger.warn('Secure admin login failed', { email });
        throw new Error(data?.error || GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      logger.error('Secure session creation error', { email });
      throw error;
    }
  }

  /**
   * Refresh session before expiration
   */
  static async refreshSession(): Promise<SessionData | null> {
    if (!this.currentSession) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('refresh-admin-session', {
        headers: {
          ...CSRFProtection.getHeaders(),
        }
      });

      if (error || !data?.session) {
        logger.warn('Session refresh failed');
        this.clearSession();
        return null;
      }

      this.currentSession = data.session;
      logger.debug('Admin session refreshed');
      return data.session;
    } catch (error) {
      logger.error('Session refresh error');
      this.clearSession();
      return null;
    }
  }

  /**
   * Destroy session and clear cookie
   */
  static async destroySession(): Promise<void> {
    this.stopRefreshTimer();
    
    try {
      await supabase.functions.invoke('admin-logout-secure', {
        headers: {
          ...CSRFProtection.getHeaders(),
        }
      });
      logger.info('Secure admin logout successful');
    } catch (error) {
      logger.error('Secure admin logout error');
    }
    
    this.clearSession();
  }

  /**
   * Get current session
   */
  static getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Get auth headers for API requests
   */
  static getAuthHeaders(): Record<string, string> {
    return {
      ...CSRFProtection.getHeaders(),
    };
  }

  /**
   * Start automatic session refresh timer
   */
  private static startRefreshTimer(): void {
    this.stopRefreshTimer();
    
    if (!this.currentSession) return;

    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    const now = Date.now();
    const timeUntilRefresh = expiresAt - now - this.SESSION_REFRESH_THRESHOLD;

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshSession();
      }, timeUntilRefresh);
      
      logger.debug('Session refresh timer started', { 
        refreshIn: Math.round(timeUntilRefresh / 1000 / 60) + ' minutes' 
      });
    }
  }

  /**
   * Stop refresh timer
   */
  private static stopRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Clear session data
   */
  private static clearSession(): void {
    this.currentSession = null;
    CSRFProtection.clearToken();
  }

  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    if (!this.currentSession) return false;
    
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    const now = Date.now();
    
    return now < expiresAt;
  }
}
