
import { supabase } from '@/integrations/supabase/client';
import { SessionData, LoginCredentials, PasswordChangeRequest } from './types';
import { logger, GENERIC_ERRORS } from '@/utils/logger';

export class SessionApiClient {
  // Debug logging helper - only when needed
  private static addDebugLog(message: string) {
    if (import.meta.env.DEV) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] SessionApiClient: ${message}`);
    }
  }

  static async login(credentials: LoginCredentials): Promise<SessionData> {
    try {
      this.addDebugLog(`Creating session for: ${credentials.email}`);
      
      const requestPayload = { 
        email: credentials.email.trim(), 
        password: credentials.password 
      };
      
      this.addDebugLog(`Request payload prepared: ${JSON.stringify({ email: requestPayload.email, password: '[REDACTED]' })}`);
      
      const { data, error } = await supabase.functions.invoke('admin-login-secure', {
        body: requestPayload
      });

      this.addDebugLog(`admin-login-secure response: error=${!!error}, data=${JSON.stringify(data)}`);

      if (error) {
        this.addDebugLog(`Login function error: ${error.message}`);
        console.error('SessionApiClient: Login function error:', error);
        
        if (error.message.includes('400')) {
          throw new Error('Неверный формат данных запроса');
        } else if (error.message.includes('401')) {
          throw new Error('Неверные данные для входа');
        } else if (error.message.includes('423')) {
          throw new Error('Аккаунт временно заблокирован');
        }
        
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }

      if (data?.success && data?.session) {
        this.addDebugLog(`Session created successfully for: ${data.session.admin.email}`);
        logger.info('Secure admin session created', { email: credentials.email });
        return data.session;
      } else {
        this.addDebugLog(`Login failed: ${data?.error || 'Unknown error'}`);
        console.warn('SessionApiClient: Login failed:', data?.error);
        
        if (data?.error) {
          if (data.error.includes('Invalid credentials')) {
            throw new Error('Неверный email или пароль');
          } else if (data.error.includes('locked')) {
            throw new Error('Аккаунт заблокирован из-за многократных неудачных попыток');
          }
          throw new Error(data.error);
        }
        
        throw new Error(GENERIC_ERRORS.AUTH_FAILED);
      }
    } catch (error: any) {
      this.addDebugLog(`Session creation error: ${error.message}`);
      console.error('SessionApiClient: Session creation error:', error);
      throw error;
    }
  }

  static async changePassword(request: PasswordChangeRequest, sessionToken: string): Promise<void> {
    try {
      this.addDebugLog('Changing password...');
      
      const { data, error } = await supabase.functions.invoke('change-admin-password', {
        body: request,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      });

      if (error) {
        this.addDebugLog(`Password change function error: ${error.message}`);
        console.error('SessionApiClient: Password change function error:', error);
        throw new Error('Failed to change password');
      }

      if (data?.success) {
        this.addDebugLog('Password changed successfully');
        logger.info('Admin password changed successfully');
      } else {
        this.addDebugLog(`Password change failed: ${data?.error}`);
        console.warn('SessionApiClient: Password change failed:', data?.error);
        throw new Error(data?.error || 'Failed to change password');
      }
    } catch (error: any) {
      this.addDebugLog(`Password change error: ${error.message}`);
      console.error('SessionApiClient: Password change error:', error);
      throw error;
    }
  }

  static async logout(sessionToken: string): Promise<void> {
    try {
      this.addDebugLog('Logging out...');
      
      await supabase.functions.invoke('admin-logout-secure', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      this.addDebugLog('Logout successful');
    } catch (error) {
      this.addDebugLog(`Logout error: ${error}`);
      console.error('SessionApiClient: Logout error:', error);
    }
  }
}
