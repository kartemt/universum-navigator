
import React from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading, authState } = useAdminAuth();

  const handleAuthenticated = () => {
    console.log('handleAuthenticated called - will trigger re-render');
    // Компонент автоматически перерендерится когда useAdminAuth обновит состояние
  };

  if (isLoading) {
    return (
      <SecurityWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Проверка сессии...</p>
          </div>
        </div>
      </SecurityWrapper>
    );
  }

  // Показываем панель если пользователь авторизован
  if (isAuthenticated && authState === 'authenticated') {
    return (
      <SecurityWrapper protectContent={true}>
        <AdminPanel />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  // Показываем форму входа если не авторизован
  return (
    <SecurityWrapper>
      <AdminAuth onAuthenticated={handleAuthenticated} />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
