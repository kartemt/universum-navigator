
import { useState, useEffect } from 'react';
import { SessionManager } from '@/utils/sessionManager';
import { logger, GENERIC_ERRORS } from '@/utils/logger';

interface AdminSession {
  sessionToken: string;
  expiresAt: string;
  admin: {
    id: string;
    email: string;
  };
}

type AuthState = 'loading' | 'authenticated' | 'unauthenticated';

export const useAdminAuth = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');

  // Debug logging helper
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] useAdminAuth: ${message}`);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        addDebugLog('Initializing authentication...');
        
        const existingSession = await SessionManager.initializeSession();
        addDebugLog(`Session initialization result: ${existingSession ? 'session found' : 'no session'}`);
        
        if (existingSession && SessionManager.isSessionValid()) {
          addDebugLog(`Valid session found for: ${existingSession.admin.email}`);
          setSession(existingSession);
          setAuthState('authenticated');
          logger.debug('Valid secure admin session restored');
        } else {
          addDebugLog('No valid session found');
          setSession(null);
          setAuthState('unauthenticated');
          logger.debug('No valid secure admin session found');
        }
      } catch (error) {
        addDebugLog(`Failed to initialize session: ${error}`);
        console.error('useAdminAuth: Failed to initialize session:', error);
        setSession(null);
        setAuthState('unauthenticated');
        logger.error('Failed to initialize secure session');
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      addDebugLog(`Starting login process for: ${email}`);
      setAuthState('loading');
      
      const sessionData = await SessionManager.createSession(email, password);
      addDebugLog(`Login successful, session created for: ${sessionData.admin.email}`);
      
      setSession(sessionData);
      setAuthState('authenticated');
      
      logger.info('Secure admin login successful', { email });
      return sessionData;
    } catch (error: any) {
      addDebugLog(`Login error: ${error.message}`);
      console.error('useAdminAuth: Login error:', error);
      setSession(null);
      setAuthState('unauthenticated');
      logger.error('Secure admin login error', { email });
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      addDebugLog('Starting password change...');
      
      await SessionManager.changePassword(currentPassword, newPassword);
      addDebugLog('Password changed successfully');
      
      // After password change, all sessions are invalidated
      // User will need to login again
      setSession(null);
      setAuthState('unauthenticated');
      
      logger.info('Admin password changed, session cleared');
    } catch (error: any) {
      addDebugLog(`Password change error: ${error.message}`);
      console.error('useAdminAuth: Password change error:', error);
      logger.error('Admin password change error');
      throw error;
    }
  };

  const logout = async () => {
    addDebugLog('Logging out...');
    setAuthState('loading');
    await SessionManager.destroySession();
    setSession(null);
    setAuthState('unauthenticated');
    logger.info('Secure admin logout completed');
  };

  const isAuthenticated = authState === 'authenticated' && !!session && SessionManager.isSessionValid();
  const isLoading = authState === 'loading';
  
  addDebugLog(`Current state: session=${!!session}, isAuthenticated=${isAuthenticated}, isLoading=${isLoading}, authState=${authState}, sessionEmail=${session?.admin?.email}`);

  return {
    session,
    isAuthenticated,
    isLoading,
    authState,
    login,
    logout,
    changePassword
  };
};
