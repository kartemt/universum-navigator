
import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Проверяем, авторизован ли пользователь
    const authStatus = sessionStorage.getItem('admin_authenticated');
    setIsAuthenticated(authStatus === 'true');
    setIsChecking(false);
  }, []);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Показываем загрузку во время проверки
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка доступа...</p>
        </div>
      </div>
    );
  }

  // Если не авторизован, показываем форму входа
  if (!isAuthenticated) {
    return (
      <>
        <AdminAuth onAuthenticated={handleAuthenticated} />
        <ScrollToTop />
      </>
    );
  }

  // Если авторизован, показываем админ-панель
  return (
    <>
      <AdminPanel />
      <ScrollToTop />
    </>
  );
};

export default Admin;
