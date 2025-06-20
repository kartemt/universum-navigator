import React from 'react';

// Security utilities for protecting the application
export class SecurityManager {
  private static instance: SecurityManager;
  private requestCount = new Map<string, { count: number; timestamp: number }>();
  private readonly RATE_LIMIT = 100; // requests per minute
  private readonly RATE_WINDOW = 60000; // 1 minute

  static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  // Rate limiting to prevent scraping and abuse
  checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const userRequest = this.requestCount.get(identifier);

    if (!userRequest) {
      this.requestCount.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    // Reset if window expired
    if (now - userRequest.timestamp > this.RATE_WINDOW) {
      this.requestCount.set(identifier, { count: 1, timestamp: now });
      return true;
    }

    // Check if limit exceeded
    if (userRequest.count >= this.RATE_LIMIT) {
      console.warn(`Rate limit exceeded for identifier: ${identifier}`);
      return false;
    }

    // Increment count
    userRequest.count++;
    return true;
  }

  // Generate client fingerprint for tracking
  generateFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Client fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  }

  // Detect automated requests/bots
  detectBot(): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i, 
      /curl/i, /wget/i, /python/i, /axios/i
    ];
    
    const userAgent = navigator.userAgent;
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  // Protect against content scraping
  protectContent(): void {
    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Disable text selection on sensitive content
    document.addEventListener('selectstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.protected-content')) {
        e.preventDefault();
      }
    });

    // Disable F12, Ctrl+Shift+I, Ctrl+U
    document.addEventListener('keydown', (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        console.warn('Developer tools access attempt detected');
      }
    });

    // Detect DevTools opening
    let devtools = { open: false };
    const threshold = 160;
    
    setInterval(() => {
      if (
        window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold
      ) {
        if (!devtools.open) {
          devtools.open = true;
          console.warn('Developer tools detected');
          // Could implement additional protection here
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }

  // Obfuscate email addresses and sensitive data
  obfuscateEmail(email: string): string {
    const [user, domain] = email.split('@');
    const obfuscatedUser = user.charAt(0) + '*'.repeat(user.length - 2) + user.charAt(user.length - 1);
    const obfuscatedDomain = domain.charAt(0) + '*'.repeat(domain.length - 2) + domain.charAt(domain.length - 1);
    return `${obfuscatedUser}@${obfuscatedDomain}`;
  }
}

// Content protection decorator
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
