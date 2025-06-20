
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import bcrypt from 'bcryptjs';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const ADMIN_EMAIL = 'admin@example.com';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('admins')
        .select('password_hash')
        .eq('email', ADMIN_EMAIL)
        .single();

      if (error || !data) {
        throw new Error('Не удалось проверить пароль');
      }

      const isValid = await bcrypt.compare(password, data.password_hash);
      if (isValid) {
        sessionStorage.setItem('admin_authenticated', 'true');
        onAuthenticated();
        toast({
          title: 'Доступ разрешен',
          description: 'Добро пожаловать в админ-панель',
        });
      } else {
        toast({
          title: 'Неверный пароль',
          description: 'Попробуйте еще раз',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить проверку',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-slate-100 p-3 rounded-full w-fit mb-4">
            <Lock className="h-8 w-8 text-slate-600" />
          </div>
          <CardTitle>Доступ к админ-панели</CardTitle>
          <CardDescription>
            Введите пароль для доступа к панели администратора
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              disabled={isLoading || !password.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Проверяем...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
};
