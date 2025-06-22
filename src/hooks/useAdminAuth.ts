
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
    // Check for existing session
    const checkSession = () => {
      const savedSession = localStorage.getItem('admin_session');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          if (new Date(sessionData.expiresAt) > new Date()) {
            setSession(sessionData);
          } else {
            localStorage.removeItem('admin_session');
          }
        } catch (error) {
          console.error('Invalid session data:', error);
          localStorage.removeItem('admin_session');
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('admin-login', {
      body: { email, password }
    });

    if (error) {
      throw new Error(error.message || 'Login failed');
    }

    if (data?.success && data?.sessionToken) {
      const sessionData = {
        sessionToken: data.sessionToken,
        expiresAt: data.expiresAt,
        admin: data.admin
      };
      
      localStorage.setItem('admin_session', JSON.stringify(sessionData));
      setSession(sessionData);
      return sessionData;
    } else {
      throw new Error(data?.error || 'Login failed');
    }
  };

  const logout = async () => {
    if (session) {
      try {
        await supabase.functions.invoke('admin-logout', {
          headers: {
            'Authorization': `Bearer ${session.sessionToken}`
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    localStorage.removeItem('admin_session');
    setSession(null);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!session) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await supabase.functions.invoke('change-admin-password', {
      headers: {
        'Authorization': `Bearer ${session.sessionToken}`
      },
      body: { currentPassword, newPassword }
    });

    if (error) {
      throw new Error(error.message || 'Password change failed');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Password change failed');
    }

    return data;
  };

  const getAuthHeaders = () => {
    if (!session) return {};
    return {
      'Authorization': `Bearer ${session.sessionToken}`
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
