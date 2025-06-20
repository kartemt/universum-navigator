
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [email, setEmail] = useState('kartem2001@yahoo.com');
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
          description: 'Добро пожаловать в админ-панель UniversUm',
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-100 p-3 rounded-full w-fit mb-4">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-gray-800">Админ-панель UniversUm</CardTitle>
          <CardDescription className="text-gray-600">
            Введите данные для доступа к панели администратора
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="kartem2001@yahoo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверяем...
                </>
              ) : (
                "Войти в админ-панель"
              )}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            <strong>Данные для входа:</strong><br />
            Email: kartem2001@yahoo.com<br />
            Пароль: admin123
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
