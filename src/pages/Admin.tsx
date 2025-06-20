
import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useSecurity } from '@/hooks/useSecurity';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { fingerprint } = useSecurity();

  useEffect(() => {
    // Проверяем, авторизован ли пользователь с дополнительной проверкой fingerprint
    const authStatus = sessionStorage.getItem('admin_authenticated');
    const savedFingerprint = sessionStorage.getItem('admin_fingerprint');
    
    // Дополнительная проверка безопасности
    const isValidSession = authStatus === 'true' && savedFingerprint === fingerprint;
    
    setIsAuthenticated(isValidSession);
    setIsChecking(false);
  }, [fingerprint]);

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };

  // Показываем загрузку во время проверки
  if (isChecking) {
    return (
      <SecurityWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Проверка доступа...</p>
          </div>
        </div>
      </SecurityWrapper>
    );
  }

  // Если не авторизован, показываем форму входа
  if (!isAuthenticated) {
    return (
      <SecurityWrapper>
        <AdminAuth onAuthenticated={handleAuthenticated} />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  // Если авторизован, показываем админ-панель
  return (
    <SecurityWrapper protectContent={true}>
      <AdminPanel />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
