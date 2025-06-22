
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';

export const PasswordChange = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { changePassword } = useAdminAuth();

  const passwordRequirements = [
    { text: 'Минимум 12 символов', test: (pwd: string) => pwd.length >= 12 },
    { text: 'Заглавная буква', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { text: 'Строчная буква', test: (pwd: string) => /[a-z]/.test(pwd) },
    { text: 'Цифра', test: (pwd: string) => /\d/.test(pwd) },
    { text: 'Спецсимвол', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Заполните все поля',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Ошибка',
        description: 'Новые пароли не совпадают',
        variant: 'destructive',
      });
      return;
    }

    // Check password requirements
    const failedRequirements = passwordRequirements.filter(req => !req.test(newPassword));
    if (failedRequirements.length > 0) {
      toast({
        title: 'Пароль не соответствует требованиям',
        description: `Не выполнены требования: ${failedRequirements.map(req => req.text).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: 'Пароль изменен',
        description: 'Пароль администратора успешно обновлен',
      });
    } catch (error: any) {
      console.error('Password change error:', error);
      
      let errorMessage = 'Не удалось изменить пароль';
      if (error.message.includes('Current password is incorrect')) {
        errorMessage = 'Текущий пароль указан неверно';
      } else if (error.message.includes('Password must be')) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 font-akrobat">
          <Lock className="h-5 w-5" />
          Изменение пароля
        </CardTitle>
        <CardDescription className="text-gray-600 font-pt-sans">
          Обновите пароль администратора для повышения безопасности
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-gray-700 font-pt-sans">
              Текущий пароль
            </Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 pr-10"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-gray-700 font-pt-sans">
              Новый пароль
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-white border-gray-300 text-gray-900 pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password requirements */}
            {newPassword && (
              <div className="mt-2 space-y-1">
                {passwordRequirements.map((req, index) => {
                  const isValid = req.test(newPassword);
                  return (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      {isValid ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="h-3 w-3 text-red-500" />
                      )}
                      <span className={isValid ? 'text-green-600' : 'text-red-500'}>
                        {req.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 font-pt-sans">
              Подтвердите новый пароль
            </Label>
            <Input
              id="confirmPassword"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-white border-gray-300 text-gray-900"
              disabled={isLoading}
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <div className="text-xs text-red-500 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Пароли не совпадают
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full bg-universum-blue hover:bg-universum-dark-blue text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Изменяем пароль...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Изменить пароль
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
