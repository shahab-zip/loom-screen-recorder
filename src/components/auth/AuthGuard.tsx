import React from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoginPage } from './LoginPage';
import { PublicVideoView } from '../PublicVideoView';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const location = useLocation();

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-[3px] border-[#dc2626] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.isAuthenticated) {
    // Public share routes don't require auth — `/videos/:id` renders a
    // standalone viewer that fetches the recording from Supabase (RLS gates
    // visibility). Everything else falls through to the login page.
    if (matchPath('/videos/:videoId', location.pathname)) {
      return <PublicVideoView />;
    }
    return <LoginPage />;
  }

  return <>{children}</>;
}
