
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('useAdminAuth: Initializing authentication...');
        
        const existingSession = await SessionManager.initializeSession();
        
        if (existingSession && SessionManager.isSessionValid()) {
          console.log('useAdminAuth: Valid session found for:', existingSession.admin.email);
          setSession(existingSession);
          setAuthState('authenticated');
          logger.debug('Valid secure admin session restored');
        } else {
          console.log('useAdminAuth: No valid session found');
          setSession(null);
          setAuthState('unauthenticated');
          logger.debug('No valid secure admin session found');
        }
      } catch (error) {
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
      console.log('useAdminAuth: Starting login process for:', email);
      setAuthState('loading');
      
      const sessionData = await SessionManager.createSession(email, password);
      console.log('useAdminAuth: Login successful, session created for:', sessionData.admin.email);
      
      setSession(sessionData);
      setAuthState('authenticated');
      
      logger.info('Secure admin login successful', { email });
      return sessionData;
    } catch (error: any) {
      console.error('useAdminAuth: Login error:', error);
      setSession(null);
      setAuthState('unauthenticated');
      logger.error('Secure admin login error', { email });
      throw error;
    }
  };

  const logout = async () => {
    console.log('useAdminAuth: Logging out...');
    setAuthState('loading');
    await SessionManager.destroySession();
    setSession(null);
    setAuthState('unauthenticated');
    logger.info('Secure admin logout completed');
  };

  const isAuthenticated = authState === 'authenticated' && !!session && SessionManager.isSessionValid();
  const isLoading = authState === 'loading';
  
  console.log('useAdminAuth state:', { 
    session: !!session, 
    isAuthenticated, 
    isLoading,
    authState,
    sessionEmail: session?.admin?.email
  });

  return {
    session,
    isAuthenticated,
    isLoading,
    authState,
    login,
    logout
  };
};
