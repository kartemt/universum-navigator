import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger, GENERIC_ERRORS } from '@/utils/logger';
import { CSRFProtection } from '@/utils/csrfProtection';

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
    const checkSession = () => {
      const savedSession = localStorage.getItem('admin_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (new Date(sessionData.expiresAt) > new Date()) {
            setSession(sessionData);
            logger.debug('Valid admin session restored');
          } else {
            localStorage.removeItem('admin_session');
            logger.debug('Expired admin session removed');
          }
        } catch (error) {
          logger.error('Invalid session data found');
          localStorage.removeItem('admin_session');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-login', {
        body: { email, password },
        headers: {
          ...CSRFProtection.getHeaders(),
        }
      });

      if (error) {
        logger.error('Admin login function error');
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.sessionToken) {
        const sessionData = {
          sessionToken: data.sessionToken,
          expiresAt: data.expiresAt,
          admin: data.admin
        };
        
        localStorage.setItem('admin_session', JSON.stringify(sessionData));
        setSession(sessionData);
        logger.info('Admin login successful', { email });
        return sessionData;
      } else {
        logger.warn('Admin login failed', { email });
        throw new Error(data?.error || GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      logger.error('Admin login error', { email });
      throw error;
    }
  };

  const logout = async () => {
    if (session) {
      try {
        await supabase.functions.invoke('admin-logout', {
          headers: {
            'Authorization': `Bearer ${session.sessionToken}`,
            ...CSRFProtection.getHeaders(),
          }
        });
        logger.info('Admin logout successful');
      } catch (error) {
        logger.error('Admin logout error');
      }
    }
    
    localStorage.removeItem('admin_session');
    CSRFProtection.clearToken();
    setSession(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) {
      throw new Error(GENERIC_ERRORS.ACCESS_DENIED);
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-admin-password', {
        headers: {
          'Authorization': `Bearer ${session.sessionToken}`,
          ...CSRFProtection.getHeaders(),
        },
        body: { currentPassword, newPassword }
      });

      if (error) {
        logger.error('Password change function error');
        throw new Error(GENERIC_ERRORS.OPERATION_FAILED);
      }

      if (!data?.success) {
        logger.warn('Password change failed');
        throw new Error(data?.error || GENERIC_ERRORS.OPERATION_FAILED);
      }

      logger.info('Admin password changed successfully');
      return data;
    } catch (error: any) {
      logger.error('Password change error');
      throw error;
    }
  };

  const getAuthHeaders = () => {
    if (!session) return {};
    return {
      'Authorization': `Bearer ${session.sessionToken}`,
      ...CSRFProtection.getHeaders(),
    };
  };

  return {
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    logout,
    changePassword,
    getAuthHeaders
  };
};
