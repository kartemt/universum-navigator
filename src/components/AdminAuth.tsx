
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';

interface AdminAuthProps {
  onAuthenticated: () => void;
}

export const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Пароль для доступа к админке (в продакшене лучше хранить в переменных окружения)
  const ADMIN_PASSWORD = 'admin123';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Имитируем проверку пароля
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        // Сохраняем состояние авторизации в sessionStorage
        sessionStorage.setItem('admin_authenticated', 'true');
        onAuthenticated();
        toast({
          title: "Доступ разрешен",
          description: "Добро пожаловать в админ-панель",
        });
      } else {
        toast({
          title: "Неверный пароль",
          description: "Попробуйте еще раз",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 500);
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
              {isLoading ? "Проверяем..." : "Войти"}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Для демонстрации пароль:</strong> admin123
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
