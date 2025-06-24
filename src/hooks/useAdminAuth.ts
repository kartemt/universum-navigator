
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

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const existingSession = await SessionManager.initializeSession();
        if (existingSession && SessionManager.isSessionValid()) {
          setSession(existingSession);
          logger.debug('Valid secure admin session restored');
        } else {
          logger.debug('No valid secure admin session found');
        }
      } catch (error) {
        logger.error('Failed to initialize secure session');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Set up session refresh monitoring
    const refreshInterval = setInterval(async () => {
      const currentSession = SessionManager.getCurrentSession();
      if (currentSession && !SessionManager.isSessionValid()) {
        logger.debug('Session expired, clearing state');
        setSession(null);
      }
    }, 60000); // Check every minute

    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const sessionData = await SessionManager.createSession(email, password);
      setSession(sessionData);
      logger.info('Secure admin login successful', { email });
      return sessionData;
    } catch (error: any) {
      logger.error('Secure admin login error', { email });
      throw error;
    }
  };

  const logout = async () => {
    await SessionManager.destroySession();
    setSession(null);
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
        logger.debug('Session refreshed successfully');
        return refreshedSession;
      } else {
        setSession(null);
        logger.debug('Session refresh failed, user logged out');
        return null;
      }
    } catch (error) {
      logger.error('Session refresh error');
      setSession(null);
      return null;
    }
  };

  const getAuthHeaders = () => {
    return SessionManager.getAuthHeaders();
  };

  return {
    session,
    isAuthenticated: !!session && SessionManager.isSessionValid(),
    isLoading,
    login,
    logout,
    changePassword,
    refreshSession,
    getAuthHeaders
  };
};
