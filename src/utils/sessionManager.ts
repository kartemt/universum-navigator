
import { supabase } from '@/integrations/supabase/client';
import { logger, GENERIC_ERRORS } from '@/utils/logger';

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
      console.log('SessionManager: Initializing session...');
      
      const { data, error } = await supabase.functions.invoke('get-admin-session', {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.log('SessionManager: No existing admin session found:', error);
        logger.debug('No existing admin session found');
        return null;
      }

      if (data?.session) {
        console.log('SessionManager: Session restored from server:', data.session.admin.email);
        this.currentSession = data.session;
        this.startRefreshTimer();
        logger.debug('Admin session restored from secure cookie');
        return data.session;
      }

      console.log('SessionManager: No session data received');
      return null;
    } catch (error) {
      console.error('SessionManager: Failed to initialize session', error);
      logger.error('Failed to initialize session');
      return null;
    }
  }

  /**
   * Create new session with httpOnly cookie
   */
  static async createSession(email: string, password: string): Promise<SessionData> {
    try {
      console.log('SessionManager: Creating session for:', email);
      
      const { data, error } = await supabase.functions.invoke('admin-login-secure', {
        body: { email, password },
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error('SessionManager: Login function error:', error);
        logger.error('Secure admin login function error');
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.session) {
        console.log('SessionManager: Session created successfully for:', data.session.admin.email);
        this.currentSession = data.session;
        this.startRefreshTimer();
        logger.info('Secure admin session created', { email });
        return data.session;
      } else {
        console.warn('SessionManager: Login failed:', data?.error);
        logger.warn('Secure admin login failed', { email });
        throw new Error(data?.error || GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      console.error('SessionManager: Session creation error:', error);
      logger.error('Secure session creation error', { email });
      throw error;
    }
  }

  /**
   * Refresh session before expiration
   */
  static async refreshSession(): Promise<SessionData | null> {
    if (!this.currentSession) {
      console.log('SessionManager: No current session to refresh');
      return null;
    }

    try {
      console.log('SessionManager: Refreshing session...');
      
      const { data, error } = await supabase.functions.invoke('refresh-admin-session', {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error || !data?.session) {
        console.warn('SessionManager: Session refresh failed:', error);
        logger.warn('Session refresh failed');
        this.clearSession();
        return null;
      }

      console.log('SessionManager: Session refreshed successfully');
      this.currentSession = data.session;
      logger.debug('Admin session refreshed');
      return data.session;
    } catch (error) {
      console.error('SessionManager: Session refresh error:', error);
      logger.error('Session refresh error');
      this.clearSession();
      return null;
    }
  }

  /**
   * Destroy session and clear cookie
   */
  static async destroySession(): Promise<void> {
    console.log('SessionManager: Destroying session...');
    this.stopRefreshTimer();
    
    try {
      await supabase.functions.invoke('admin-logout-secure', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('SessionManager: Logout successful');
      logger.info('Secure admin logout successful');
    } catch (error) {
      console.error('SessionManager: Logout error:', error);
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
      'Content-Type': 'application/json',
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
        console.log('SessionManager: Auto-refreshing session...');
        this.refreshSession();
      }, timeUntilRefresh);
      
      console.log('SessionManager: Refresh timer started, will refresh in', Math.round(timeUntilRefresh / 1000 / 60), 'minutes');
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
      console.log('SessionManager: Refresh timer stopped');
    }
  }

  /**
   * Clear session data
   */
  private static clearSession(): void {
    console.log('SessionManager: Clearing session data');
    this.currentSession = null;
  }

  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    if (!this.currentSession) {
      console.log('SessionManager: No current session');
      return false;
    }
    
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    const now = Date.now();
    const isValid = now < expiresAt;
    
    console.log('SessionManager: Session validity check:', isValid, 'expires in', Math.round((expiresAt - now) / 1000 / 60), 'minutes');
    
    return isValid;
  }
}
