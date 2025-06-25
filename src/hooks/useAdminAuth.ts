
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export const useAdminAuth = () => {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'authenticated' | 'unauthenticated'>('idle');

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('useAdminAuth: Initializing authentication...');
        setIsLoading(true);
        setAuthState('loading');
        
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
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Настраиваем мониторинг обновления сессии
    const refreshInterval = setInterval(async () => {
      const currentSession = SessionManager.getCurrentSession();
      if (currentSession && !SessionManager.isSessionValid()) {
        console.log('useAdminAuth: Session expired, clearing state');
        logger.debug('Session expired, clearing state');
        setSession(null);
        setAuthState('unauthenticated');
      }
    }, 60000); // Проверяем каждую минуту

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('useAdminAuth: Starting login process for:', email);
      setIsLoading(true);
      setAuthState('loading');
      
      const sessionData = await SessionManager.createSession(email, password);
      console.log('useAdminAuth: Login successful, session created for:', sessionData.admin.email);
      
      setSession(sessionData);
      setAuthState('authenticated');
      setIsLoading(false);
      
      logger.info('Secure admin login successful', { email });
      return sessionData;
    } catch (error: any) {
      console.error('useAdminAuth: Login error:', error);
      setSession(null);
      setAuthState('unauthenticated');
      setIsLoading(false);
      logger.error('Secure admin login error', { email });
      throw error;
    }
  };

  const logout = async () => {
    console.log('useAdminAuth: Logging out...');
    setIsLoading(true);
    await SessionManager.destroySession();
    setSession(null);
    setAuthState('unauthenticated');
    setIsLoading(false);
    logger.info('Secure admin logout completed');
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) {
      throw new Error(GENERIC_ERRORS.ACCESS_DENIED);
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-admin-password', {
        headers: SessionManager.getAuthHeaders(),
        body: { currentPassword, newPassword }
      });

      if (error) {
        logger.error('Secure password change function error');
        throw new Error(GENERIC_ERRORS.OPERATION_FAILED);
      }

      if (!data?.success) {
        logger.warn('Secure password change failed');
        throw new Error(data?.error || GENERIC_ERRORS.OPERATION_FAILED);
      }

      logger.info('Admin password changed securely');
      return data;
    } catch (error: any) {
      logger.error('Secure password change error');
      throw error;
    }
  };

  const refreshSession = async () => {
    try {
      const refreshedSession = await SessionManager.refreshSession();
      if (refreshedSession) {
        setSession(refreshedSession);
        setAuthState('authenticated');
        logger.debug('Session refreshed successfully');
        return refreshedSession;
      } else {
        setSession(null);
        setAuthState('unauthenticated');
        logger.debug('Session refresh failed, user logged out');
        return null;
      }
    } catch (error) {
      logger.error('Session refresh error');
      setSession(null);
      setAuthState('unauthenticated');
      return null;
    }
  };

  const getAuthHeaders = () => {
    return SessionManager.getAuthHeaders();
  };

  const isAuthenticated = authState === 'authenticated' && !!session && SessionManager.isSessionValid();
  
  console.log('useAdminAuth state:', { 
    session: !!session, 
    isAuthenticated, 
    isLoading,
    authState,
    sessionValid: SessionManager.isSessionValid(),
    sessionEmail: session?.admin?.email
  });

  return {
    session,
    isAuthenticated,
    isLoading,
    authState,
    login,
    logout,
    changePassword,
    refreshSession,
    getAuthHeaders
  };
};
