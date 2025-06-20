
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Attempting admin authentication with email:', email);
      
      const { data, error } = await supabase.functions.invoke('verify-admin', {
        body: { 
          email: email.trim(),
          password: password 
        }
      });

      if (error) {
        console.error('Authentication error:', error);
        throw new Error(error.message || 'Ошибка проверки пароля');
      }

      if (data?.success) {
        sessionStorage.setItem('admin_authenticated', 'true');
        sessionStorage.setItem('admin_email', email);
        onAuthenticated();
        toast({
          title: 'Доступ разрешен',
          description: 'Добро пожаловать в админ-панель УниверсУм',
        });
      } else {
        toast({
          title: 'Неверные данные',
          description: 'Проверьте email и пароль',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast({
        title: 'Ошибка аутентификации',
        description: err.message || 'Не удалось выполнить вход',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full bg-universum-blue hover:bg-universum-dark-blue text-white font-semibold py-3 transition-all duration-200"
            >
              {isLoading ? (
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
        </CardContent>
      </Card>
    </div>
  );
};
