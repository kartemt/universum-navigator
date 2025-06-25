
import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading, authState } = useAdminAuth();
  const [showPanel, setShowPanel] = useState(false);

  // Отслеживаем изменения аутентификации
  useEffect(() => {
    console.log('Admin: Auth state changed:', { isAuthenticated, authState, showPanel });
    if (isAuthenticated && authState === 'authenticated') {
      console.log('Setting showPanel to true');
      setShowPanel(true);
    } else if (authState === 'unauthenticated') {
      console.log('Setting showPanel to false');
      setShowPanel(false);
    }
  }, [isAuthenticated, authState]);

  const handleAuthenticated = () => {
    console.log('handleAuthenticated called');
    setShowPanel(true);
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

  // Показываем панель если авторизован или showPanel установлен
  if ((isAuthenticated && authState === 'authenticated') || showPanel) {
    return (
      <SecurityWrapper protectContent={true}>
        <AdminPanel />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  return (
    <SecurityWrapper>
      <AdminAuth onAuthenticated={handleAuthenticated} />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
