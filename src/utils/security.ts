
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
