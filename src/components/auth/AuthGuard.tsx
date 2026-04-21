import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#dc2626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
}
