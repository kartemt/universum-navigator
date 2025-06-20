
import { useState, useEffect } from 'react';
import { SecurityManager } from '@/utils/security';

export const useSecurity = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>('');

  useEffect(() => {
    const security = SecurityManager.getInstance();
    
    // Generate client fingerprint
    const fp = security.generateFingerprint();
    setFingerprint(fp);

    // Check if request is from bot
    const isBot = security.detectBot();
    if (isBot) {
      console.warn('Bot detected, limiting functionality');
      setIsBlocked(true);
    }

    // Check rate limiting
    const canProceed = security.checkRateLimit(fp);
    if (!canProceed) {
      setIsBlocked(true);
    }
  }, []);

  const checkRateLimit = (identifier?: string) => {
    const security = SecurityManager.getInstance();
    const id = identifier || fingerprint;
    return security.checkRateLimit(id);
  };

  return {
    isBlocked,
    fingerprint,
    checkRateLimit,
    isBot: SecurityManager.getInstance().detectBot()
  };
};
