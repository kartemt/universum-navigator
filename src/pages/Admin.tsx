
import React from 'react';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminAuth } from '@/components/AdminAuth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SecurityWrapper } from '@/components/SecurityWrapper';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const Admin = () => {
  const { isAuthenticated, isLoading, authState, session } = useAdminAuth();

  // Detailed state logging for debugging
  React.useEffect(() => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] Admin component state:`, {
      isAuthenticated,
      isLoading,
      authState,
      hasSession: !!session,
      sessionEmail: session?.admin?.email,
      shouldShowPanel: isAuthenticated && authState === 'authenticated'
    });
  }, [isAuthenticated, isLoading, authState, session]);

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

  // Simplified condition: show panel if authenticated OR if we have a valid session
  const shouldShowAdminPanel = isAuthenticated || (authState === 'authenticated' && session);
  
  if (shouldShowAdminPanel) {
    console.log('Rendering AdminPanel - authentication successful');
    return (
      <SecurityWrapper protectContent={true}>
        <AdminPanel />
        <ScrollToTop />
      </SecurityWrapper>
    );
  }

  // Show login form if not authenticated
  console.log('Rendering AdminAuth - user not authenticated');
  return (
    <SecurityWrapper>
      <AdminAuth onAuthenticated={handleAuthenticated} />
      <ScrollToTop />
    </SecurityWrapper>
  );
};

export default Admin;
