
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Rocket, Shield, AlertTriangle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { logger, GENERIC_ERRORS } from '@/utils/logger';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading, authState } = useAdminAuth();

  // Автоматический переход, если пользователь уже авторизован
  useEffect(() => {
    console.log('AdminAuth: Auth state changed:', { isAuthenticated, authState });
    if (isAuthenticated && authState === 'authenticated') {
      console.log('User is authenticated, calling onAuthenticated');
      setTimeout(() => onAuthenticated(), 100);
    }
  }, [isAuthenticated, authState, onAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password) {
      toast({
        title: 'Ошибка',
        description: GENERIC_ERRORS.INVALID_INPUT,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    console.log('Starting login process with email:', email.trim());

    try {
      console.log('Attempting login...');
      const sessionData = await login(email.trim(), password);
      console.log('Login successful, session data:', sessionData);
      
      toast({
        title: 'Доступ разрешен',
        description: 'Добро пожаловать в админ-панель УниверсУм',
      });

      // Принудительный вызов onAuthenticated с задержкой
      setTimeout(() => {
        console.log('Calling onAuthenticated after delay');
        onAuthenticated();
      }, 500);

    } catch (error: any) {
      console.error('Admin authentication failed:', error);
      logger.error('Admin authentication failed', { email: email.trim() });
      
      let errorMessage = GENERIC_ERRORS.AUTH_FAILED;
      
      if (error.message.includes('Too many login attempts')) {
        errorMessage = 'Слишком много попыток входа. Попробуйте позже.';
      } else if (error.message.includes('Account is temporarily locked')) {
        errorMessage = 'Аккаунт временно заблокирован из-за многократных неудачных попыток входа.';
      } else if (error.message.includes('Invalid credentials')) {
        errorMessage = 'Неверный email или пароль';
      } else if (error.message.includes('Access denied from this IP')) {
        errorMessage = 'Доступ запрещен с данного IP-адреса';
      }
      
      toast({
        title: 'Ошибка аутентификации',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Если загружается или уже авторизован, показываем загрузку
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen bg-universum-gradient flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">
            {isLoading ? 'Проверка сессии...' : 'Переход в админ-панель...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-universum-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto bg-universum-blue p-4 rounded-2xl w-fit mb-6">
            <div className="flex items-center space-x-3">
              <Rocket className="h-10 w-10 text-white" />
              <div className="text-left">
                <div className="text-white font-bold text-lg font-akrobat">УниверсУм</div>
                <div className="text-white/90 text-sm">Знаний</div>
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl text-universum-blue font-bold mb-2 font-akrobat">
            Админ-панель
          </CardTitle>
          <CardDescription className="text-universum-gray text-lg">
            Панель управления базой знаний
          </CardDescription>
          
          <div className="flex items-center justify-center gap-4 text-xs text-universum-gray mt-4">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-green-600" />
              <span>Защищённая аутентификация</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-3 w-3 text-blue-600" />
              <span>SHA-256 шифрование</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-universum-blue font-medium">
                Email администратора
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-universum-blue font-medium">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                disabled={isSubmitting}
              />
              <div className="text-xs text-gray-500 mt-1">
                Минимум 12 символов, включая заглавные и строчные буквы, цифры и спецсимволы
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting || !email.trim() || !password.trim()}
              className="w-full bg-universum-blue hover:bg-universum-dark-blue text-white font-semibold py-3 transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Проверяем доступ...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-5 w-5" />
                  Войти в панель
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-amber-800">
                <div className="font-medium mb-1">Безопасность:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Аккаунт блокируется на 30 минут после 5 неудачных попыток</li>
                  <li>Все действия администратора логируются</li>
                  <li>Сессии автоматически истекают через 1 час</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
