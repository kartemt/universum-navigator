
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

  // Debug logging helper - only when needed
  private static addDebugLog(message: string) {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] SessionManager: ${message}`);
    }
  }

  /**
   * Initialize session from memory (no server calls)
   */
  static async initializeSession(): Promise<SessionData | null> {
    if (this.isInitialized) {
      this.addDebugLog(`Already initialized, returning cached session: ${!!this.currentSession}`);
      return this.currentSession;
    }

    this.addDebugLog('Initializing session from memory...');
    
    // Simply check if we have a valid session in memory
    if (this.currentSession && this.isSessionValid()) {
      this.addDebugLog(`Valid session found in memory: ${this.currentSession.admin.email}`);
      this.isInitialized = true;
      return this.currentSession;
    } else {
      this.addDebugLog('No valid session in memory');
      this.currentSession = null;
      this.isInitialized = true;
      return null;
    }
  }

  /**
   * Create new session with token
   */
  static async createSession(email: string, password: string): Promise<SessionData> {
    try {
      this.addDebugLog(`Creating session for: ${email}`);
      
      const requestPayload = { 
        email: email.trim(), 
        password: password 
      };
      
      this.addDebugLog(`Request payload prepared: ${JSON.stringify({ email: requestPayload.email, password: '[REDACTED]' })}`);
      
      const { data, error } = await supabase.functions.invoke('admin-login-secure', {
        body: requestPayload
      });

      this.addDebugLog(`admin-login-secure response: error=${!!error}, data=${JSON.stringify(data)}`);

      if (error) {
        this.addDebugLog(`Login function error: ${error.message}`);
        console.error('SessionManager: Login function error:', error);
        
        if (error.message.includes('400')) {
          throw new Error('Неверный формат данных запроса');
        } else if (error.message.includes('401')) {
          throw new Error('Неверные данные для входа');
        } else if (error.message.includes('423')) {
          throw new Error('Аккаунт временно заблокирован');
        }
        
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.session) {
        this.addDebugLog(`Session created successfully for: ${data.session.admin.email}`);
        this.currentSession = data.session;
        this.isInitialized = true;
        
        // Verify session is valid immediately after creation
        const isValid = this.isSessionValid();
        this.addDebugLog(`Session validity check after creation: ${isValid}`);
        
        logger.info('Secure admin session created', { email });
        return data.session;
      } else {
        this.addDebugLog(`Login failed: ${data?.error || 'Unknown error'}`);
        console.warn('SessionManager: Login failed:', data?.error);
        
        if (data?.error) {
          if (data.error.includes('Invalid credentials')) {
            throw new Error('Неверный email или пароль');
          } else if (data.error.includes('locked')) {
            throw new Error('Аккаунт заблокирован из-за многократных неудачных попыток');
          }
          throw new Error(data.error);
        }
        
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      this.addDebugLog(`Session creation error: ${error.message}`);
      console.error('SessionManager: Session creation error:', error);
      throw error;
    }
  }

  /**
   * Change admin password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      this.addDebugLog('Changing password...');
      
      const { data, error } = await supabase.functions.invoke('change-admin-password', {
        body: { currentPassword, newPassword },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentSession?.sessionToken}`
        }
      });

      if (error) {
        this.addDebugLog(`Password change function error: ${error.message}`);
        console.error('SessionManager: Password change function error:', error);
        throw new Error('Failed to change password');
      }

      if (data?.success) {
        this.addDebugLog('Password changed successfully');
        this.currentSession = null;
        this.isInitialized = false;
        logger.info('Admin password changed successfully');
      } else {
        this.addDebugLog(`Password change failed: ${data?.error}`);
        console.warn('SessionManager: Password change failed:', data?.error);
        throw new Error(data?.error || 'Failed to change password');
      }
    } catch (error: any) {
      this.addDebugLog(`Password change error: ${error.message}`);
      console.error('SessionManager: Password change error:', error);
      throw error;
    }
  }

  /**
   * Destroy session
   */
  static async destroySession(): Promise<void> {
    this.addDebugLog('Destroying session...');
    
    try {
      await supabase.functions.invoke('admin-logout-secure', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.currentSession?.sessionToken}`
        }
      });
      this.addDebugLog('Logout successful');
    } catch (error) {
      this.addDebugLog(`Logout error: ${error}`);
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
      this.addDebugLog('Session validation failed: no session');
      return false;
    }
    
    const expiresAt = new Date(this.currentSession.expiresAt).getTime();
    const now = Date.now();
    const isValid = now < expiresAt;
    
    this.addDebugLog(`Session validation: expires=${new Date(expiresAt).toLocaleTimeString()}, now=${new Date(now).toLocaleTimeString()}, valid=${isValid}`);
    
    if (!isValid) {
      this.addDebugLog('Session expired');
      this.currentSession = null;
    }
    
    return isValid;
  }

  /**
   * Reset initialization state for testing
   */
  static reset(): void {
    this.addDebugLog('Resetting session manager');
    this.currentSession = null;
    this.isInitialized = false;
  }
}
