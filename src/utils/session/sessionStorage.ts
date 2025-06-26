
import { SessionData } from './types';

export class SessionStorage {
  private static currentSession: SessionData | null = null;
  private static isInitialized = false;

  // Debug logging helper - only when needed
  private static addDebugLog(message: string) {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] SessionStorage: ${message}`);
    }
  }

  static getCurrentSession(): SessionData | null {
    return this.currentSession;
  }

  static setCurrentSession(session: SessionData | null): void {
    this.addDebugLog(`Setting session: ${session ? `${session.admin.email}` : 'null'}`);
    this.currentSession = session;
  }

  static isSessionInitialized(): boolean {
    return this.isInitialized;
  }

  static setInitialized(initialized: boolean): void {
    this.addDebugLog(`Setting initialized state: ${initialized}`);
    this.isInitialized = initialized;
  }

  static hasValidSessionInMemory(): boolean {
    return !!this.currentSession;
  }

  static reset(): void {
    this.addDebugLog('Resetting session storage');
    this.currentSession = null;
    this.isInitialized = false;
  }
}
