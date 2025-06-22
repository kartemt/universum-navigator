import React from 'react';

// Simplified security utilities focused on essential user experience features
export class SecurityManager {
  private static instance: SecurityManager;

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Simple bot detection for UX purposes only (not for security)
  detectBot(): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, 
      /curl/i, /wget/i, /python/i, /axios/i
    ];
    
    const userAgent = navigator.userAgent;
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  // Basic content protection for user experience
  protectContent(): void {
    // Disable right-click context menu on protected content
    document.addEventListener('contextmenu', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.protected-content')) {
        e.preventDefault();
      }
    });

    // Disable text selection on protected content
    document.addEventListener('selectstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.protected-content')) {
        e.preventDefault();
      }
    });
  }

  // Basic email obfuscation for display purposes
  obfuscateEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    
    const obfuscatedUser = user.charAt(0) + '*'.repeat(Math.max(0, user.length - 2)) + user.charAt(user.length - 1);
    const obfuscatedDomain = domain.charAt(0) + '*'.repeat(Math.max(0, domain.length - 2)) + domain.charAt(domain.length - 1);
    return `${obfuscatedUser}@${obfuscatedDomain}`;
  }
}

// Simplified content protection decorator
export function withContentProtection<T extends React.ComponentType<any>>(
  Component: T
): T {
  const ProtectedComponent = (props: any) => {
    React.useEffect(() => {
      const security = SecurityManager.getInstance();
      security.protectContent();
    }, []);

    return React.createElement(Component, props);
  };

  return ProtectedComponent as T;
}

// Enhanced security utilities for comprehensive protection
export class SecurityHeadersManager {
  private static instance: SecurityHeadersManager;

  static getInstance(): SecurityHeadersManager {
    if (!SecurityHeadersManager.instance) {
      SecurityHeadersManager.instance = new SecurityHeadersManager();
    }
    return SecurityHeadersManager.instance;
  }

  // Check if the current environment supports secure features
  isSecureContext(): boolean {
    return window.isSecureContext || location.protocol === 'https:';
  }

  // Validate CSP compliance for dynamic content
  validateCSPCompliance(content: string): boolean {
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /<script[^>]*src=["'](?!https?:\/\/)/i, // External scripts without protocol
      /javascript:/i, // JavaScript protocol
      /data:text\/html/i, // Data URLs with HTML
      /vbscript:/i, // VBScript protocol
      /<object/i, // Object tags
      /<embed/i, // Embed tags
      /<applet/i // Applet tags
    ];

    return !dangerousPatterns.some(pattern => pattern.test(content));
  }

  // Apply runtime security configurations
  applyRuntimeSecurity(): void {
    // Disable right-click context menu in production (optional)
    if (import.meta.env.PROD) {
      document.addEventListener('contextmenu', (e) => {
        if (!(e.target as HTMLElement).closest('.debug-allowed')) {
          e.preventDefault();
        }
      });
    }

    // Disable F12 developer tools in production (optional)
    if (import.meta.env.PROD) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
          e.preventDefault();
        }
      });
    }

    // Clear sensitive data on page unload
    window.addEventListener('beforeunload', () => {
      // Clear any sensitive data from memory
      if ((window as any).sensitiveData) {
        delete (window as any).sensitiveData;
      }
    });
  }

  // Monitor for security violations
  setupSecurityMonitoring(): void {
    // CSP violation reporting
    document.addEventListener('securitypolicyviolation', (e) => {
      console.warn('CSP Violation:', {
        directive: e.violatedDirective,
        blockedURI: e.blockedURI,
        lineNumber: e.lineNumber,
        sourceFile: e.sourceFile
      });
      
      // Log security violations (in production, send to monitoring service)
      if (import.meta.env.PROD) {
        // Send to security monitoring service
        fetch('/api/security/violations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'csp_violation',
            directive: e.violatedDirective,
            blockedURI: e.blockedURI,
            timestamp: new Date().toISOString()
          })
        }).catch(console.error);
      }
    });
  }
}
