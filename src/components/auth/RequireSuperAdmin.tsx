import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function RequireSuperAdmin({
  children,
  fallback = null,
}: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const { state } = useAuth();
  return state.currentUser?.isSuperAdmin ? <>{children}</> : <>{fallback}</>;
}
