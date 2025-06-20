
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, BookOpen } from 'lucide-react';
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
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto bg-white/10 backdrop-blur-sm p-4 rounded-2xl w-fit mb-6 border border-white/20">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-10 w-10 text-white" />
              <div className="text-left">
                <div className="text-white font-bold text-lg">УниверсУм</div>
                <div className="text-white/80 text-sm">Знаний</div>
              </div>
            </div>
          </div>
          <CardTitle className="text-3xl text-white font-bold mb-2">
            Админ-панель
          </CardTitle>
          <CardDescription className="text-white/80 text-lg">
            Панель управления базой знаний
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white font-medium">
                Email администратора
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white font-medium">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 backdrop-blur-sm"
              />
            </div>

            <Button 
              type="submit" 
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full bg-white/20 hover:bg-white/30 text-white font-semibold py-3 backdrop-blur-sm border border-white/30 transition-all duration-200"
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
