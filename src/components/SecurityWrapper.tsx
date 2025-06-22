
import React from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield } from 'lucide-react';

interface SecurityWrapperProps {
  children: React.ReactNode;
  protectContent?: boolean;
}

export const SecurityWrapper = ({ children, protectContent = false }: SecurityWrapperProps) => {
  const { isBot } = useSecurity();

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
