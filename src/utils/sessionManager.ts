
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
  private static currentSession: SessionData | null = null;
  private static isInitialized = false;

  /**
   * Initialize session from secure cookie via server
   */
  static async initializeSession(): Promise<SessionData | null> {
    if (this.isInitialized) {
      return this.currentSession;
    }

    try {
      console.log('SessionManager: Initializing session...');
      
      const { data, error } = await supabase.functions.invoke('get-admin-session', {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.log('SessionManager: No existing admin session found:', error);
        this.currentSession = null;
      } else if (data?.session) {
        console.log('SessionManager: Session restored from server:', data.session.admin.email);
        this.currentSession = data.session;
        logger.debug('Admin session restored from secure cookie');
      } else {
        console.log('SessionManager: No session data received');
        this.currentSession = null;
      }

      this.isInitialized = true;
      return this.currentSession;
    } catch (error) {
      console.error('SessionManager: Failed to initialize session', error);
      this.currentSession = null;
      this.isInitialized = true;
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
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.session) {
        console.log('SessionManager: Session created successfully for:', data.session.admin.email);
        this.currentSession = data.session;
        logger.info('Secure admin session created', { email });
        return data.session;
      } else {
        console.warn('SessionManager: Login failed:', data?.error);
        throw new Error(data?.error || GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      console.error('SessionManager: Session creation error:', error);
      throw error;
    }
  }

  /**
   * Destroy session and clear cookie
   */
  static async destroySession(): Promise<void> {
    console.log('SessionManager: Destroying session...');
    
    try {
      await supabase.functions.invoke('admin-logout-secure', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      console.log('SessionManager: Logout successful');
    } catch (error) {
      console.error('SessionManager: Logout error:', error);
    }
    
    this.currentSession = null;
    this.isInitialized = false;
  }

  /**
   * Get current session
   */
  static getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    if (!this.currentSession) {
      return false;
    }
    
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    const now = Date.now();
    const isValid = now < expiresAt;
    
    if (!isValid) {
      console.log('SessionManager: Session expired');
      this.currentSession = null;
    }
    
    return isValid;
  }

  /**
   * Reset initialization state for testing
   */
  static reset(): void {
    this.currentSession = null;
    this.isInitialized = false;
  }
}
