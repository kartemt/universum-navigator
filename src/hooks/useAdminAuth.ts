
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

  // Debug logging helper - only use in useEffect or event handlers
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] useAdminAuth: ${message}`);
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        addDebugLog('Initializing authentication from memory...');
        
        const existingSession = await SessionManager.initializeSession();
        
        if (!isMounted) {
          addDebugLog('Component unmounted, skipping state update');
          return;
        }
        
        addDebugLog(`Session initialization result: ${existingSession ? 'session found' : 'no session'}`);
        
        if (existingSession && SessionManager.isSessionValid()) {
          addDebugLog(`Valid session found for: ${existingSession.admin.email}`);
          setSession(existingSession);
          setAuthState('authenticated');
          logger.debug('Valid admin session restored from memory');
        } else {
          addDebugLog('No valid session found');
          setSession(null);
          setAuthState('unauthenticated');
          logger.debug('No valid admin session found');
        }
      } catch (error) {
        addDebugLog(`Failed to initialize session: ${error}`);
        console.error('useAdminAuth: Failed to initialize session:', error);
        
        if (!isMounted) return;
        
        setSession(null);
        setAuthState('unauthenticated');
        logger.error('Failed to initialize session');
      }
    };

    initializeAuth();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      addDebugLog(`Starting login process for: ${email}`);
      setAuthState('loading');
      
      const sessionData = await SessionManager.createSession(email, password);
      addDebugLog(`Login successful, session created for: ${sessionData.admin.email}`);
      
      // Update both session and auth state immediately
      setSession(sessionData);
      setAuthState('authenticated');
      
      // Add a small delay to ensure state is fully updated
      setTimeout(() => {
        addDebugLog(`Post-login state verification: session=${!!sessionData}, authState=authenticated`);
      }, 100);
      
      logger.info('Admin login successful', { email });
      return sessionData;
    } catch (error: any) {
      addDebugLog(`Login error: ${error.message}`);
      console.error('useAdminAuth: Login error:', error);
      setSession(null);
      setAuthState('unauthenticated');
      logger.error('Admin login error', { email });
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      addDebugLog('Starting password change...');
      
      await SessionManager.changePassword(currentPassword, newPassword);
      addDebugLog('Password changed successfully');
      
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
    logger.info('Admin logout completed');
  };

  // Enhanced isAuthenticated logic with additional validation
  const isAuthenticated = authState === 'authenticated' && !!session && SessionManager.isSessionValid();
  const isLoading = authState === 'loading';

  // Debug current state
  useEffect(() => {
    if (session || authState !== 'loading') {
      addDebugLog(`Current state: isAuthenticated=${isAuthenticated}, authState=${authState}, hasSession=${!!session}`);
    }
  }, [isAuthenticated, authState, session]);

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
