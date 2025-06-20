
import React from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle } from 'lucide-react';

interface SecurityWrapperProps {
  children: React.ReactNode;
  protectContent?: boolean;
}

export const SecurityWrapper = ({ children, protectContent = false }: SecurityWrapperProps) => {
  const { isBlocked, isBot } = useSecurity();

  // Block suspected bots or rate-limited users
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              Доступ временно ограничен. Пожалуйста, попробуйте позже или обратитесь к администратору.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  // Show warning for suspected bots
  const content = (
    <div className={protectContent ? 'protected-content' : ''}>
      {isBot && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 mb-4 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800 text-sm">
            <Shield className="h-4 w-4" />
            Обнаружена автоматизированная активность. Функциональность может быть ограничена.
          </div>
        </div>
      )}
      {children}
    </div>
  );

  return content;
};
