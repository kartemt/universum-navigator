
import { SessionData } from './types';

export class SessionValidator {
  // Debug logging helper - only when needed
  private static addDebugLog(message: string) {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] SessionValidator: ${message}`);
    }
  }

  static isSessionValid(session: SessionData | null): boolean {
    if (!session) {
      this.addDebugLog('Session validation failed: no session');
      return false;
    }
    
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    const isValid = now < expiresAt;
    
    this.addDebugLog(`Session validation: expires=${new Date(expiresAt).toLocaleTimeString()}, now=${new Date(now).toLocaleTimeString()}, valid=${isValid}`);
    
    if (!isValid) {
      this.addDebugLog('Session expired');
    }
    
    return isValid;
  }

  static validateSessionAfterCreation(session: SessionData): boolean {
    const isValid = this.isSessionValid(session);
    this.addDebugLog(`Session validity check after creation: ${isValid}`);
    return isValid;
  }
}
