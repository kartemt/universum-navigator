
import React from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';
import { SecurityHeadersManager } from '@/utils/security';
import { setupCSPReporting } from '@/utils/securityHeaders';

interface SecurityWrapperProps {
  children: React.ReactNode;
  protectContent?: boolean;
}

export const SecurityWrapper = ({ children, protectContent = false }: SecurityWrapperProps) => {
  const { isBot } = useSecurity();

  React.useEffect(() => {
    const securityManager = SecurityHeadersManager.getInstance();
    
    // Apply runtime security measures
    securityManager.applyRuntimeSecurity();
    
    // Setup security monitoring
    securityManager.setupSecurityMonitoring();
    
    // Setup CSP violation reporting
    setupCSPReporting();
    
    // Validate secure context
    if (!securityManager.isSecureContext() && import.meta.env.PROD) {
      console.warn('Application is not running in a secure context (HTTPS)');
    }
    
    // Log security initialization
    console.log('Security measures initialized:', {
      secureContext: securityManager.isSecureContext(),
      environment: import.meta.env.PROD ? 'production' : 'development',
      cspReporting: 'enabled'
    });
  }, []);

  const content = (
    <div className={protectContent ? 'protected-content' : ''}>
      {isBot && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <Shield className="h-4 w-4" />
            Обнаружена автоматизированная активность. Некоторые функции могут работать по-разному.
          </div>
        </div>
      )}
      {children}
    </div>
  );

  return content;
};
