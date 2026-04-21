import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#dc2626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return authView === 'login'
      ? <LoginPage onSwitchToRegister={() => setAuthView('register')} />
      : <RegisterPage onSwitchToLogin={() => setAuthView('login')} />;
  }

  return <>{children}</>;
}
