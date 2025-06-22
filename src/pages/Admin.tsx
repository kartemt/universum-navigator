
import React, { useState, useEffect } from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading } = useAdminAuth();

  const handleAuthenticated = () => {
    // Authentication state is managed by the hook
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

  if (!isAuthenticated) {
    return (
      <SecurityWrapper>
        <AdminAuth onAuthenticated={handleAuthenticated} />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  return (
    <SecurityWrapper protectContent={true}>
      <AdminPanel />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
