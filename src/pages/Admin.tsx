
import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const [showPanel, setShowPanel] = useState(false);

  // Отслеживаем изменения аутентификации
  useEffect(() => {
    console.log('Admin: isAuthenticated changed to:', isAuthenticated);
    if (isAuthenticated) {
      setShowPanel(true);
    } else {
      setShowPanel(false);
    }
  }, [isAuthenticated]);

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

  // Принудительно показываем панель если авторизован или showPanel установлен
  if (isAuthenticated || showPanel) {
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
