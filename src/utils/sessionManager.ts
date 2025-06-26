
import { logger } from '@/utils/logger';
import { SessionStorage } from './session/sessionStorage';
import { SessionValidator } from './session/sessionValidator';
import { SessionApiClient } from './session/sessionApiClient';
import { SessionData } from './session/types';

export class SessionManager {
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
    if (SessionStorage.isSessionInitialized()) {
      const currentSession = SessionStorage.getCurrentSession();
      this.addDebugLog(`Already initialized, returning cached session: ${!!currentSession}`);
      return currentSession;
    }

    this.addDebugLog('Initializing session from memory...');
    
    const currentSession = SessionStorage.getCurrentSession();
    if (currentSession && SessionValidator.isSessionValid(currentSession)) {
      this.addDebugLog(`Valid session found in memory: ${currentSession.admin.email}`);
      SessionStorage.setInitialized(true);
      return currentSession;
    } else {
      this.addDebugLog('No valid session in memory');
      SessionStorage.setCurrentSession(null);
      SessionStorage.setInitialized(true);
      return null;
    }
  }

  /**
   * Create new session with token
   */
  static async createSession(email: string, password: string): Promise<SessionData> {
    try {
      const sessionData = await SessionApiClient.login({ email, password });
      
      SessionStorage.setCurrentSession(sessionData);
      SessionStorage.setInitialized(true);
      
      // Verify session is valid immediately after creation
      SessionValidator.validateSessionAfterCreation(sessionData);
      
      return sessionData;
    } catch (error: any) {
      this.addDebugLog(`Session creation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Change admin password
   */
  static async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const currentSession = SessionStorage.getCurrentSession();
      if (!currentSession) {
        throw new Error('No active session');
      }

      await SessionApiClient.changePassword(
        { currentPassword, newPassword },
        currentSession.sessionToken
      );

      // Clear session after password change
      SessionStorage.setCurrentSession(null);
      SessionStorage.setInitialized(false);
      
      logger.info('Admin password changed, session cleared');
    } catch (error: any) {
      this.addDebugLog(`Password change error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Destroy session
   */
  static async destroySession(): Promise<void> {
    this.addDebugLog('Destroying session...');
    
    const currentSession = SessionStorage.getCurrentSession();
    if (currentSession) {
      await SessionApiClient.logout(currentSession.sessionToken);
    }
    
    SessionStorage.reset();
  }

  /**
   * Get current session
   */
  static getCurrentSession(): SessionData | null {
    return SessionStorage.getCurrentSession();
  }

  /**
   * Check if session is valid and not expired
   */
  static isSessionValid(): boolean {
    const currentSession = SessionStorage.getCurrentSession();
    const isValid = SessionValidator.isSessionValid(currentSession);
    
    if (!isValid && currentSession) {
      SessionStorage.setCurrentSession(null);
    }
    
    return isValid;
  }

  /**
   * Reset initialization state for testing
   */
  static reset(): void {
    this.addDebugLog('Resetting session manager');
    SessionStorage.reset();
  }
}

// Re-export types for backward compatibility
export type { SessionData } from './session/types';
