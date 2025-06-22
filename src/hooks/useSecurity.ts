
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
    isBot,
    // Simplified API - no more client-side rate limiting
    checkRateLimit: () => true
  };
};
