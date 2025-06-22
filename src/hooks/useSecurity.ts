
import { useState, useEffect } from 'react';
import { SecurityManager } from '@/utils/security';

export const useSecurity = () => {
  const [isBot, setIsBot] = useState(false);

  useEffect(() => {
    const security = SecurityManager.getInstance();
    
    // Simple bot detection for UX purposes
    const detectedBot = security.detectBot();
    setIsBot(detectedBot);
  }, []);

  return {
    isBlocked: false, // Removed client-side blocking
    fingerprint: '', // Removed fingerprinting
    checkRateLimit: () => true, // Removed client-side rate limiting
    isBot
  };
};
