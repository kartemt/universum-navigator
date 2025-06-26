
import React from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading, authState, session, login } = useAdminAuth();

  // Simplified logging for debugging
  React.useEffect(() => {
    if (authState !== 'loading') {
      console.log(`[${new Date().toLocaleTimeString()}] Admin: authState=${authState}, isAuthenticated=${isAuthenticated}, hasSession=${!!session}`);
    }
  }, [authState, isAuthenticated, session]);

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

  // Show admin panel if authenticated
  if (authState === 'authenticated' && session) {
    console.log(`[${new Date().toLocaleTimeString()}] Admin: Rendering AdminPanel for ${session.admin.email}`);
    return (
      <SecurityWrapper protectContent={true}>
        <AdminPanel />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  // Show login form if not authenticated
  console.log(`[${new Date().toLocaleTimeString()}] Admin: Rendering AdminAuth - user not authenticated`);
  return (
    <SecurityWrapper>
      <AdminAuth onLogin={login} isLoading={isLoading} />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
